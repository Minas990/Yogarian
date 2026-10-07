import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PROMETHEUS_SERVICE_NAME } from './prometheus.constants';
import { PrometheusMetricsController } from './prometheus-metrics.controller';
import { PrometheusMetricsInterceptor } from './prometheus-metrics.interceptor';
import { PrometheusMetricsService } from './prometheus-metrics.service';

@Module({})
export class PrometheusMetricsModule {
  static forService(serviceName: string): DynamicModule {
    return {
      module: PrometheusMetricsModule,
      controllers: [PrometheusMetricsController],
      providers: [
        Reflector,
        {
          provide: PROMETHEUS_SERVICE_NAME,
          useValue: serviceName,
        },
        PrometheusMetricsService,
        PrometheusMetricsInterceptor,
        {
          provide: APP_INTERCEPTOR,
          useClass: PrometheusMetricsInterceptor,
        },
      ],
      exports: [PrometheusMetricsService],
    };
  }
}
