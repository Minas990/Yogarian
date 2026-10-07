import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus-metrics.service';

@Controller()
export class PrometheusMetricsController {
  constructor(private readonly metrics: PrometheusMetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metricsEndpoint(): Promise<string> {
    return this.metrics.metrics();
  }
}
