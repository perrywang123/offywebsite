import { expect, it } from "vitest";
import { duplicateOfficialBindings, officialBindingKeys } from "./bindings";

it("identifies decoded tracking values and discount codes independently of URL decoration", () => {
  expect(
    officialBindingKeys(
      "https://isoffy.com/discount/Fans?redirect=/products&dt_id=368%39395&utm_source=video",
    ),
  ).toEqual(["dt_id=3689395", "discount=FANS"]);
  expect(officialBindingKeys("https://isoffy.com/discount/fans?utm_source=other")).toEqual([
    "discount=FANS",
  ]);
});
it.each(["?dt_id=1&dt_id=2", "?dt_id=", "?dt_id=123%EF%BC%8C"])(
  "rejects ambiguous or malformed input %s",
  (query) => {
    expect(() => officialBindingKeys("https://isoffy.com/products" + query)).toThrow(
      "invalid_official_tracking",
    );
  },
);
it("discloses legacy duplicate aliases without conflating different identities", () => {
  expect(
    duplicateOfficialBindings([
      { id: "a", alias: "maya", officialLink: "https://isoffy.com/products?dt_id=3689395" },
      {
        id: "b",
        alias: "maya-test",
        officialLink: "https://isoffy.com/collections/all?dt_id=3689395",
      },
      { id: "c", alias: "other", officialLink: "https://isoffy.com/products?dt_id=distinct" },
    ]),
  ).toEqual([["dt_id=3689395", ["maya", "maya-test"]]]);
});
