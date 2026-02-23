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

// ── 한국어 → 영어 태그/역할 매핑 ──
const KO_TO_EN_TAGS: Record<string, string[]> = {
  // 목표
  "반복 작업 자동화": ["automation", "workflow"],
  "업무 자동화": ["automation", "workflow"],
  "고객 응답 속도 개선": ["support", "live-chat", "crm"],
  "응답시간 단축": ["support", "live-chat"],
  "매출/전환율 높이기": ["crm", "pipeline", "email-marketing", "retention"],
  "매출 전환율 개선": ["crm", "pipeline", "email-marketing"],
  "팀 협업 개선": ["collaboration", "tasks"],
  "팀 협업": ["collaboration"],
  "데이터 한눈에 보기": ["analytics", "dashboard", "bi", "database"],
  "데이터 분석 강화": ["analytics", "product-analytics", "bi"],
  "비용 절감": ["automation", "finance", "accounting"],
  // 불편사항
  "수작업이 너무 많아요": ["automation", "workflow", "no-code"],
  "고객 문의 대응 느림": ["support", "live-chat", "helpdesk", "ticketing"],
  "협업·커뮤니케이션 누락": ["collaboration", "tasks"],
  "협업/커뮤니케이션 누락": ["collaboration", "tasks"],
  "데이터가 흩어져 있어요": ["database", "analytics", "bi", "no-code"],
  "보고서 작성 번거로움": ["dashboard", "bi", "analytics"],
  "비용 추적 어려움": ["finance", "accounting", "invoicing"],
  "채용/인사 관리 복잡": ["ats", "hiring", "recruiting"],
  "일정 조율이 힘들어요": ["scheduling", "calendar"],
};

const KO_TO_EN_ROLES: Record<string, string[]> = {
  "마케터": ["marketer", "marketing", "growth marketer", "ecommerce marketer"],
  "개발자": ["developer", "engineering manager", "startup founder"],
  "창업자/대표": ["founder", "startup founder", "smb sales"],
  "운영/기획": ["operations", "pm", "product manager", "ops"],
  "디자이너": ["designer", "product manager"],
  "기타": [],
};

const KO_TO_EN_INDUSTRY: Record<string, string[]> = {
  "이커머스": ["ecommerce", "ecommerce marketer", "retention"],
  "교육": ["education"],
  "saas (구독형 서비스)": ["saas", "product manager", "growth"],
  "saas": ["saas", "product manager"],
  "제조": ["manufacturing", "operations"],
  "유통/물류": ["operations", "logistics"],
  "금융": ["finance", "accounting"],
  "헬스케어": ["healthcare", "operations"],
};

function expandKoTerms(terms: string[]): string[] {
  const expanded: string[] = [];
  for (const term of terms) {
    expanded.push(normalize(term));
    const mapped = KO_TO_EN_TAGS[term] ?? [];
    expanded.push(...mapped.map(normalize));
  }
  return expanded;
}

function expandKoRole(jobTitle: string): string[] {
  const key = Object.keys(KO_TO_EN_ROLES).find((k) => normalize(jobTitle).includes(normalize(k)));
  return key ? [normalize(jobTitle), ...KO_TO_EN_ROLES[key]] : [normalize(jobTitle)];
}

function expandKoIndustry(industry: string): string[] {
  const key = Object.keys(KO_TO_EN_INDUSTRY).find((k) => normalize(industry).includes(normalize(k)));
  return key ? [normalize(industry), ...KO_TO_EN_INDUSTRY[key]] : [normalize(industry)];
}

function tokenizeProfile(profile: ProfileInput): string[] {
  return [
    profile.jobTitle,
    profile.industry,
    ...profile.goals,
    ...profile.painPoints,
    ...profile.currentTools,
    ...expandKoRole(profile.jobTitle),
    ...expandKoIndustry(profile.industry),
    ...expandKoTerms(profile.goals),
    ...expandKoTerms(profile.painPoints),
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
  // 한국어 → 영어 확장 포함한 신호들
  const expandedRoles = expandKoRole(profile.jobTitle);
  const expandedIndustryTokens = expandKoIndustry(profile.industry);
  const expandedGoalTags = expandKoTerms(profile.goals);
  const expandedPainTags = expandKoTerms(profile.painPoints);
  const profileTokens = tokenizeProfile(profile);

  const scored = catalog.map((item) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. 직무 매칭 (한국어+영어 확장 포함)
    const roleMatches = item.target_roles.filter((role) => {
      const roleTokens = role.toLowerCase().split(" ");
      return expandedRoles.some((signal) =>
        roleTokens.some((token) => signal.includes(token) || token.includes(signal))
      );
    });
    if (roleMatches.length > 0) {
      const roleScore = Math.min(30, 12 + roleMatches.length * 8);
      score += roleScore;
      reasons.push(`직무 적합성 ${roleScore}점`);
    }

    // 2. 태그 매칭 (한국어→영어 변환 포함)
    const allExpandedTerms = [...expandedGoalTags, ...expandedPainTags];
    const tagMatchCount = item.tags.filter((tag) =>
      allExpandedTerms.includes(normalize(tag))
    ).length;
    if (tagMatchCount > 0) {
      const tagScore = Math.min(35, tagMatchCount * 9);
      score += tagScore;
      reasons.push(`태그 매칭 ${tagScore}점`);
    }

    // 3. 카테고리 매칭
    const categoryHit = includesAny(item.category.toLowerCase(), profileTokens);
    if (categoryHit) {
      score += 10;
      reasons.push("카테고리 매칭 10점");
    }

    // 4. 업종 매칭
    const industryHit = expandedIndustryTokens.some(
      (token) => item.description.toLowerCase().includes(token) || item.tags.some((t) => normalize(t).includes(token))
    );
    if (industryHit) {
      score += 8;
      reasons.push("업종 매칭 8점");
    }

    // 5. 예산 적합성
    const budget = profile.budgetPreference.toLowerCase();
    const pricing = (item.pricing_model ?? "").toLowerCase();
    if ((budget.includes("무료") || budget.includes("free")) && pricing.includes("free")) {
      score += 7;
      reasons.push("예산 적합 7점");
    }
    if ((budget.includes("50만원 이상") || budget.includes("투자")) && pricing.includes("enterprise")) {
      score += 6;
      reasons.push("고급 플랜 적합 6점");
    }

    // 6. 팀 규모 적합성
    if (profile.teamSize >= 20 && item.tags.some((tag) => normalize(tag).includes("collaboration"))) {
      score += 6;
      reasons.push("팀 협업 확장성 6점");
    }
    if (profile.teamSize <= 3 && item.tags.some((tag) => ["kanban", "no-code", "scheduling"].includes(normalize(tag)))) {
      score += 5;
      reasons.push("소규모 팀 적합 5점");
    }

    return { item, score, reasons };
  });

  // 점수 내림차순 정렬. 동점이면 태그 많은 항목 우선, 그 이후는 무작위 섞기 (항상 같은 알파벳 순 방지)
  const shuffled = scored.sort(() => Math.random() - 0.5); // 먼저 랜덤 섞기
  return shuffled.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.tags.length - a.item.tags.length; // 태그 더 많은 항목 우선
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
