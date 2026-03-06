import {
  BadGatewayException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as http from 'http';
import Redis from 'ioredis';
import { Request, Response } from 'express';
import { AppLoggerService, type UserTokenPayload } from '@app/common';

type ServiceName =
  | 'auth'
  | 'user'
  | 'media'
  | 'location'
  | 'sessions'
  | 'search'
  | 'payment'
  | 'reservations';

type RequestWithRawBody = Request & { rawBody?: Buffer };
type RequestWithAuth = RequestWithRawBody & {
  user?: UserTokenPayload;
  authToken?: string;
};

@Injectable()
export class ApiGatewayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApiGatewayService.name);
  private readonly http: AxiosInstance;
  private redisClient: Redis | null = null;
  private readonly invalidTokenTtlSeconds: number;
  private readonly defaultUpstreamTimeoutMs: number;

  private readonly httpAgent = new http.Agent({ keepAlive: false });
  private readonly serviceMap: Record<ServiceName, string>;
  private static readonly HOP_BY_HOP_HEADERS = new Set([
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade',
  ]);
  private readonly invalidatingRoutes = new Set([
    'POST:/auth/confirmEmail',
    'PATCH:/auth/updatePassword',
    'PATCH:/auth/updateEmail',
    'DELETE:/auth',
  ]);

  constructor(private readonly configService: ConfigService,private readonly appLogger:AppLoggerService) {
    this.invalidTokenTtlSeconds = Number(this.configService.get('JWT_INVALID_TTL_SECONDS') ?? 3600);
    this.defaultUpstreamTimeoutMs = Number(this.configService.get('API_GATEWAY_TIMEOUT_MS') ?? 15000);

    this.http = axios.create({
      timeout: this.defaultUpstreamTimeoutMs,
      maxRedirects: 0,
      proxy: false,
      family: 4,
      validateStatus: () => true,
      httpAgent: this.httpAgent,
      decompress: false,
    });

    this.serviceMap = {
      auth: this.getServiceUrl('AUTH_SERVICE_URL', 'AUTH_PORT', 8001),
      user: this.getServiceUrl('USERS_SERVICE_URL', 'USERS_PORT', 8002),
      media: this.getServiceUrl('MEDIA_SERVICE_URL', 'MEDIA_PORT', 8003),
      location: this.getServiceUrl('LOCATION_SERVICE_URL', 'LOCATION_PORT', 8004),
      sessions: this.getServiceUrl('SESSIONS_SERVICE_URL', 'SESSIONS_PORT', 8005),
      reservations: this.getServiceUrl('RESERVATIONS_SERVICE_URL', 'RESERVATIONS_PORT', 8008),
      search: this.getServiceUrl('SEARCH_SERVICE_URL', 'SEARCH_PORT', 8009),
      payment: this.getServiceUrl('PAYMENTS_SERVICE_URL', 'PAYMENTS_PORT', 8006),
    };
  }

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = Number(this.configService.get<number>('REDIS_PORT'));
    if (!host || !port) {
      throw new Error('REDIS_HOST/REDIS_PORT are required for API gateway startup');
    }

    this.redisClient = new Redis({
      host,
      port,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      connectTimeout: 1000,
    });

    try {
      await this.redisClient.connect();
      await this.redisClient.ping();
      this.logger.log('Connected to Redis for JWT invalidation cache');
    } catch (error) {
      this.appLogger.logError({
        problem: `Failed to connect to Redis: ${error.message}`,
        error,
        functionName:'ApiGatewayService.onModuleInit',
      })
      this.redisClient.disconnect();
      this.redisClient = null;
      throw new Error('Redis is required for API gateway startup');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redisClient) {
      return;
    }
    await this.redisClient.quit();
    this.redisClient = null;
  }

  async proxyRequest(req: Request, res: Response): Promise<void> {
    this.ensureRedisIsReady();
    const authReq = req as RequestWithAuth;
    const requestPath = this.resolveRequestPath(req);

    const targetServiceUrl = this.resolveTargetService(requestPath);
    if (!targetServiceUrl) {
      res.status(404).json({ message: 'Route not found in API gateway' });
      return;
    }

    const token = authReq.authToken;
    const upstreamUrl = this.buildUpstreamUrl(targetServiceUrl, req.originalUrl);

    const config: AxiosRequestConfig = {
      url: upstreamUrl,
      method: req.method,
      headers: this.buildForwardHeaders(req),
      responseType: 'stream',
      data: this.extractRequestBody(authReq),
      timeout: this.resolveRequestTimeoutMs(requestPath),
    };
    try {
      const upstreamResponse = await this.http.request(config);
      if (token && this.shouldInvalidateToken(req.method, requestPath, upstreamResponse.status)) {
        await this.invalidateToken(token);
      }

      for (const [header, value] of Object.entries(upstreamResponse.headers)) {
        if (value === undefined) {
          continue;
        }
        res.setHeader(header, value as string | string[]);
      }

      res.status(upstreamResponse.status);
      upstreamResponse.data.pipe(res);
    } catch (error) {
      const err = error as { code?: string; message?: string };
      this.appLogger.logError({
        problem: `Upstream proxy failed for ${req.method} ${req.originalUrl}: ${err.message || 'unknown error'}`,
        error,
        functionName:'ApiGatewayService.proxyRequest',
        additionalData:{
          method: req.method,
          url: req.originalUrl,
          upstreamUrl,
          code: err.code,
          targetServiceUrl,
        }
      })
      throw new BadGatewayException({
        message: 'Failed to reach upstream service',
        code: err.code || 'UPSTREAM_ERROR',
      });
    }
  }

  private extractRequestBody(req: RequestWithRawBody): unknown {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return undefined;
    }

    const contentType = (req.headers['content-type'] || '').toString().toLowerCase();
    if (contentType.startsWith('multipart/form-data')) {
      return req;
    }

    if (req.rawBody && req.rawBody.length > 0) {
      return req.rawBody;
    }

    if (req.body === undefined || req.body === null) {
      return undefined;
    }

    if (typeof req.body === 'object' && Object.keys(req.body).length === 0) {
      return undefined;
    }

    return req.body;
  }
  
private buildForwardHeaders(req: Request): Record<string, string> {
  const authReq = req as RequestWithAuth;
  const headers: Record<string, string> = {};
  const method = req.method.toUpperCase();
  const isBodylessMethod = method === 'GET' || method === 'HEAD';  

  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();

    if (!value || lower === 'host' || ApiGatewayService.HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }

    if (isBodylessMethod && (lower === 'content-length' || lower === 'content-type')) {
      continue;
    }

    headers[key] = Array.isArray(value) ? value.join(',') : value;
  }

  headers['x-forwarded-for'] = req.ip || '';
  headers['x-forwarded-proto'] = req.protocol;

  if (authReq.user) {
    headers['x-user-metadata'] = Buffer.from(JSON.stringify(authReq.user)).toString('base64');
  }

  return headers;
}
  private resolveTargetService(path: string): string | null {
    const prefix = path.split('/').filter(Boolean)[0] as ServiceName | undefined;
    if (!prefix || !this.serviceMap[prefix]) {
      return null;
    }
    return this.serviceMap[prefix];
  }

  private shouldInvalidateToken(method: string, path: string, statusCode: number): boolean {
    if (statusCode < 200 || statusCode >= 300) {
      return false;
    }
    const normalizedPath = path.replace(/\/+$/, '') || '/';
    const routeKey = `${method.toUpperCase()}:${normalizedPath}`;
    return this.invalidatingRoutes.has(routeKey);
  }

  async isTokenInvalid(token: string): Promise<boolean> {
    this.ensureRedisIsReady();
    const key = this.getInvalidTokenKey(token);

    try {
      return (await this.redisClient!.get(key)) !== null;
    } catch (error) {
      this.appLogger.logError({
        problem: `Failed checking token invalidation in Redis cache: ${error.message}`,
        error,
        functionName:'ApiGatewayService.isTokenInvalid',
      })
      throw new ServiceUnavailableException('redis is unavailable. ateway is not accepting connections.');
    }
  }

  private async invalidateToken(token: string): Promise<void> {
    this.ensureRedisIsReady();
    const ttl = this.getTokenTtl(token);
    if (ttl <= 0) {
      return;
    }

    const key = this.getInvalidTokenKey(token);

    try {
      await this.redisClient!.set(key, '1', 'EX', ttl);
    } catch (error) {
      this.appLogger.logError({
        problem: `Failed storing invalid token in Redis cache: ${error.message}`,
        error,
        functionName:'ApiGatewayService.invalidateToken',
      });
      throw new ServiceUnavailableException('Redis is unavailable. Gateway is not accepting connections.');
    }
  }

  private getTokenTtl(_token: string): number {
    return this.invalidTokenTtlSeconds;
  }

  private getInvalidTokenKey(token: string): string {
    return `invalid-jwt:${token}`;
  }

  private getServiceUrl(serviceUrlKey: string, servicePortKey: string, defaultPort: number): string {
    const configuredUrl = this.configService.get<string>(serviceUrlKey) || 'localhost';
    const port = this.configService.get<number>(servicePortKey) ?? defaultPort;
    return this.normalizeServiceBaseUrl(configuredUrl, Number(port));
  }

  private normalizeServiceBaseUrl(hostOrUrl: string, port: number): string {
    const raw = hostOrUrl.trim().replace(/\/+$/, '');
    const value = raw || 'localhost';
    const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;

    try {
      const url = new URL(withScheme);
      if (!url.port) {
        url.port = String(port);
      }
      return `${url.protocol}//${url.host}`;
    } catch {
      return `http://localhost:${port}`;
    }
  }

  private buildUpstreamUrl(baseUrl: string, originalUrl: string): string {
    return `${baseUrl}${originalUrl}`;
  }

  private resolveRequestTimeoutMs(path: string): number {
    
    return this.defaultUpstreamTimeoutMs;
  }

  private resolveRequestPath(req: Request): string {
    const rawPath = (req.originalUrl || req.url || req.path || '/').split('?')[0].split('#')[0].trim();
    if (!rawPath) {
      return '/';
    }
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  }

  private ensureRedisIsReady(): void { // consitency over availability choice - if redis is down, we want to fail fast instead of accepting requests we can't validate
    if (!this.redisClient || this.redisClient.status !== 'ready') {
      throw new ServiceUnavailableException('Redis is unavailable. Gateway is not accepting connections.');
    }
  }

  async assertRedisReady(): Promise<void> {
    this.ensureRedisIsReady();
  }
}
