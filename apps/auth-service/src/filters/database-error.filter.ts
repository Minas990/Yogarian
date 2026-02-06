import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PostgresError extends Error {
  code: string;
  detail?: string;
}

@Catch(QueryFailedError)
export class DatabaseErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost)
  {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Database Error: ${exception.message}`, exception.driverError);

    const driverError = exception.driverError as PostgresError;

    // duplicate key constraint violation
    if (driverError?.code === '23505')
    {
      const detail = driverError?.detail || '';
      let message = 'Duplicate entry';

      if (detail.includes('email'))
        message = 'Email already exists';
      else if (detail.includes('phone'))
        message = 'Phone number already exists';
      else if (detail.includes('username'))
        message = 'Username already exists';

      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
      });
    }

    // foreign key constraint violation
    if (driverError?.code === '23503')
    {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid reference: related record not found',
        error: 'Bad Request',
      });
    }

    // check constraint violation
    // should not get here as we are using class validators but just in case :)
    if (driverError?.code === '23514')
    {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data: constraint violation',
        error: 'Bad Request',
      });
    }

    // something idk
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database error occurred',
      error: 'Internal Server Error',
    });
  }
}
