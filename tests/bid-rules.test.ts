import { describe, expect, it } from "vitest";
import { canSelectBid, canSubmitBid } from "@/lib/domain/bid-rules";

describe("canSubmitBid", () => {
  it("blocks non-maker", () => {
    const result = canSubmitBid({
      role: "USER",
      isVerifiedMaker: false,
      requestStatus: "open",
      hasExistingBid: false
    });
    expect(result.allowed).toBe(false);
  });

  it("allows verified maker on open request without existing bid", () => {
    const result = canSubmitBid({
      role: "MAKER",
      isVerifiedMaker: true,
      requestStatus: "open",
      hasExistingBid: false
    });
    expect(result.allowed).toBe(true);
  });
});

describe("canSelectBid", () => {
  it("allows selection on open requests only", () => {
    expect(canSelectBid("open").allowed).toBe(true);
    expect(canSelectBid("selected").allowed).toBe(false);
  });
});
