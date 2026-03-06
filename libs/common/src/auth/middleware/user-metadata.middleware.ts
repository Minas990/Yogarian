import { Roles, type UserTokenPayload } from '@app/common/types';
import { type NextFunction, type Request, type Response } from 'express';

type RequestWithUser = Request & { user?: UserTokenPayload };

export const USER_METADATA_HEADER = 'x-user-metadata';

export function attachUserMetadataMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const encodedMetadata = req.header(USER_METADATA_HEADER);

  if (!encodedMetadata) {
    next();
    return;
  }

  try {
    const decodedJson = Buffer.from(encodedMetadata, 'base64').toString('utf8');
    const parsedPayload = JSON.parse(decodedJson) as unknown;

    if (isUserTokenPayload(parsedPayload)) {
      (req as RequestWithUser).user = parsedPayload;
    }
  } catch {
    //keep request unmodified 
  }

  next();
}

export function isUserTokenPayload(value: unknown): value is UserTokenPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<UserTokenPayload>;

  return (
    typeof payload.userId === 'string' &&
    payload.userId.length > 0 &&
    typeof payload.email === 'string' &&
    payload.email.length > 0 &&
    typeof payload.isEmailConfirmed === 'boolean' &&
    typeof payload.role === 'string' &&
    Object.values(Roles).includes(payload.role as Roles) &&
    (payload.iat === undefined || typeof payload.iat === 'number') &&
    (payload.exp === undefined || typeof payload.exp === 'number')
  );
}
