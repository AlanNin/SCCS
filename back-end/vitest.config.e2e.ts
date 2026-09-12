import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Recompute iterates every bin in the DB (real network round-trips to
    // Postgres), which comfortably exceeds vitest's 5s default once the
    // seeded demo data is present alongside test fixtures.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // These suites share one real Postgres database. Scoring's recompute
    // touches every bin row and fixture cleanup runs table-wide deletes by
    // id list, so two spec files racing in parallel can deadlock against
    // each other. Run files sequentially - slower, but correct against
    // shared state.
    fileParallelism: false,
  },
});
