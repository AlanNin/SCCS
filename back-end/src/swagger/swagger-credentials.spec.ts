import { describe, expect, it } from 'vitest';
import { resolveSwaggerCredentials } from './swagger-credentials.js';

describe('resolveSwaggerCredentials', () => {
  it('uses the provided credentials as-is when both are set', () => {
    const result = resolveSwaggerCredentials({ SWAGGER_USER: 'alice', SWAGGER_PASSWORD: 'secret' });
    expect(result).toEqual({ user: 'alice', password: 'secret', usingDefaults: false });
  });

  it('falls back to development defaults when credentials are missing outside production', () => {
    const result = resolveSwaggerCredentials({});
    expect(result).toEqual({ user: 'admin', password: 'admin', usingDefaults: true });
  });

  it('falls back to development defaults when only one credential is set', () => {
    const result = resolveSwaggerCredentials({ SWAGGER_USER: 'alice' });
    expect(result).toEqual({ user: 'alice', password: 'admin', usingDefaults: true });
  });

  it('throws when credentials are missing in production', () => {
    expect(() => resolveSwaggerCredentials({ NODE_ENV: 'production' })).toThrowError(
      /SWAGGER_USER and SWAGGER_PASSWORD must be set/,
    );
  });

  it('does not throw in production when both credentials are set', () => {
    const result = resolveSwaggerCredentials({
      NODE_ENV: 'production',
      SWAGGER_USER: 'ops',
      SWAGGER_PASSWORD: 'prod-secret',
    });
    expect(result).toEqual({ user: 'ops', password: 'prod-secret', usingDefaults: false });
  });
});
