// The query builder types eager-loaded relations as nullable regardless of
// the FK's NOT NULL constraint; a null here means integrity broke out of band.
export function requireRelation<T>(value: T | null, label: string): T {
  if (value === null) {
    throw new Error(`Expected relation "${label}" to be present (required foreign key).`);
  }
  return value;
}
