// The query builder types eager-loaded to-one relations as nullable
// regardless of whether the underlying FK is NOT NULL, because the include
// mechanism is generic over LEFT JOIN semantics. For relations backed by a
// required FK (asserted in the contract), a null here means the schema's
// referential integrity was violated out of band - worth a loud failure,
// not a silent `!`.
export function requireRelation<T>(value: T | null, label: string): T {
  if (value === null) {
    throw new Error(`Expected relation "${label}" to be present (required foreign key).`);
  }
  return value;
}
