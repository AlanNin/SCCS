export interface SwaggerCredentials {
  user: string;
  password: string;
  /** true when a credential was missing and a development default was used. */
  usingDefaults: boolean;
}

/** Resolves the Basic Auth credentials guarding /docs; a pure function for easy unit testing. */
export function resolveSwaggerCredentials(env: NodeJS.ProcessEnv): SwaggerCredentials {
  const user = env.SWAGGER_USER;
  const password = env.SWAGGER_PASSWORD;
  const isProd = env.NODE_ENV === 'production';

  if (!user || !password) {
    if (isProd) {
      throw new Error(
        'SWAGGER_USER and SWAGGER_PASSWORD must be set to expose API docs outside development.',
      );
    }
    return { user: user ?? 'admin', password: password ?? 'admin', usingDefaults: true };
  }

  return { user, password, usingDefaults: false };
}
