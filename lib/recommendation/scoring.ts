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

function splitTokens(value: string): string[] {
  const genericTokens = new Set([
    "업무",
    "관리",
    "문제",
    "불편",
    "어려움",
    "현재",
    "사용",
    "필요",
    "처리",
    "작업",
    "시스템",
    "도구",
    "기능",
    "서비스",
    "회사",
    "팀",
    "담당",
    "운영",
    "개선",
    "효율",
    "데이터"
  ]);

  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter((token) => token.length > 1 && !genericTokens.has(token));
}

const KO_TO_EN_TAGS: Record<string, string[]> = {
  "반복 업무 자동화": ["automation", "workflow", "integration"],
  "고객 응답": ["support", "live-chat", "helpdesk", "crm"],
  "데이터 분석": ["analytics", "dashboard", "bi", "database"],
  "비용": ["finance", "accounting", "invoicing"],
  "일정": ["scheduling", "calendar", "tasks"],
  "장부": ["accounting", "bookkeeping", "finance", "invoicing", "receipt"],
  "회계": ["accounting", "bookkeeping", "finance", "invoicing", "tax"],
  "정산": ["accounting", "bookkeeping", "finance", "invoicing", "settlement"],
  "매입": ["inventory", "procurement", "finance"],
  "매출": ["sales", "crm", "invoicing", "pos"],
  "재고": ["inventory", "stock", "warehouse", "pos"],
  "식당": ["restaurant", "pos", "inventory", "order", "reservation"],
  "음식점": ["restaurant", "pos", "inventory", "order", "reservation"],
  "카페": ["restaurant", "pos", "inventory", "order"],
  "예약": ["reservation", "scheduling", "calendar"],
  "주문": ["order", "pos", "inventory", "payment"],
  "영수증": ["receipt", "invoicing", "accounting", "finance"],
  "급여": ["payroll", "hr", "finance"],
  "세금": ["tax", "accounting", "finance"],
  "bookkeeping": ["accounting", "finance", "invoicing"],
  "ledger": ["accounting", "finance", "invoicing"],
  "restaurant": ["restaurant", "pos", "inventory", "order"],
  "inventory": ["inventory", "stock", "warehouse", "pos"],
  "pos": ["pos", "order", "payment", "inventory"]
};

const KO_TO_EN_ROLES: Record<string, string[]> = {
  "마케터": ["marketer", "marketing", "growth"],
  "개발자": ["developer", "engineering"],
  "창업": ["founder", "startup founder"],
  "대표": ["founder", "owner", "ceo"],
  "운영": ["operations", "ops"],
  "기획": ["pm", "product manager", "operations"],
  "디자이너": ["designer"]
};

const KO_TO_EN_INDUSTRY: Record<string, string[]> = {
  "이커머스": ["ecommerce", "retail"],
  "교육": ["education"],
  "saas": ["saas"],
  "제조": ["manufacturing"],
  "물류": ["logistics", "warehouse"],
  "금융": ["finance", "accounting"],
  "헬스케어": ["healthcare"],
  "식당": ["restaurant", "food"],
  "음식점": ["restaurant", "food"],
  "카페": ["restaurant", "beverage"]
};

function expandMappedSignals(input: string, mapper: Record<string, string[]>): string[] {
  const normalizedInput = normalize(input);
  const expanded = [normalizedInput];

  for (const [key, mapped] of Object.entries(mapper)) {
    if (normalizedInput.includes(normalize(key))) {
      expanded.push(...mapped.map(normalize));
    }
  }

  return expanded;
}

function expandMappedSignalsFromList(values: string[], mapper: Record<string, string[]>): string[] {
  const expanded: string[] = [];

  for (const value of values) {
    expanded.push(...expandMappedSignals(value, mapper));
  }

  return expanded;
}

function buildItemSearchText(item: SoftwareCatalogItem): string {
  return normalize(
    [
      item.name,
      item.category,
      item.description,
      item.target_roles.join(" "),
      item.tags.join(" "),
      item.key_features.join(" ")
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 1))];
}

function getMainPainSignals(profile: ProfileInput): string[] {
  const detail = profile.mainPainDetail?.trim();
  if (!detail) return [];

  const tokenSignals = splitTokens(detail);
  const mappedSignals = expandMappedSignals(detail, KO_TO_EN_TAGS);

  return unique([...tokenSignals, ...mappedSignals]);
}

function tokenizeProfile(profile: ProfileInput): string[] {
  return [
    profile.jobTitle,
    profile.industry,
    profile.mainPainDetail ?? "",
    ...profile.goals,
    ...profile.painPoints,
    ...profile.currentTools,
    ...expandMappedSignals(profile.jobTitle, KO_TO_EN_ROLES),
    ...expandMappedSignals(profile.industry, KO_TO_EN_INDUSTRY),
    ...expandMappedSignalsFromList(profile.goals, KO_TO_EN_TAGS),
    ...expandMappedSignalsFromList(profile.painPoints, KO_TO_EN_TAGS)
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter((token) => token.length > 1);
}

export function scoreCatalogCandidates(profile: ProfileInput, catalog: SoftwareCatalogItem[]): ScoredCandidate[] {
  const expandedRoles = expandMappedSignals(profile.jobTitle, KO_TO_EN_ROLES);
  const expandedIndustryTokens = expandMappedSignals(profile.industry, KO_TO_EN_INDUSTRY);
  const expandedGoalTags = expandMappedSignalsFromList(profile.goals, KO_TO_EN_TAGS);
  const expandedPainTags = expandMappedSignalsFromList(profile.painPoints, KO_TO_EN_TAGS);
  const mainPainSignals = getMainPainSignals(profile);
  const profileTokens = tokenizeProfile(profile);

  const allExpandedTerms = unique([...expandedGoalTags, ...expandedPainTags, ...mainPainSignals]);

  const scored = catalog.map((item) => {
    let score = 0;
    const reasons: string[] = [];
    const itemText = buildItemSearchText(item);

    const roleMatches = item.target_roles.filter((role) => {
      const roleTokens = normalize(role).split(" ");
      return expandedRoles.some((signal) => roleTokens.some((token) => signal.includes(token) || token.includes(signal)));
    });

    if (roleMatches.length > 0) {
      const roleScore = Math.min(30, 12 + roleMatches.length * 8);
      score += roleScore;
      reasons.push(`직무 적합도 +${roleScore}`);
    }

    const semanticMatchCount = allExpandedTerms.filter((term) => itemText.includes(term)).length;
    if (semanticMatchCount > 0) {
      const semanticScore = Math.min(40, 8 + semanticMatchCount * 4);
      score += semanticScore;
      reasons.push(`문제/목표 신호 매칭 +${semanticScore}`);
    }

    const categoryHit = includesAny(normalize(item.category), profileTokens);
    if (categoryHit) {
      score += 8;
      reasons.push("카테고리 매칭 +8");
    }

    const industryHit = expandedIndustryTokens.some((token) => itemText.includes(token));
    if (industryHit) {
      score += 8;
      reasons.push("업종 맥락 매칭 +8");
    }

    const budget = normalize(profile.budgetPreference);
    const pricing = normalize(item.pricing_model ?? "");
    if ((budget.includes("무료") || budget.includes("free")) && pricing.includes("free")) {
      score += 7;
      reasons.push("예산 적합 +7");
    }
    if ((budget.includes("50") || budget.includes("외주") || budget.includes("개발")) && pricing.includes("enterprise")) {
      score += 6;
      reasons.push("고급 플랜 적합 +6");
    }

    if (profile.teamSize >= 20 && item.tags.some((tag) => normalize(tag).includes("collaboration"))) {
      score += 5;
      reasons.push("팀 협업 확장성 +5");
    }

    if (profile.teamSize <= 3 && item.tags.some((tag) => ["kanban", "no-code", "scheduling"].includes(normalize(tag)))) {
      score += 4;
      reasons.push("소규모 도입 용이 +4");
    }

    if (mainPainSignals.length > 0) {
      const detailMatchCount = mainPainSignals.filter((signal) => itemText.includes(signal)).length;
      const strictSignalMode = mainPainSignals.length >= 4;

      if (detailMatchCount > 0) {
        const detailScore = Math.min(26, detailMatchCount * 6);
        score += detailScore;
        reasons.push(`핵심 불편 상세 매칭 +${detailScore}`);
      } else {
        const penalty = strictSignalMode ? 32 : 18;
        score -= penalty;
        reasons.push(`핵심 불편 상세와 연관성 낮음 -${penalty}`);
      }

      if (detailMatchCount <= 1 && mainPainSignals.length >= 4) {
        score -= 10;
        reasons.push("핵심 불편 해결력 부족 -10");
      }

      if (!industryHit && strictSignalMode) {
        score -= 12;
        reasons.push("업종 맥락 미스매치 -12");
      }
    }

    return {
      item,
      score: Math.max(0, Math.round(score)),
      reasons
    };
  });

  const strictSignals = mainPainSignals.length >= 4;
  const stronglyAligned =
    strictSignals
      ? scored.filter((candidate) => {
          const itemText = buildItemSearchText(candidate.item);
          const hitCount = mainPainSignals.filter((signal) => itemText.includes(signal)).length;
          return hitCount >= 1;
        })
      : scored;

  const rankingPool = stronglyAligned.length >= 3 ? stronglyAligned : scored;

  return rankingPool.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return a.item.name.localeCompare(b.item.name);
  });
}

export function decideFitDecision(items: RecommendationItem[]): { fitDecision: FitDecision; fitReason: string } {
  const highestScore = items[0]?.score ?? 0;
  const solvableCount = items.filter((item) => item.solvable).length;

  if (items.length === 0) {
    return {
      fitDecision: "custom_build",
      fitReason: "매칭 가능한 소프트웨어가 없어 맞춤 개발이 더 적합합니다."
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
    fitReason: "상위 후보가 핵심 요구를 충족하여 기존 소프트웨어 도입이 적합합니다."
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
