# BullMQ and Cron Jobs

This document lists background jobs currently used in the Yogarian services and explains what each job does.

## BullMQ Jobs

| Service | Queue | Job Name | Trigger / Schedule | What It Does |
|:--------|:------|:---------|:-------------------|:-------------|
| `auth-service` | `unconfirmed-user-cleanup` | `cleanup-unconfirmed-users` | Repeating job registered on module init. Interval comes from `CLEANUP_CRON_SCHEDULE` (milliseconds). | Finds users with `isEmailConfirmed=false` older than `UNCONFIRMED_USER_MAX_AGE` (default 12h) and deletes their accounts in batches (up to 500 candidates per run). |
| `sessions-service` | `running-sessions` | `moveRunningSessionsToOngoing` | Repeating every 60 seconds (`onModuleInit`). | Moves sessions from `UPCOMING` to `ONGOING` when `startTime <= now`, then emits Kafka topic `sessions.ongoing` with updated session IDs. |
| `sessions-service` | `completed-sessions` | `moveOnGoingSessionsToCompleted` | Repeating every 60 seconds (`onModuleInit`). | Moves sessions from `ONGOING` to `COMPLETED` when `startTime + duration <= now`, then emits Kafka topic `sessions.completed` with updated session IDs. |
| `notifications-service` | `notifications_queue` | `notification-email` | Enqueued by outbox polling and event handlers. Retries up to 5 attempts with exponential backoff (5s base). | Loads email task by `taskId`, marks as `PROCESSING`, sends templated email, then marks `SENT` or `FAILED` with error details. |
| `reservations-service` | `refund-timeout` | `refund-timeout-check` | Delayed job, scheduled 30 minutes after refund initiation response. | Safety timeout: if reservation is still `REFUND_PENDING` and Stripe webhook did not arrive, it reverts status back to `CONFIRMED` and stores failure reason. |
| `reservations-service` | `refund-all-users` | `refund-all-users` | Delayed job, scheduled 32 minutes after session deletion (`jobId=refund-all-users_<sessionId>`). | Looks up confirmed reservations for the session, sets each to `REFUND_PENDING`, emits `refund.reservation.command` for each, and emits `all.users.refunded` after status updates are applied. |

## Cron Jobs (`@nestjs/schedule`)

| Service | Cron Expression | Method | What It Does |
|:--------|:----------------|:-------|:-------------|
| `notifications-service` | `EVERY_5_SECONDS` | `pollPendingTasks()` | Polls up to 100 outbox tasks with `PENDING` status and enqueues each to BullMQ (`notification-email`). Includes re-entrancy guard to avoid overlapping runs. |
| `notifications-service` | `EVERY_10_MINUTES` | `rescueStuckTasks()` | Finds tasks stuck in `PROCESSING` for more than 15 minutes and resets them to `PENDING` so they can be retried. Includes re-entrancy guard. |

## Notes

- Not every timed background action is a cron decorator: several jobs are BullMQ repeat/delayed jobs created from service startup or event handlers.
- The source of truth for queue names is:
  - `apps/auth-service/src/constants/queue.constants.ts`
  - `apps/sessions-service/src/queue/queues.constants.ts`
  - `apps/notifications-service/src/queue/constants.queue.ts`
  - `apps/reservations-service/src/queue/queues.constants.ts`
- The only `@Cron` jobs currently found are in `apps/notifications-service/src/queue/notification-outbox.poller.ts`.
