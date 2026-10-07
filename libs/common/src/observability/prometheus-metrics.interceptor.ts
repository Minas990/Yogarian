import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { KafkaContext } from '@nestjs/microservices';
import { METRIC_BEHAVIOR_KEY, PROMETHEUS_METRIC_ROUTE, PROMETHEUS_SERVICE_NAME, type MetricBehavior } from './prometheus.constants';
import { PrometheusMetricsService } from './prometheus-metrics.service';

const SERVICE_METRIC_RULES: Record<string, Record<string, MetricBehavior>> = {
  'auth-service': {
    signUp: {
      success: ['authRegistration'],
    },
    logIn: {
      start: ['authLoginAttempt'],
      success: ['authLoginSuccess', 'authTokenRefresh'],
      failure: ['authLoginFailure'],
    },
  },
  'users-service': {
    createUser: {
      success: ['usersCreated'],
    },
    updateUser: {
      success: ['usersUpdated', 'userProfileUpdates'],
    },
    handleUserEmailUpdated: {
      success: ['usersUpdated'],
    },
    handleUserDeleted: {
      success: ['usersDeleted'],
    },
  },
  'media-service': {
    uploadFile: {
      success: ['mediaUploads'],
      failure: ['mediaUploadFailures'],
      duration: ['mediaUploadDuration'],
    },
    updateFile: {
      success: ['mediaUploads'],
      failure: ['mediaUploadFailures'],
      duration: ['mediaUploadDuration'],
    },
    deleteFile: {
      success: ['mediaDeletions'],
      failure: ['mediaUploadFailures'],
    },
    uploadSessionFiles: {
      success: ['mediaUploads'],
      failure: ['mediaUploadFailures'],
      duration: ['mediaUploadDuration'],
    },
    deleteSessionFile: {
      success: ['mediaDeletions'],
      failure: ['mediaUploadFailures'],
    },
    handleUserDeletedEvent: {
      success: ['mediaDeletions'],
    },
    handleSessionImageApprovedEvent: {
      success: ['mediaDeletions'],
    },
    handleSessionImageRejectedEvent: {
      success: ['mediaDeletions'],
    },
    handleSessionImageDeletionApprovedEvent: {
      success: ['mediaDeletions'],
    },
    handleSessionDeletedEvent: {
      success: ['mediaDeletions'],
    },
  },
  'location-service': {
    getCurrentLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
      duration: ['locationSearchDuration'],
    },
    createLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
    },
    updateLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
    },
    deleteLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
    },
    getSessionLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
      duration: ['locationSearchDuration'],
    },
    grpcCreateLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
    },
    grpcUpdateLocation: {
      start: ['locationRequests'],
      failure: ['locationSearchErrors'],
    },
  },
  'sessions-service': {
    createSession: {
      success: ['sessionsCreated'],
      result: (metrics, value) => {
        const maxParticipants = (value as { maxParticipants?: number } | undefined)?.maxParticipants;
        if (typeof maxParticipants === 'number') {
          metrics.setSessionsCapacity(maxParticipants);
        }
      },
    },
    updateSession: {
      success: ['sessionsUpdated'],
      result: (metrics, value) => {
        const maxParticipants = (value as { maxParticipants?: number } | undefined)?.maxParticipants;
        if (typeof maxParticipants === 'number') {
          metrics.setSessionsCapacity(maxParticipants);
        }
      },
    },
    deleteSession: {
      success: ['sessionsCancelled'],
    },
  },
  'reservations-service': {
    book: {
      success: ['reservationsCreated'],
      failure: ['reservationFailures'],
      duration: ['reservationDuration'],
    },
    cancelReservation: {
      success: ['reservationsCancelled'],
      failure: ['reservationFailures'],
    },
    refundReservation: {
      failure: ['reservationFailures'],
      duration: ['reservationDuration'],
    },
    handlePaymentConfirmed: {
      success: ['reservationsConfirmed'],
    },
    handlePaymentFailed: {
      failure: ['reservationFailures'],
      success: ['reservationsCancelled'],
    },
    handleRefundReservationConfirmed: {
      success: ['reservationsCancelled'],
    },
    handleRefundReservationFailed: {
      failure: ['reservationFailures'],
    },
    handleSessionDeleted: {
      success: ['reservationsCancelled'],
    },
  },
  'search-service': {
    getAllSessions: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getMe: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getMySessions: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getMyFollowers: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getMyFollowing: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getUserFollowers: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    getUserById: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
    findSessions: {
      start: ['searchRequests'],
      failure: ['searchErrors'],
      duration: ['searchDuration'],
      result: (metrics, value) => metrics.observeSearchResults(countSearchResults(value)),
    },
  },
  'notifications-service': {
    sendWelcomeEmail: {
      success: ['notificationsSent'],
      failure: ['notificationsFailed'],
      duration: ['notificationProcessingDuration'],
    },
    sendOTPEmail: {
      success: ['notificationsSent'],
      failure: ['notificationsFailed'],
      duration: ['notificationProcessingDuration'],
    },
    sendPasswordResetEmail: {
      success: ['notificationsSent'],
      failure: ['notificationsFailed'],
      duration: ['notificationProcessingDuration'],
    },
    handleSessionCancelled: {
    },
    handleNewSession: {
    },
  },
};

function countSearchResults(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === 'object' && value) {
    const maybeData = value as { data?: unknown[]; total?: number };
    if (Array.isArray(maybeData.data)) {
      return maybeData.data.length;
    }

    if (typeof maybeData.total === 'number') {
      return maybeData.total;
    }
  }

  return value == null ? 0 : 1;
}

@Injectable()
export class PrometheusMetricsInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly metrics: PrometheusMetricsService,
    @Inject(PROMETHEUS_SERVICE_NAME) private readonly serviceName: string,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadataBehavior = this.reflector.getAllAndOverride<MetricBehavior>(METRIC_BEHAVIOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const serviceBehavior = this.resolveBehavior(context.getHandler().name);
    const behavior = this.mergeBehaviors(serviceBehavior, metadataBehavior);

    if (context.getType() === 'http') {
      return this.handleHttp(context, next, behavior);
    }

    if (context.getType() === 'rpc') {
      return this.handleKafka(context, next, behavior);
    }

    return next.handle();
  }

  private handleHttp(context: ExecutionContext, next: CallHandler, behavior?: MetricBehavior): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const route = this.normalizeHttpRoute(request);

    if (route === PROMETHEUS_METRIC_ROUTE) {
      return next.handle();
    }

    const startedAt = process.hrtime.bigint();
    this.metrics.incrementActiveConnections();
    this.applyActions(behavior?.start);

    return next.handle().pipe(
      tap((value) => {
        this.applyActions(behavior?.success);
        if (behavior?.result) {
          behavior.result(this.metrics, value);
        }
        this.recordHttpSuccess(request.method, route, response.statusCode ?? 200, startedAt, behavior?.duration);
      }),
      catchError((error) => {
        this.applyActions(behavior?.failure);
        this.recordHttpError(request.method, route, error, startedAt, behavior?.duration);
        return throwError(() => error);
      }),
      finalize(() => {
        this.metrics.decrementActiveConnections();
      }),
    );
  }

  private handleKafka(context: ExecutionContext, next: CallHandler, behavior?: MetricBehavior): Observable<unknown> {
    const rpcContext = context.switchToRpc();
    const kafkaContext = rpcContext.getContext<KafkaContext>();
    const topic = typeof kafkaContext?.getTopic === 'function' ? kafkaContext.getTopic() : undefined;

    if (!topic) {
      return next.handle();
    }

    const startedAt = process.hrtime.bigint();
    this.applyActions(behavior?.start);

    return next.handle().pipe(
      tap((value) => {
        this.applyActions(behavior?.success);
        if (behavior?.result) {
          behavior.result(this.metrics, value);
        }
        this.metrics.recordKafkaMessage(topic, this.durationSeconds(startedAt), false);
      }),
      catchError((error) => {
        this.applyActions(behavior?.failure);
        this.metrics.recordKafkaMessage(topic, this.durationSeconds(startedAt), true);
        return throwError(() => error);
      }),
    );
  }

  private recordHttpSuccess(method: string, route: string, statusCode: number, startedAt: bigint, durationActions?: MetricBehavior['duration']): void {
    const durationSeconds = this.durationSeconds(startedAt);
    this.metrics.recordHttpRequest(method, route, statusCode, durationSeconds);
    this.applyDurationActions(durationActions, durationSeconds);
  }

  private recordHttpError(method: string, route: string, error: unknown, startedAt: bigint, durationActions?: MetricBehavior['duration']): void {
    const statusCode = this.getHttpStatusCode(error);
    const durationSeconds = this.durationSeconds(startedAt);
    this.metrics.recordHttpRequest(method, route, statusCode, durationSeconds);
    this.applyDurationActions(durationActions, durationSeconds);
  }

  private getHttpStatusCode(error: unknown): number {
    if (typeof error === 'object' && error && 'getStatus' in error && typeof (error as { getStatus?: () => number }).getStatus === 'function') {
      return (error as { getStatus: () => number }).getStatus();
    }

    if (typeof error === 'object' && error && 'status' in error && typeof (error as { status?: number }).status === 'number') {
      return (error as { status: number }).status;
    }

    return 500;
  }

  private normalizeHttpRoute(request: { route?: { path?: string }; originalUrl?: string; url?: string }): string {
    const routePath = request.route?.path;
    if (routePath && routePath !== '*') {
      return routePath;
    }

    const rawPath = (request.originalUrl ?? request.url ?? '/').split('?')[0];
    const normalized = rawPath
      .split('/')
      .map((segment) => {
        if (!segment) {
          return '';
        }
        if (/^[0-9]+$/.test(segment)) {
          return ':id';
        }
        if (/^[0-9a-fA-F-]{36}$/.test(segment)) {
          return ':id';
        }
        return segment;
      })
      .join('/');

    return normalized || '/';
  }

  private durationSeconds(startedAt: bigint): number {
    return Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  }

  private applyActions(actions?: MetricBehavior['start']): void {
    actions?.forEach((action) => this.metrics.applyAction(action));
  }

  private applyDurationActions(actions?: MetricBehavior['duration'], durationSeconds?: number): void {
    if (typeof durationSeconds !== 'number') {
      return;
    }

    actions?.forEach((action) => this.metrics.observeDuration(action, durationSeconds));
  }

  private resolveBehavior(handlerName: string): MetricBehavior | undefined {
    return SERVICE_METRIC_RULES[this.serviceName]?.[handlerName];
  }

  private mergeBehaviors(base?: MetricBehavior, override?: MetricBehavior): MetricBehavior | undefined {
    if (!base && !override) {
      return undefined;
    }

    return {
      start: [...(base?.start ?? []), ...(override?.start ?? [])],
      success: [...(base?.success ?? []), ...(override?.success ?? [])],
      failure: [...(base?.failure ?? []), ...(override?.failure ?? [])],
      duration: [...(base?.duration ?? []), ...(override?.duration ?? [])],
      result: override?.result ?? base?.result,
    };
  }
}
