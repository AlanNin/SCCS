import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logs every completed request (method, path, status, latency). Errors are
 * deliberately left to HttpExceptionFilter - logging them here too would
 * double-log the same failure.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const path = request.originalUrl ?? request.url;
        this.logger.log(`${request.method} ${path} -> ${response.statusCode} (${durationMs}ms)`);
      }),
    );
  }
}
