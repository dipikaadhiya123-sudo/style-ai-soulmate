import { describe, expect, it } from "vitest";
import { BASIC_PREVIEW_DAILY_LIMIT, getDailyBasicPreviewCount, useDailyBasicPreview } from "@/lib/basicPreviewUsage";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("device-local Basic Preview daily limit", () => {
  it("allows exactly five previews per user per local day", () => {
    const storage = createMemoryStorage();
    const date = new Date(2026, 9, 21, 12);

    for (let use = 1; use <= BASIC_PREVIEW_DAILY_LIMIT; use += 1) {
      const result = useDailyBasicPreview("user-123", storage, date);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(use);
      expect(result.remaining).toBe(BASIC_PREVIEW_DAILY_LIMIT - use);
    }

    const blocked = useDailyBasicPreview("user-123", storage, date);
    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(5);
    expect(getDailyBasicPreviewCount("user-123", storage, date)).toBe(5);
  });
});