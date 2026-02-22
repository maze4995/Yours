import { createHash } from "node:crypto";
import type { FitDecision, ProfileInput, RecommendationItem, SoftwareCatalogItem } from "@/lib/types";

export type ScoredCandidate = {
  item: SoftwareCatalogItem;
  score: number;
  reasons: string[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function intersectCount(values: string[], terms: string[]): number {
  const set = new Set(values.map(normalize));
  return terms.filter((term) => set.has(normalize(term))).length;
}

function tokenizeProfile(profile: ProfileInput): string[] {
  return [
    profile.jobTitle,
    profile.industry,
    ...profile.goals,
    ...profile.painPoints,
    ...profile.currentTools
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter((token) => token.length > 1);
}

export function scoreCatalogCandidates(
  profile: ProfileInput,
  catalog: SoftwareCatalogItem[]
): ScoredCandidate[] {
  const roleSignal = normalize(profile.jobTitle);
  const industrySignal = normalize(profile.industry);
  const profileTokens = tokenizeProfile(profile);

  return catalog
    .map((item) => {
      let score = 0;
      const reasons: string[] = [];

      const roleMatches = item.target_roles.filter((role) =>
        includesAny(roleSignal, role.toLowerCase().split(" "))
      );
      if (roleMatches.length > 0) {
        const roleScore = Math.min(30, 12 + roleMatches.length * 8);
        score += roleScore;
        reasons.push(`직무 적합성 ${roleScore}점`);
      }

      const tagMatchCount = intersectCount(item.tags, profile.goals) + intersectCount(item.tags, profile.painPoints);
      if (tagMatchCount > 0) {
        const tagScore = Math.min(35, tagMatchCount * 7);
        score += tagScore;
        reasons.push(`태그 매칭 ${tagScore}점`);
      }

      const categoryHit = includesAny(item.category.toLowerCase(), profileTokens);
      if (categoryHit) {
        score += 10;
        reasons.push("카테고리 매칭 10점");
      }

      if (item.description.toLowerCase().includes(industrySignal)) {
        score += 8;
        reasons.push("산업군 매칭 8점");
      }

      if (
        profile.budgetPreference.toLowerCase().includes("낮") &&
        (item.pricing_model ?? "").toLowerCase().includes("free")
      ) {
        score += 7;
        reasons.push("예산 적합 7점");
      }

      if (
        profile.budgetPreference.toLowerCase().includes("높") &&
        (item.pricing_model ?? "").toLowerCase().includes("enterprise")
      ) {
        score += 6;
        reasons.push("고급 플랜 적합 6점");
      }

      if (profile.teamSize >= 20 && item.tags.some((tag) => normalize(tag).includes("collaboration"))) {
        score += 6;
        reasons.push("팀 협업 확장성 6점");
      }

      return {
        item,
        score,
        reasons
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name);
    });
}

export function decideFitDecision(items: RecommendationItem[]): { fitDecision: FitDecision; fitReason: string } {
  const highestScore = items[0]?.score ?? 0;
  const solvableCount = items.filter((item) => item.solvable).length;

  if (items.length === 0) {
    return {
      fitDecision: "custom_build",
      fitReason: "매칭 가능한 소프트웨어 후보가 없어 맞춤 개발이 더 적합합니다."
    };
  }

  if (highestScore < 40 || solvableCount === 0) {
    return {
      fitDecision: "custom_build",
      fitReason: "요구사항 대비 기존 소프트웨어 적합도가 낮아 맞춤 개발을 권장합니다."
    };
  }

  return {
    fitDecision: "software_fit",
    fitReason: "상위 후보가 핵심 요구를 충족하여 기존 소프트웨어 도입이 가능합니다."
  };
}

export function createProfileFingerprint(profile: ProfileInput): string {
  const normalized = JSON.stringify({
    ...profile,
    painPoints: [...profile.painPoints].sort(),
    goals: [...profile.goals].sort(),
    currentTools: [...profile.currentTools].sort()
  });

  return createHash("sha256").update(normalized).digest("hex");
}
