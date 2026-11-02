# searchBy: A Search Helper That Only Accepts String Fields

**Day 36 Mini Capstone, TypeScript**  
**Project folder:** `search-by`

---

## 1. Goal

A search helper should only look inside text fields. The task (Day 36 Deep Dive, Mini Capstone) was to write `searchBy(items, query, keys)`, where `keys` may contain **only** fields whose value is a string. Passing `id` (a number), `skills` (an array) or `manager` (`string | null`) must **not compile**.

The idea: a key ring with only the keys that open the front door. You can hand it to anyone, without worrying that they try the safe.

---

## 2. Tools

| Tool | Role |
|---|---|
| TypeScript (strict mode) | Mapped types and generics that stop bad keys at compile time |
| Vitest | Runs the behaviour tests |
| `tsc --noEmit` | Checks the types, including the `@ts-expect-error` proofs |

---

## 3. Project structure

```
search-by/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── DOCUMENTATION.md
└── src/
    ├── searchBy.ts          (the capstone function and type)
    └── searchBy.test.ts     (18 tests)
```

---

## 4. Setup commands

```bash
mkdir search-by
cd search-by
npm init -y
npm install -D typescript vitest
```

**`package.json` scripts**

```json
"test": "vitest run",
"typecheck": "tsc --noEmit"
```

---

## 5. The function

**`src/searchBy.ts`**

```ts
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
```

### How it works

1. `StringKeys<T>` goes through every key of `T` and keeps the key only when its value type is a string.
2. `K extends StringKeys<T>` means the `keys` array can only hold those keys.
3. `searchBy` lowercases and trims the query, then keeps each item where at least one chosen field contains it.

### Design decisions

| Decision | Reason |
|---|---|
| `T[K] extends string ? K : never` | Keeps only keys whose value is a string. A union of strings such as `"dev" \| "qa"` still counts as text. |
| `string \| null` is rejected | The value can be `null`, so it is not always text. Checking the whole type (not each part) makes it fail, which is what the task wants. |
| `-?` in the mapped type | An optional field `b?: string` is really `string \| undefined`. Without `-?` it would be judged wrongly. With it, it is correctly left out. |
| `& string` at the end | Object keys can also be numbers or symbols. This keeps the result as plain text keys. |
| Two generics `<T, K extends StringKeys<T>>` | `T` is inferred from `items`, so the compiler knows which keys are valid. `K` keeps the exact keys given. |
| `readonly` arrays as input | Callers can pass read-only arrays, and the function promises not to change them. |
| Empty query returns a copy of all items | A blank search box should show everything, and the caller must never get the original array back. |
| Query is trimmed and lowercased | Spaces and capital letters should not break a search. |
| Runtime `typeof value === "string"` check | The types say it is a string, but data from an API can break the types. The check stops a crash. |
| Returns the same item objects | The function only filters. It does not copy or change items. |

---

## 6. Tests (18 tests)

**`src/searchBy.test.ts`**

The tests have two groups: **behaviour** (does the search work) and **the compiler enforces the key ring** (do wrong keys fail to compile).

| # | Test | What it proves |
|---|---|---|
| 1 | Finds a match in one field | Basic search |
| 2 | Ignores upper and lower case | Case-insensitive |
| 3 | Matches part of a word | Partial match |
| 4 | Matches if any chosen field matches | Several keys work as "or" |
| 5 | Only looks at the chosen fields | Other fields are ignored |
| 6 | Works with a union-of-strings field | `"dev" \| "qa"` counts as text |
| 7 | Trims spaces around the query | `"  meena  "` still finds Meena |
| 8 | Empty query returns everything as a copy | Blank search shows all, original is safe |
| 9 | Nothing matches returns `[]` | No crash |
| 10 | No keys given returns `[]` | Clear, predictable result |
| 11 | Keeps the original order | Results are not reordered |
| 12 | Does not change the input array | No side effects |
| 13 | Returns the same item objects | No copying of items |
| 14 | A `null` at runtime does not crash | Safe against bad API data |
| 15 | `StringKeys<Employee>` is exactly `"name" \| "email" \| "role"` | The type is exactly right |
| 16 | `StringKeys` leaves out optional string fields | `-?` works |
| 17 | `id`, `skills`, `manager`, an unknown key, and a mixed list do not compile | The main goal of the task |
| 18 | The result type is `Employee[]` | The item type is kept |

### Full test file

```ts
import { describe, it, expect } from "vitest";
import { searchBy, type StringKeys } from "./searchBy";

type Employee = {
  id: number;
  name: string;
  email: string;
  role: "dev" | "qa"; // union of strings: still text
  skills: string[];
  manager: string | null;
};

const team: Employee[] = [
  { id: 1, name: "Asha Rao", email: "asha@corp.com", role: "dev", skills: ["ts"], manager: null },
  { id: 2, name: "Ravi Kumar", email: "ravi@corp.com", role: "qa", skills: ["cypress"], manager: "Asha Rao" },
  { id: 3, name: "Meena Das", email: "meena@school.org", role: "dev", skills: ["react"], manager: "Asha Rao" },
];

// Compile-time helper: true only when A and B are exactly the same type.
type Equal<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2
    ? true
    : false;

describe("searchBy: behaviour", () => {
  it("finds a match in one field", () => {
    expect(searchBy(team, "ravi", ["name"]).map((e) => e.id)).toEqual([2]);
  });

  it("ignores upper and lower case", () => {
    expect(searchBy(team, "ASHA", ["name"]).map((e) => e.id)).toEqual([1]);
  });

  it("matches part of a word", () => {
    expect(searchBy(team, "corp", ["email"]).map((e) => e.id)).toEqual([1, 2]);
  });

  it("matches if ANY chosen field matches", () => {
    // "school" is only in an email, "ravi" is only in a name
    expect(searchBy(team, "school", ["name", "email"]).map((e) => e.id)).toEqual([3]);
    expect(searchBy(team, "ravi", ["name", "email"]).map((e) => e.id)).toEqual([2]);
  });

  it("only looks at the chosen fields", () => {
    // "asha" is in email too, but we only search role
    expect(searchBy(team, "asha", ["role"])).toEqual([]);
  });

  it("works with a union-of-strings field", () => {
    expect(searchBy(team, "qa", ["role"]).map((e) => e.id)).toEqual([2]);
  });

  it("trims spaces around the query", () => {
    expect(searchBy(team, "  meena  ", ["name"]).map((e) => e.id)).toEqual([3]);
  });

  it("returns everything (as a copy) for an empty query", () => {
    const all = searchBy(team, "", ["name"]);
    expect(all).toEqual(team);
    expect(all).not.toBe(team);
    expect(searchBy(team, "   ", ["name"])).toEqual(team);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchBy(team, "zzz", ["name", "email"])).toEqual([]);
  });

  it("returns an empty array when no keys are given", () => {
    expect(searchBy(team, "asha", [])).toEqual([]);
  });

  it("keeps the original order", () => {
    expect(searchBy(team, "a", ["name"]).map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("does not change the input array", () => {
    const copy = structuredClone(team);
    searchBy(team, "asha", ["name"]);
    expect(team).toEqual(copy);
  });

  it("returns the same item objects, not copies", () => {
    const [found] = searchBy(team, "ravi", ["name"]);
    expect(found).toBe(team[1]);
  });

  it("does not crash when real data breaks the types (null at runtime)", () => {
    const bad = [{ name: null as unknown as string, email: "x@y.com" }];
    expect(searchBy(bad, "x", ["name", "email"])).toEqual(bad);
    expect(searchBy(bad, "x", ["name"])).toEqual([]);
  });
});

describe("searchBy: the compiler enforces the key ring", () => {
  it("StringKeys<Employee> is exactly the text fields", () => {
    const proof: Equal<StringKeys<Employee>, "name" | "email" | "role"> = true;
    expect(proof).toBe(true);
  });

  it("StringKeys leaves out optional string fields", () => {
    type WithOptional = { a: string; b?: string };
    const proof: Equal<StringKeys<WithOptional>, "a"> = true;
    expect(proof).toBe(true);
  });

  it("rejects number, array, nullable and unknown keys", () => {
    // None of these may compile. If one starts compiling, tsc reports
    // "Unused '@ts-expect-error' directive" and the type check fails.

    // @ts-expect-error id is a number
    searchBy(team, "1", ["id"]);

    // @ts-expect-error skills is an array
    searchBy(team, "ts", ["skills"]);

    // @ts-expect-error manager can be null
    searchBy(team, "asha", ["manager"]);

    // @ts-expect-error salary is not a field of Employee
    searchBy(team, "100", ["salary"]);

    // @ts-expect-error one bad key in a good list is still rejected
    searchBy(team, "asha", ["name", "id"]);

    expect(true).toBe(true);
  });

  it("returns the same item type that went in", () => {
    const result = searchBy(team, "asha", ["name"]);
    const proof: Equal<typeof result, Employee[]> = true;
    expect(proof).toBe(true);
  });
});
```

### How the compile-time proof works

- `// @ts-expect-error` says "the next line must be a compile error".
- If that line ever starts compiling, `tsc` reports **"Unused '@ts-expect-error' directive"** and the type check fails.
- Vitest does not check types by itself, so the proof is run with `npm run typecheck`. Always run both commands.
- The `Equal<A, B>` helper is true only when two types are exactly the same. It proves the exact result of `StringKeys`.

---

## 7. Results

| Check | Command | Result |
|---|---|---|
| Type check | `npm run typecheck` | No errors |
| Tests | `npm test` | **18 passed** |
| Break-it check 1 | Changed `StringKeys` to also allow numbers, arrays and `null` | **Type check failed** (3 errors, including the unused `@ts-expect-error` lines) |
| Break-it check 2 | Removed the lowercase step | **4 tests failed** |
| Restored original | Type check and tests | No errors, 18 passed |

---

## 8. Using it in the app

```ts
type User = { id: number; name: string; email: string; tags: string[] };

const users: User[] = [/* ... */];

searchBy(users, "asha", ["name", "email"]); // works
searchBy(users, "1", ["id"]);               // compile error: id is a number
searchBy(users, "ts", ["tags"]);            // compile error: tags is an array
```

Add a new text field to the type later, and it becomes searchable automatically. Add a number field, and it stays blocked.

---

## 9. What was practiced

- Building a mapped type (`StringKeys<T>`) that picks keys by the type of their value.
- Using generics with a constraint (`K extends StringKeys<T>`).
- Understanding why `string | null` and optional fields are not "string keys".
- Proving that wrong code does not compile, using `@ts-expect-error`.
- Proving a type is exactly right, using an `Equal` helper.
- Keeping a runtime safety check even when the types look safe.
- Checking that tests are real by breaking the code on purpose and watching them fail.

---

## 10. Known limit

`searchBy` does a simple "contains" match. It does not handle accents, typos or ranking by best match. For large lists or fuzzy search, a search library is a better fit.

---

## 11. How to run it

```bash
cd search-by
npm install
npm test            # 18 tests
npm run typecheck   # type check (also proves the compile errors)
```
