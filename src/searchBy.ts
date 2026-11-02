/**
 * The "key ring": only the keys of T whose value is exactly a string.
 *
 * - `name: string`            -> allowed
 * - `role: "dev" | "qa"`      -> allowed (a union of strings is still text)
 * - `id: number`              -> not allowed
 * - `skills: string[]`        -> not allowed
 * - `manager: string | null`  -> not allowed (it can be null, so it is not always text)
 * - `nickname?: string`       -> not allowed (it can be undefined)
 *
 * `-?` removes the "optional" marker, so an optional key is judged by its
 * real type (string | undefined) and correctly left out.
 * `T[K] extends string` is not distributive here, so `string | null`
 * is checked as a whole and fails, which is what we want.
 */
export type StringKeys<T> = {
  [K in keyof T]-?: T[K] extends string ? K : never;
}[keyof T] &
  string;

/**
 * Returns the items where the query appears (case-insensitive, trimmed)
 * in at least one of the chosen text fields.
 *
 * - An empty query returns a copy of all items.
 * - Matches keep their original order.
 * - The input array is never changed, and a new array is always returned.
 */
export function searchBy<T, K extends StringKeys<T>>(
  items: readonly T[],
  query: string,
  keys: readonly K[],
): T[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...items];

  return items.filter((item) =>
    keys.some((key) => {
      // The types say this is a string, but data from an API can lie.
      // A runtime check keeps a bad value from crashing the search.
      const value: unknown = item[key];
      return typeof value === "string" && value.toLowerCase().includes(needle);
    }),
  );
}
