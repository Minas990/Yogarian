import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestLoggerInterceptor } from './interceptors/request-logger.interceptor';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule, {
    rawBody: true,
  });
  const cs = app.get(ConfigService);
  app.useGlobalInterceptors(new RequestLoggerInterceptor());
  await app.listen(cs.get('API_GATEWAY_PORT') ?? 8000);
}
bootstrap();
