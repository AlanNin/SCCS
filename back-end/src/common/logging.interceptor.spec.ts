import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoggingInterceptor } from './logging.interceptor.js';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logSpy = vi.spyOn((interceptor as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs method, path, status, and passes the response through unchanged', async () => {
    const request = { method: 'GET', originalUrl: '/api/bins' };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    const result = await firstValueFrom(interceptor.intercept(context, handler));

    expect(result).toEqual({ ok: true });
    expect(logSpy).toHaveBeenCalledOnce();
    expect(logSpy.mock.calls[0]?.[0]).toMatch(/^GET \/api\/bins -> 200 \(\d+ms\)$/);
  });

  it('falls back to request.url when originalUrl is absent', async () => {
    const request = { method: 'GET', url: '/fallback-path' };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as unknown as ExecutionContext;
    const handler: CallHandler = { handle: () => of(null) };

    await firstValueFrom(interceptor.intercept(context, handler));

    expect(logSpy.mock.calls[0]?.[0]).toContain('/fallback-path');
  });
});
