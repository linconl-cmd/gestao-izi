import { describe, expect, it } from "vitest";
import { dayRange, monthRange } from "@/core/domain/services/period";

describe("period (Brasília, UTC-3)", () => {
  it("dia: 02:00 UTC ainda é o dia anterior em Brasília", () => {
    const { from, to } = dayRange(new Date("2026-03-10T02:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-09T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-10T02:59:59.999Z");
  });

  it("dia: meio-dia UTC fica no mesmo dia civil", () => {
    const { from, to } = dayRange(new Date("2026-03-10T15:00:00Z"));
    expect(from.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-11T02:59:59.999Z");
  });

  it("mês: virada de ano e venda às 23h de 31/12 em Brasília", () => {
    const { from, to } = monthRange(new Date("2027-01-01T01:30:00Z")); // 22:30 de 31/12 em Brasília
    expect(from.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T02:59:59.999Z");
  });
});
