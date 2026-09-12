import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Global error handler: normalizes every thrown error (Nest HttpExceptions
 * and anything unexpected) into one JSON shape, and logs it - 5xx at error
 * level with a stack trace, 4xx at warn level - so failures are never
 * silent, whether they're a bug or a bad request.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? extractMessage(exception)
      : 'Internal server error';

    const path = request.originalUrl ?? request.url;
    const body: ErrorBody = {
      statusCode: status,
      message,
      path,
      timestamp: new Date().toISOString(),
    };

    const context = `${request.method} ${path}`;
    const messageForLog = Array.isArray(message) ? message.join('; ') : message;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${context} -> ${status} ${messageForLog}`, stack);
    } else {
      this.logger.warn(`${context} -> ${status} ${messageForLog}`);
    }

    response.status(status).json(body);
  }
}

function extractMessage(exception: HttpException): string | string[] {
  const payload = exception.getResponse();
  if (typeof payload === 'string') return payload;
  const asRecord = payload as { message?: string | string[] };
  return asRecord.message ?? exception.message;
}
