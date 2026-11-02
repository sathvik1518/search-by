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
