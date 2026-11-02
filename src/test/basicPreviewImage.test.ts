import { describe, it, expect } from "vitest";
import { basicPreviewReasonCopy } from "@/lib/basicPreviewImage";

describe("basicPreviewReasonCopy", () => {
  it("explains rate limiting without promising AI output", () => {
    expect(basicPreviewReasonCopy("RATE_LIMITED")).toBe(
      "Realistic AI try-on is busy right now — this free preview was made without AI.",
    );
  });

  it("explains exhausted credits and AI outage", () => {
    expect(basicPreviewReasonCopy("CREDITS_EXHAUSTED")).toContain("credits are used up");
    expect(basicPreviewReasonCopy("AI_UNAVAILABLE")).toContain("temporarily unavailable");
  });

  it("covers the manual no-AI preview and missing configuration", () => {
    expect(basicPreviewReasonCopy("NO_AI")).toBe("Free preview — made without AI.");
    expect(basicPreviewReasonCopy("AI_NOT_CONFIGURED")).toContain("isn't set up yet");
  });

  it("falls back to the no-AI copy for unknown reasons", () => {
    expect(basicPreviewReasonCopy("SOMETHING_NEW")).toBe(basicPreviewReasonCopy("NO_AI"));
  });
});
