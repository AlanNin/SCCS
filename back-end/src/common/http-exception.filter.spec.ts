import { ArgumentsHost, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpExceptionFilter } from './http-exception.filter.js';

function createMockHost(overrides?: { method?: string; url?: string; omitOriginalUrl?: boolean }) {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const request: { method: string; originalUrl?: string; url: string } = {
    method: overrides?.method ?? 'GET',
    url: overrides?.url ?? '/api/things',
    ...(overrides?.omitOriginalUrl ? {} : { originalUrl: overrides?.url ?? '/api/things' }),
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json, request };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorSpy = vi.spyOn((filter as any).logger, 'error').mockImplementation(() => undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warnSpy = vi.spyOn((filter as any).logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('maps a NotFoundException (object payload with a message field) to a 404 body and logs a warning', () => {
    const { host, status, json } = createMockHost({ url: '/api/bins/999' });
    filter.catch(new NotFoundException('Bin 999 not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Bin 999 not found', path: '/api/bins/999' }),
    );
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('uses request.url when originalUrl is absent', () => {
    const { host, json } = createMockHost({ omitOriginalUrl: true, url: '/fallback-path' });
    filter.catch(new NotFoundException('x'), host);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ path: '/fallback-path' }));
  });

  it('unwraps a plain-string HttpException payload', () => {
    const { host, json } = createMockHost();
    filter.catch(new HttpException('Forbidden', 403), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403, message: 'Forbidden' }));
  });

  it('falls back to exception.message when the payload object has no message field', () => {
    const { host, json } = createMockHost();
    filter.catch(new HttpException({ error: 'Teapot' }, 418), host);

    const body = json.mock.calls[0]?.[0];
    expect(body.statusCode).toBe(418);
    expect(typeof body.message).toBe('string');
  });

  it('maps a validation BadRequestException (array message) to a 400 body', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new BadRequestException(['topN must not be less than 1']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: ['topN must not be less than 1'] }),
    );
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('maps an unexpected (non-Http) error to a 500 body and logs at error level with a stack', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Internal server error' }),
    );
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]?.[1]).toEqual(expect.stringContaining('boom'));
  });

  it('handles a thrown non-Error value without crashing', () => {
    const { host, status } = createMockHost();
    expect(() => filter.catch('just a string', host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });
});
