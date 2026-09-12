import { describe, expect, it } from 'vitest';
import { requireRelation } from './require-relation.js';

describe('requireRelation', () => {
  it('returns the value when present', () => {
    const value = { id: 1 };
    expect(requireRelation(value, 'some.relation')).toBe(value);
  });

  it('throws a descriptive error when the relation is null', () => {
    expect(() => requireRelation(null, 'bin.rack')).toThrowError(
      'Expected relation "bin.rack" to be present (required foreign key).',
    );
  });
});
