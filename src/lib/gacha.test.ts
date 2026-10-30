import { describe, expect, it } from "vitest";
import { rollGacha } from "./gacha";

describe("gacha", () => {
  it("gives each of the 3 heroes a 1/3 chance", () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) { const h = rollGacha(i / 3000); counts[h] = (counts[h] ?? 0) + 1; }
    expect(counts).toEqual({ rogue: 1000, warlock: 1000, monk: 1000 });
  });
});
