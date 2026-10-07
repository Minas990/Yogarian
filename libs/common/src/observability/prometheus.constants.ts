export const PROMETHEUS_SERVICE_NAME = 'PROMETHEUS_SERVICE_NAME';

export const PROMETHEUS_METRIC_ROUTE = '/metrics';

export const PROMETHEUS_KAFKA_SERVICES = new Set([
  'users-service',
  'media-service',
  'location-service',
  'sessions-service',
  'reservations-service',
  'payments-service',
  'search-service',
  'notifications-service',
]);

export type MetricAction =
  | 'authLoginAttempt'
  | 'authLoginSuccess'
  | 'authLoginFailure'
  | 'authRegistration'
  | 'authTokenRefresh'
  | 'usersCreated'
  | 'usersUpdated'
  | 'usersDeleted'
  | 'userProfileUpdates'
  | 'mediaUploads'
  | 'mediaUploadFailures'
  | 'mediaDeletions'
  | 'mediaUploadDuration'
  | 'locationRequests'
  | 'locationSearchDuration'
  | 'locationSearchErrors'
  | 'sessionsCreated'
  | 'sessionsUpdated'
  | 'sessionsCancelled'
  | 'reservationsCreated'
  | 'reservationsConfirmed'
  | 'reservationsCancelled'
  | 'reservationFailures'
  | 'reservationDuration'
  | 'paymentsCreated'
  | 'paymentsSuccessful'
  | 'paymentsFailed'
  | 'paymentsRefunded'
  | 'paymentDuration'
  | 'searchRequests'
  | 'searchDuration'
  | 'searchErrors'
  | 'notificationsSent'
  | 'notificationsFailed'
  | 'notificationRetries'
  | 'notificationProcessingDuration';

export interface MetricBehavior {
  start?: MetricAction[];
  success?: MetricAction[];
  failure?: MetricAction[];
  duration?: MetricAction[];
  result?: (metrics: import('./prometheus-metrics.service').PrometheusMetricsService, value: unknown) => void;
}

export const METRIC_BEHAVIOR_KEY = 'PROMETHEUS_METRIC_BEHAVIOR';