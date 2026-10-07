import { SetMetadata } from '@nestjs/common';
import { METRIC_BEHAVIOR_KEY, type MetricBehavior } from './prometheus.constants';

export const ObservedMetric = (behavior: MetricBehavior) => SetMetadata(METRIC_BEHAVIOR_KEY, behavior);
