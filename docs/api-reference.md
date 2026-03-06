# API Reference (Gateway HTTP Surface)

This document describes the HTTP API as exposed through `api-gateway`.

Base URL:
- `http://<api-gateway-host>:8000`

Auth model summary:
- `api-gateway` enforces JWT auth by default for known API prefixes.
- Public routes are explicitly whitelisted in `apps/api-gateway/src/middleware/authentication.middleware.ts`.
- JWT can be provided as:
  - `Authorization: Bearer <token>`
  - `jwt` http-only cookie

Audience terms used below:
- `Public`: no JWT required.
- `Any authenticated`: any authenticated user role.
- `Trainer only`: endpoint guarded for trainer role.
- `User only`: endpoint guarded for user role.
- `Email confirmed`: authenticated account with confirmed email.

## Auth Endpoints (`/auth`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `POST` | `/auth/signup` | No | Public | Signup rejects `ADMIN` role in controller logic. |
| `POST` | `/auth/login` | No | Public | Returns token + sets `jwt` cookie. |
| `POST` | `/auth/sendOtp` | Yes | Any authenticated | Used for email confirmation OTP. |
| `POST` | `/auth/confirmEmail` | Yes | Any authenticated | Invalidates current JWT on success. |
| `POST` | `/auth/forgetPassword` | No | Public | Sends reset token. |
| `PATCH` | `/auth/changePassword/:resetToken` | No | Public | Password reset with token from email flow. |
| `PATCH` | `/auth/updatePassword` | Yes | Any authenticated | Invalidates current JWT on success. |
| `PATCH` | `/auth/updateEmail` | Yes | Email confirmed | Invalidates current JWT on success. |
| `DELETE` | `/auth` | Yes | Any authenticated | Deletes account and invalidates token. |

## User Endpoints (`/user`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `GET` | `/user/:userId` | No | Public | Publicly available via gateway allowlist. |
| `PUT` | `/user/me` | Yes | Any authenticated | Update current user profile fields. |
| `POST` | `/user/follow/:followedId` | Yes | User only + Email confirmed | Role restricted via `RolesDecorator(Roles.USER)` and `IsAllowedGuard`. |
| `DELETE` | `/user/unfollow/:followedId` | Yes | User only + Email confirmed | Role restricted via `RolesDecorator(Roles.USER)` and `IsAllowedGuard`. |

## Media Endpoints (`/media`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `GET` | `/media/user` | Yes | Any authenticated | Get current user profile image. |
| `GET` | `/media/user/:userId` | No | Public | Publicly available via gateway allowlist. |
| `POST` | `/media/user` | Yes | Any authenticated | Upload profile image. |
| `PATCH` | `/media/user` | Yes | Any authenticated | Update profile image. |
| `DELETE` | `/media/user` | Yes | Any authenticated | Delete profile image. |
| `POST` | `/media/sessions/:sessionId` | Yes | Email confirmed | Upload session images. |
| `GET` | `/media/sessions/:sessionId` | No | Public | Publicly available via gateway allowlist. |
| `DELETE` | `/media/sessions/:sessionId/photos` | Yes | Any authenticated | Deletes selected session photo IDs. |

## Location Endpoints (`/location`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `GET` | `/location/user` | Yes | Email confirmed | Get current user location. |
| `POST` | `/location/user` | Yes | Email confirmed | Create current user location. |
| `PATCH` | `/location/user` | Yes | Email confirmed | Update current user location. |
| `DELETE` | `/location/user` | Yes | Email confirmed | Delete current user location. |
| `GET` | `/location/session/:sessionId` | Yes | Email confirmed | Get location for a session. |

## Sessions Endpoints (`/sessions`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `POST` | `/sessions` | Yes | Trainer only | Role restricted via `RolesDecorator(Roles.TRAINER)`. |
| `GET` | `/sessions/:id` | No | Public | Publicly available via gateway allowlist. |
| `PATCH` | `/sessions/:id` | Yes | Trainer only | Role restricted via `RolesDecorator(Roles.TRAINER)`. |
| `DELETE` | `/sessions/:id` | Yes | Trainer only | Role restricted via `RolesDecorator(Roles.TRAINER)`. |

## Reservations Endpoints (`/reservations`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `POST` | `/reservations/book/:sessionId` | Yes | Any authenticated | Reservation creation. |
| `GET` | `/reservations/session/:sessionId` | Yes | Any authenticated | Get current user reservation by session. |
| `GET` | `/reservations/:requestId` | Yes | Any authenticated | Get reservation status. |
| `DELETE` | `/reservations/:requestId` | Yes | Any authenticated | Cancel reservation request. |
| `DELETE` | `/reservations/book/:sessionId` | Yes | Any authenticated | Refund reservation flow. |

## Search Endpoints (`/search`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `GET` | `/search/sessions` | No | Public | Publicly available via gateway allowlist. |
| `GET` | `/search/me` | Yes | Any authenticated | Current user profile projection. |
| `GET` | `/search/sessions/me` | Yes | Any authenticated | Returns trainer-owned sessions or user-participated sessions. |
| `GET` | `/search/followers` | Yes | Any authenticated | Followers of current user. |
| `GET` | `/search/following` | Yes | Any authenticated | Following list of current user. |
| `GET` | `/search/follower/:id` | Yes | Any authenticated | Followers for a specific trainer/user id. |
| `GET` | `/search/trainer/:id` | Yes | Any authenticated | Trainer profile by id. |

## Payment Endpoint (`/payment`)

| Method | Path | Auth Required | Allowed Audience | Notes |
|---|---|---|---|---|
| `POST` | `/payment/webhook` | No | Public (Stripe) | Must remain publicly reachable for Stripe callbacks. |

## Official Postman Docs

- https://documenter.getpostman.com/view/45996252/2sBXcLex1Y
