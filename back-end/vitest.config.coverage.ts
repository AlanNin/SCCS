import { defineConfig } from 'vitest/config';

// Combines unit (*.spec.ts) and e2e (*.e2e-spec.ts) suites under one
// coverage run - the e2e suites are what actually exercise the
// controllers/services against a real database, so coverage numbers for
// the API only make sense counting both together.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/prisma/contract.d.ts',
        'src/prisma/contract.json',
        // Bootstrap entry point: constructs the real server and calls
        // app.listen(); nothing meaningful to unit/integration-test here
        // that isn't already covered via setup-app.ts + the e2e suites
        // exercising a fully-configured test app.
        'src/main.ts',
        // CLI seed script - a data-generation tool, not part of the API
        // surface these tests are covering.
        'src/scripts/**',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
});
