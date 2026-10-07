import { Inject, Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { PROMETHEUS_KAFKA_SERVICES, PROMETHEUS_SERVICE_NAME, type MetricAction } from './prometheus.constants';

function createCounter(registry: Registry, name: string, help: string): Counter<string> {
  return new Counter({
    name,
    help,
    registers: [registry],
  });
}

function createHistogram(registry: Registry, name: string, help: string): Histogram<string> {
  return new Histogram({
    name,
    help,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });
}

@Injectable()
export class PrometheusMetricsService {
  private readonly registry = new Registry();
  private readonly serviceName: string;

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests received by the service.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  private readonly httpRequestsErrorsTotal = new Counter({
    name: 'http_requests_errors_total',
    help: 'Total number of failed HTTP requests.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  private readonly activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Current active HTTP connections.',
    registers: [this.registry],
  });

  private readonly kafkaMessagesConsumedTotal?: Counter<string>;
  private readonly kafkaMessagesFailedTotal?: Counter<string>;
  private readonly kafkaMessageProcessingDurationSeconds?: Histogram<string>;

  private readonly authLoginAttemptsTotal = createCounter(this.registry, 'auth_login_attempts_total', 'Total number of auth login attempts.');
  private readonly authLoginSuccessTotal = createCounter(this.registry, 'auth_login_success_total', 'Total number of successful auth logins.');
  private readonly authLoginFailuresTotal = createCounter(this.registry, 'auth_login_failures_total', 'Total number of failed auth logins.');
  private readonly authTokenRefreshTotal = createCounter(this.registry, 'auth_token_refresh_total', 'Total number of auth token refreshes.');
  private readonly authRegistrationTotal = createCounter(this.registry, 'auth_registration_total', 'Total number of auth registrations.');

  private readonly usersCreatedTotal = createCounter(this.registry, 'users_created_total', 'Total number of created users.');
  private readonly usersUpdatedTotal = createCounter(this.registry, 'users_updated_total', 'Total number of updated users.');
  private readonly usersDeletedTotal = createCounter(this.registry, 'users_deleted_total', 'Total number of deleted users.');
  private readonly userProfileUpdatesTotal = createCounter(this.registry, 'user_profile_updates_total', 'Total number of user profile updates.');

  private readonly mediaUploadsTotal = createCounter(this.registry, 'media_uploads_total', 'Total number of media uploads.');
  private readonly mediaUploadFailuresTotal = createCounter(this.registry, 'media_upload_failures_total', 'Total number of failed media uploads.');
  private readonly mediaDeletionsTotal = createCounter(this.registry, 'media_deletions_total', 'Total number of media deletions.');
  private readonly mediaUploadDurationSeconds = createHistogram(this.registry, 'media_upload_duration_seconds', 'Media upload duration in seconds.');

  private readonly locationRequestsTotal = createCounter(this.registry, 'location_requests_total', 'Total number of location requests.');
  private readonly locationSearchDurationSeconds = createHistogram(this.registry, 'location_search_duration_seconds', 'Location search duration in seconds.');
  private readonly locationSearchErrorsTotal = createCounter(this.registry, 'location_search_errors_total', 'Total number of failed location searches.');

  private readonly sessionsCreatedTotal = createCounter(this.registry, 'sessions_created_total', 'Total number of created sessions.');
  private readonly sessionsUpdatedTotal = createCounter(this.registry, 'sessions_updated_total', 'Total number of updated sessions.');
  private readonly sessionsCancelledTotal = createCounter(this.registry, 'sessions_cancelled_total', 'Total number of cancelled sessions.');
  private readonly sessionsCapacityTotal = new Gauge({
    name: 'sessions_capacity_total',
    help: 'Current session capacity.',
    registers: [this.registry],
  });

  private readonly reservationsCreatedTotal = createCounter(this.registry, 'reservations_created_total', 'Total number of reservation requests created.');
  private readonly reservationsConfirmedTotal = createCounter(this.registry, 'reservations_confirmed_total', 'Total number of confirmed reservations.');
  private readonly reservationsCancelledTotal = createCounter(this.registry, 'reservations_cancelled_total', 'Total number of cancelled reservations.');
  private readonly reservationFailuresTotal = createCounter(this.registry, 'reservation_failures_total', 'Total number of reservation failures.');
  private readonly reservationDurationSeconds = createHistogram(this.registry, 'reservation_duration_seconds', 'Reservation processing duration in seconds.');

  private readonly paymentsCreatedTotal = createCounter(this.registry, 'payments_created_total', 'Total number of payment checkouts created.');
  private readonly paymentsSuccessfulTotal = createCounter(this.registry, 'payments_successful_total', 'Total number of successful payments.');
  private readonly paymentsFailedTotal = createCounter(this.registry, 'payments_failed_total', 'Total number of failed payments.');
  private readonly paymentsRefundedTotal = createCounter(this.registry, 'payments_refunded_total', 'Total number of refunded payments.');
  private readonly paymentDurationSeconds = createHistogram(this.registry, 'payment_duration_seconds', 'Payment processing duration in seconds.');

  private readonly searchRequestsTotal = createCounter(this.registry, 'search_requests_total', 'Total number of search requests.');
  private readonly searchDurationSeconds = createHistogram(this.registry, 'search_duration_seconds', 'Search duration in seconds.');
  private readonly searchErrorsTotal = createCounter(this.registry, 'search_errors_total', 'Total number of failed search requests.');
  private readonly searchResultsCount = createHistogram(this.registry, 'search_results_count', 'Number of results returned by search queries.');

  private readonly notificationsSentTotal = createCounter(this.registry, 'notifications_sent_total', 'Total number of notifications sent.');
  private readonly notificationsFailedTotal = createCounter(this.registry, 'notifications_failed_total', 'Total number of failed notifications.');
  private readonly notificationRetriesTotal = createCounter(this.registry, 'notification_retries_total', 'Total number of notification retries.');
  private readonly notificationProcessingDurationSeconds = createHistogram(this.registry, 'notification_processing_duration_seconds', 'Notification processing duration in seconds.');

  constructor(@Inject(PROMETHEUS_SERVICE_NAME) serviceName: string) {
    this.serviceName = serviceName;
    collectDefaultMetrics({ register: this.registry });

    if (PROMETHEUS_KAFKA_SERVICES.has(serviceName)) {
      this.kafkaMessagesConsumedTotal = new Counter({
        name: 'kafka_messages_consumed_total',
        help: 'Total number of Kafka messages consumed successfully.',
        labelNames: ['topic'],
        registers: [this.registry],
      });

      this.kafkaMessagesFailedTotal = new Counter({
        name: 'kafka_messages_failed_total',
        help: 'Total number of failed Kafka messages.',
        labelNames: ['topic'],
        registers: [this.registry],
      });

      this.kafkaMessageProcessingDurationSeconds = new Histogram({
        name: 'kafka_message_processing_duration_seconds',
        help: 'Kafka message processing duration in seconds.',
        labelNames: ['topic'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [this.registry],
      });
    }
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
    if (statusCode >= 400) {
      this.httpRequestsErrorsTotal.inc(labels);
    }
  }

  incrementActiveConnections(): void {
    if (this.serviceName === 'ApiGateway' || this.serviceName === 'api-gateway') {
      this.activeConnections.inc();
    }
  }

  recordNotificationRetries(count: number): void {
    this.notificationRetriesTotal.inc(count);
  }

  decrementActiveConnections(): void {
    if (this.serviceName === 'ApiGateway' || this.serviceName === 'api-gateway') {
      this.activeConnections.dec();
    }
  }

  recordKafkaMessage(topic: string, durationSeconds: number, failed: boolean): void {
    if (!this.kafkaMessagesConsumedTotal || !this.kafkaMessagesFailedTotal || !this.kafkaMessageProcessingDurationSeconds) {
      return;
    }

    const labels = { topic };
    if (failed) {
      this.kafkaMessagesFailedTotal.inc(labels);
    } else {
      this.kafkaMessagesConsumedTotal.inc(labels);
    }
    this.kafkaMessageProcessingDurationSeconds.observe(labels, durationSeconds);
  }

  applyAction(action: MetricAction): void {
    switch (action) {
      case 'authLoginAttempt':
        this.authLoginAttemptsTotal.inc();
        return;
      case 'authLoginSuccess':
        this.authLoginSuccessTotal.inc();
        return;
      case 'authLoginFailure':
        this.authLoginFailuresTotal.inc();
        return;
      case 'authRegistration':
        this.authRegistrationTotal.inc();
        return;
      case 'authTokenRefresh':
        this.authTokenRefreshTotal.inc();
        return;
      case 'usersCreated':
        this.usersCreatedTotal.inc();
        return;
      case 'usersUpdated':
        this.usersUpdatedTotal.inc();
        return;
      case 'usersDeleted':
        this.usersDeletedTotal.inc();
        return;
      case 'userProfileUpdates':
        this.userProfileUpdatesTotal.inc();
        return;
      case 'mediaUploads':
        this.mediaUploadsTotal.inc();
        return;
      case 'mediaUploadFailures':
        this.mediaUploadFailuresTotal.inc();
        return;
      case 'mediaDeletions':
        this.mediaDeletionsTotal.inc();
        return;
      case 'locationRequests':
        this.locationRequestsTotal.inc();
        return;
      case 'sessionsCreated':
        this.sessionsCreatedTotal.inc();
        return;
      case 'sessionsUpdated':
        this.sessionsUpdatedTotal.inc();
        return;
      case 'sessionsCancelled':
        this.sessionsCancelledTotal.inc();
        return;
      case 'reservationsCreated':
        this.reservationsCreatedTotal.inc();
        return;
      case 'reservationsConfirmed':
        this.reservationsConfirmedTotal.inc();
        return;
      case 'reservationsCancelled':
        this.reservationsCancelledTotal.inc();
        return;
      case 'reservationFailures':
        this.reservationFailuresTotal.inc();
        return;
      case 'paymentsCreated':
        this.paymentsCreatedTotal.inc();
        return;
      case 'paymentsSuccessful':
        this.paymentsSuccessfulTotal.inc();
        return;
      case 'paymentsFailed':
        this.paymentsFailedTotal.inc();
        return;
      case 'paymentsRefunded':
        this.paymentsRefundedTotal.inc();
        return;
      case 'searchRequests':
        this.searchRequestsTotal.inc();
        return;
      case 'searchErrors':
        this.searchErrorsTotal.inc();
        return;
      case 'notificationsSent':
        this.notificationsSentTotal.inc();
        return;
      case 'notificationsFailed':
        this.notificationsFailedTotal.inc();
        return;
      case 'notificationRetries':
        this.notificationRetriesTotal.inc();
        return;
      default:
        return;
    }
  }

  observeDuration(action: MetricAction, durationSeconds: number): void {
    switch (action) {
      case 'mediaUploadDuration':
        this.mediaUploadDurationSeconds.observe(durationSeconds);
        return;
      case 'locationSearchDuration':
        this.locationSearchDurationSeconds.observe(durationSeconds);
        return;
      case 'reservationDuration':
        this.reservationDurationSeconds.observe(durationSeconds);
        return;
      case 'paymentDuration':
        this.paymentDurationSeconds.observe(durationSeconds);
        return;
      case 'searchDuration':
        this.searchDurationSeconds.observe(durationSeconds);
        return;
      case 'notificationProcessingDuration':
        this.notificationProcessingDurationSeconds.observe(durationSeconds);
        return;
      default:
        return;
    }
  }

  setSessionsCapacity(value: number): void {
    this.sessionsCapacityTotal.set(value);
  }

  observeSearchResults(count: number): void {
    this.searchResultsCount.observe(count);
  }
}

export type PrometheusMetricsServiceType = PrometheusMetricsService;