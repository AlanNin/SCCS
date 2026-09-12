import { Logger, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupSwagger } from './swagger.setup.js';

@Module({})
class EmptyModule {}

describe('setupSwagger', () => {
  let app: INestApplication;
  let originalUser: string | undefined;
  let originalPassword: string | undefined;

  beforeEach(async () => {
    originalUser = process.env.SWAGGER_USER;
    originalPassword = process.env.SWAGGER_PASSWORD;
    const moduleRef = await Test.createTestingModule({ imports: [EmptyModule] }).compile();
    app = moduleRef.createNestApplication();
  });

  afterEach(async () => {
    if (originalUser === undefined) delete process.env.SWAGGER_USER;
    else process.env.SWAGGER_USER = originalUser;
    if (originalPassword === undefined) delete process.env.SWAGGER_PASSWORD;
    else process.env.SWAGGER_PASSWORD = originalPassword;
    await app.close();
  });

  it('warns and mounts development-default credentials when none are configured', () => {
    delete process.env.SWAGGER_USER;
    delete process.env.SWAGGER_PASSWORD;
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    setupSwagger(app);

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('does not warn when credentials are configured', () => {
    process.env.SWAGGER_USER = 'admin';
    process.env.SWAGGER_PASSWORD = 'secret';
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    setupSwagger(app);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
