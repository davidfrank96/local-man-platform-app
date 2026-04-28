import assert from "node:assert/strict";
import test from "node:test";
import { createCsvText, parseCsvText } from "../lib/csv.ts";

test("parseCsvText parses a simple CSV file", () => {
  const rows = parseCsvText("vendor_name,category\nMama Put Rice,rice\nSuya Spot,grill");

  assert.deepEqual(rows, [
    {
      vendor_name: "Mama Put Rice",
      category: "rice",
    },
    {
      vendor_name: "Suya Spot",
      category: "grill",
    },
  ]);
});

test("parseCsvText preserves quoted commas", () => {
  const rows = parseCsvText('vendor_name,address\n"Mama Put Rice","Wuse 2, Abuja"');

  assert.equal(rows[0]?.address, "Wuse 2, Abuja");
});

test("createCsvText escapes quoted values", () => {
  const csv = createCsvText(["vendor_name", "address"], [["Mama Put", "Wuse 2, Abuja"]]);

  assert.equal(csv, 'vendor_name,address\nMama Put,"Wuse 2, Abuja"');
});

test("parseCsvText returns an empty array for an empty file", () => {
  assert.deepEqual(parseCsvText(""), []);
});
