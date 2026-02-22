import { describe, expect, it } from "vitest";
import { decideFitDecision } from "@/lib/recommendation/scoring";
import type { RecommendationItem } from "@/lib/types";

describe("decideFitDecision", () => {
  it("returns software_fit when score and solvable candidates are sufficient", () => {
    const items: RecommendationItem[] = [
      {
        softwareId: "1",
        name: "Tool A",
        whyRecommended: "reason",
        keyFeatures: ["a", "b", "c"],
        pros: ["p1"],
        cautions: ["c1"],
        solvable: true,
        score: 70
      }
    ];
    const result = decideFitDecision(items);
    expect(result.fitDecision).toBe("software_fit");
  });

  it("returns custom_build when all candidates are unsolvable", () => {
    const items: RecommendationItem[] = [
      {
        softwareId: "1",
        name: "Tool A",
        whyRecommended: "reason",
        keyFeatures: ["a", "b", "c"],
        pros: ["p1"],
        cautions: ["c1"],
        solvable: false,
        score: 39
      }
    ];
    const result = decideFitDecision(items);
    expect(result.fitDecision).toBe("custom_build");
  });
});
