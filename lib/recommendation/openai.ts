
import OpenAI from "openai";
import { z } from "zod";
import type { ProfileInput, RecommendationItem } from "@/lib/types";
import type { ScoredCandidate } from "@/lib/recommendation/scoring";

const aiResponseSchema = z.object({
  items: z.array(
    z.object({
      softwareId: z.string().optional(),
      name: z.string().optional(),
      whyRecommended: z.string(),
      keyFeatures: z.array(z.string()).min(3).max(5),
      pros: z.array(z.string()).min(1).max(5),
      cautions: z.array(z.string()).min(1).max(5),
      solvable: z.boolean()
    })
  )
});

type AiItem = z.infer<typeof aiResponseSchema>["items"][number];

type CompletionUsage = {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
};

type ProblemTypeCode = "A" | "B" | "C" | "D" | "E";
type NeedLevel = "low" | "medium" | "high";

type ProblemTypingItem = {
  code: ProblemTypeCode;
  title: string;
  rationale: string;
};

type GapMatrixItem = {
  item: string;
  need_level: NeedLevel;
  software_coverage: number;
  gap: number;
};

type StructuralCheckItem = {
  question: string;
  yes: boolean;
  reason: string;
};

export interface CustomBuildFramework {
  problem_typing: ProblemTypingItem[];
  capability_gap_matrix: GapMatrixItem[];
  structural_constraint_test: {
    checks: StructuralCheckItem[];
    yes_count: number;
    has_structural_limit: boolean;
  };
  roi_return_threshold: {
    weekly_hours_wasted: number;
    monthly_hours_wasted: number;
    hourly_value_krw: number;
    monthly_loss_krw: number;
    estimated_custom_build_cost_krw: number;
    payback_months: number;
    roi_turns_within_6_months: boolean;
  };
  final_decision: {
    custom_build: boolean;
    reason: string;
  };
}

export interface FitAnalysis {
  user_identity: string;
  core_bottlenecks: Array<{
    title: string;
    analysis: string;
    impact: string;
  }>;
  solution_direction: {
    can_existing_software_solve: boolean;
    reason: string;
    recommended_features_if_custom: string[];
    recommended_features_structured?: Array<{
      name: string;
      description: string;
      whyNeeded: string;
    }>;
  };
  custom_build_framework: CustomBuildFramework;
  confidence_level: "low" | "medium" | "high";
  proactiveInsights?: Array<{
    problem: string;
    reasoning: string;
    swSolution: string;
  }>;
}

const customBuildFrameworkSchema: z.ZodType<CustomBuildFramework> = z.object({
  problem_typing: z.array(
    z.object({
      code: z.enum(["A", "B", "C", "D", "E"]),
      title: z.string(),
      rationale: z.string()
    })
  ),
  capability_gap_matrix: z.array(
    z.object({
      item: z.string(),
      need_level: z.enum(["low", "medium", "high"]),
      software_coverage: z.coerce.number().min(0).max(100),
      gap: z.coerce.number().min(0).max(100)
    })
  ),
  structural_constraint_test: z.object({
    checks: z.array(
      z.object({
        question: z.string(),
        yes: z.boolean(),
        reason: z.string()
      })
    ),
    yes_count: z.coerce.number().min(0).max(5),
    has_structural_limit: z.boolean()
  }),
  roi_return_threshold: z.object({
    weekly_hours_wasted: z.coerce.number().min(0),
    monthly_hours_wasted: z.coerce.number().min(0),
    hourly_value_krw: z.coerce.number().min(0),
    monthly_loss_krw: z.coerce.number().min(0),
    estimated_custom_build_cost_krw: z.coerce.number().min(0),
    payback_months: z.coerce.number().min(0),
    roi_turns_within_6_months: z.boolean()
  }),
  final_decision: z.object({
    custom_build: z.boolean(),
    reason: z.string()
  })
});

const fitAnalysisSchema = z.object({
  user_identity: z.string(),
  core_bottlenecks: z.array(
    z.object({
      title: z.string(),
      analysis: z.string(),
      impact: z.string()
    })
  ),
  solution_direction: z.object({
    can_existing_software_solve: z.boolean(),
    reason: z.string(),
    recommended_features_if_custom: z.array(z.string()),
    recommended_features_structured: z.array(z.object({
      name: z.string(),
      description: z.string(),
      whyNeeded: z.string()
    })).optional()
  }),
  custom_build_framework: customBuildFrameworkSchema,
  confidence_level: z.enum(["low", "medium", "high"]),
  proactiveInsights: z
    .array(
      z.object({
        problem: z.string(),
        reasoning: z.string(),
        swSolution: z.string()
      })
    )
    .optional()
});

const FIT_ANALYSIS_MODEL = "gpt-5";
const FIT_ANALYSIS_STRUCTURING_MODEL = "gpt-5-mini";
const RECOMMENDATION_FORMAT_MODEL =
  process.env.OPENAI_RECOMMENDATION_FORMAT_MODEL ?? "gpt-5-mini";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-openai-api-key")) {
    return null;
  }
  return new OpenAI({ apiKey });
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

const PROFILE_CONTEXT_STOPWORDS = new Set([
  "업무",
  "담당",
  "직무",
  "업종",
  "산업",
  "관리",
  "운영",
  "팀",
  "실무",
  "회사",
  "서비스",
  "분야",
  "담당자",
  "직원",
  "대표",
  "창업",
  "마케팅",
  "기획",
  "개발",
  "영업"
]);

function extractContextTokens(value: string): string[] {
  return uniqueNonEmpty(
    tokenize(value).filter((token) => token.length > 1 && !PROFILE_CONTEXT_STOPWORDS.has(token))
  );
}

function hasProfileContext(text: string, profile: ProfileInput): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;

  const jobTokens = extractContextTokens(profile.jobTitle);
  const industryTokens = extractContextTokens(profile.industry);

  const jobMatched =
    jobTokens.length === 0 || jobTokens.some((token) => normalized.includes(token));
  const industryMatched =
    industryTokens.length === 0 || industryTokens.some((token) => normalized.includes(token));

  return jobMatched && industryMatched;
}

function buildProfileContextLine(profile: ProfileInput): string {
  const job = profile.jobTitle?.trim() || "현재 직무";
  const industry = profile.industry?.trim() || "현재 업종";
  return `${job} 직무와 ${industry} 업종의 실제 업무 흐름을 기준으로 보면`;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter((token) => token.length > 1);
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => v.length > 0))];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function containsAny(text: string, keywords: string[]): boolean {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function logStageTokenUsage(stage: string, usage: CompletionUsage | null | undefined): void {
  if (!usage) return;

  console.info("[generateFitAnalysis] token usage", {
    stage,
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0
  });
}

function buildFallbackWhyRecommended(candidate: ScoredCandidate, profile: ProfileInput): string {
  const job = profile.jobTitle || "실무자";
  const candidateText = normalize(
    `${candidate.item.tags.join(" ")} ${candidate.item.key_features.join(" ")} ${candidate.item.description ?? ""}`
  );

  // 가장 잘 매칭되는 불편사항 찾기
  let matchedPain: string | null = null;
  let bestScore = 0;
  for (const pain of profile.painPoints) {
    const score = tokenize(pain).filter((token) => candidateText.includes(token)).length;
    if (score > bestScore) {
      bestScore = score;
      matchedPain = pain;
    }
  }
  if (!matchedPain) matchedPain = profile.painPoints[0] ?? null;

  const featureSample = candidate.item.key_features.slice(0, 2).join("·") || candidate.item.category;
  const currentToolsNote =
    profile.currentTools.length > 0 && !profile.currentTools.includes("없음")
      ? `현재 ${profile.currentTools.slice(0, 2).join(", ")} 환경에서 전환하거나 연결해 사용할 수 있습니다.`
      : "";

  if (matchedPain) {
    return `${job} 업무에서 "${matchedPain}"를 개선하는 데 ${candidate.item.name}의 ${featureSample} 기능이 직접 활용될 수 있습니다. ${currentToolsNote}`.trim();
  }

  return `${job} 직무의 ${candidate.item.category} 업무에서 ${candidate.item.name}의 ${featureSample} 기능을 활용할 수 있습니다. ${currentToolsNote}`.trim();
}

function fallbackNarrative(candidate: ScoredCandidate, profile?: ProfileInput | null): RecommendationItem {
  const whyRecommended = profile
    ? buildFallbackWhyRecommended(candidate, profile)
    : `프로필과 매칭 신호(${candidate.reasons.join(", ")})를 기준으로 우선 검토할 가치가 있습니다.`;

  return {
    softwareId: candidate.item.id,
    name: candidate.item.name,
    whyRecommended,
    keyFeatures: candidate.item.key_features.slice(0, 5),
    pros:
      candidate.item.pros_template.length > 0
        ? candidate.item.pros_template.slice(0, 3)
        : ["도입이 빠르고 초기 운영 리스크가 낮습니다."],
    cautions:
      candidate.item.cons_template.length > 0
        ? candidate.item.cons_template.slice(0, 3)
        : ["세부 업무 흐름에 따라 추가 설정이나 프로세스 정리가 필요할 수 있습니다."],
    solvable: candidate.score >= 40,
    score: candidate.score
  };
}

function extractCriticalPainTokens(profile: ProfileInput): string[] {
  const base = [profile.mainPainDetail ?? "", ...profile.painPoints].join(" ");
  const stopWords = new Set([
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
    "기능",
    "도구",
    "서비스",
    "시스템",
    "회사",
    "팀",
    "상황",
    "방식",
    "도입",
    "운영"
  ]);

  return uniqueNonEmpty(tokenize(base).filter((token) => token.length > 1 && !stopWords.has(token)));
}

function isLikelyOffTopicRecommendation(
  profile: ProfileInput,
  candidate: ScoredCandidate,
  aiItem: AiItem | null
): boolean {
  if (!profile.mainPainDetail?.trim()) return false;

  const criticalTokens = extractCriticalPainTokens(profile);
  if (criticalTokens.length < 3) return false;

  const aiText = aiItem
    ? `${aiItem.whyRecommended} ${aiItem.keyFeatures.join(" ")} ${aiItem.pros.join(" ")} ${aiItem.cautions.join(" ")}`
    : "";

  const candidateText = `${candidate.item.name} ${candidate.item.category} ${candidate.item.tags.join(" ")} ${candidate.item.key_features.join(" ")} ${candidate.item.description ?? ""}`;
  const reference = normalize(`${candidateText} ${aiText}`);
  const hitCount = criticalTokens.filter((token) => reference.includes(token)).length;

  return hitCount === 0 || (criticalTokens.length >= 6 && hitCount <= 1);
}

function alignAiItems(candidates: ScoredCandidate[], aiItems: AiItem[]): Array<AiItem | null> {
  const aligned: Array<AiItem | null> = new Array(candidates.length).fill(null);

  aiItems.forEach((aiItem, aiIndex) => {
    let index = -1;

    if (aiItem.softwareId) {
      index = candidates.findIndex((candidate) => candidate.item.id === aiItem.softwareId);
    }

    if (index === -1 && aiItem.name) {
      index = candidates.findIndex(
        (candidate) => normalize(candidate.item.name) === normalize(aiItem.name as string)
      );
    }

    if (index === -1 && aiIndex < candidates.length) {
      index = aiIndex;
    }

    if (index !== -1 && !aligned[index]) {
      aligned[index] = aiItem;
    }
  });

  return aligned;
}

function mergeAiWithCandidates(
  candidates: ScoredCandidate[],
  aiItems: z.infer<typeof aiResponseSchema>["items"],
  profile: ProfileInput
): RecommendationItem[] {
  const top3 = candidates.slice(0, 3);
  const aligned = alignAiItems(top3, aiItems);

  return top3.map((candidate, index) => {
    const aiItem = aligned[index];
    const offTopic = aiItem ? isLikelyOffTopicRecommendation(profile, candidate, aiItem) : false;
    if (!aiItem || offTopic) {
      const fallback = fallbackNarrative(candidate, profile);
      const detail = profile.mainPainDetail?.trim();

      if (detail && offTopic) {
        return {
          ...fallback,
          solvable: false,
          cautions: [
            `핵심 불편 상세("${detail.slice(0, 40)}${detail.length > 40 ? "..." : ""}")와 직접 연결되는 기능 근거가 부족합니다.`,
            ...fallback.cautions
          ].slice(0, 4)
        };
      }

      return fallback;
    }

    return {
      softwareId: candidate.item.id,
      name: candidate.item.name,
      whyRecommended: aiItem.whyRecommended,
      keyFeatures: aiItem.keyFeatures,
      pros: aiItem.pros,
      cautions: aiItem.cautions,
      solvable: aiItem.solvable,
      score: candidate.score
    };
  });
}
function buildCandidateContext(topCandidates: ScoredCandidate[]): string {
  return topCandidates
    .slice(0, 3)
    .map((candidate, index) => {
      const features = candidate.item.key_features.slice(0, 5).join(", ") || "(없음)";
      const tags = candidate.item.tags.slice(0, 6).join(", ") || "(없음)";
      const reasons = candidate.reasons.join(", ") || "(없음)";
      return [
        `- 후보 ${index + 1}: ${candidate.item.name}`,
        `  - 카테고리: ${candidate.item.category}`,
        `  - 핵심 기능: ${features}`,
        `  - 태그: ${tags}`,
        `  - 매칭 근거: ${reasons}`
      ].join("\n");
    })
    .join("\n");
}

function buildTopItemContext(topItems: RecommendationItem[]): string {
  return topItems
    .slice(0, 3)
    .map((item, index) => {
      const features = item.keyFeatures.slice(0, 5).join(", ") || "(없음)";
      return `- 추천 ${index + 1}: ${item.name} | 핵심 기능: ${features} | 해결 가능성: ${item.solvable}`;
    })
    .join("\n");
}

function inferNeedLevel(text: string): NeedLevel {
  const highSignals = ["자동", "연동", "api", "보안", "내부", "정산", "데이터", "승인"];
  if (containsAny(text, highSignals)) return "high";

  const lowSignals = ["보고", "리포트", "조회", "알림"];
  if (containsAny(text, lowSignals)) return "low";

  return "medium";
}

type RequirementSeed = {
  item: string;
  need_level: NeedLevel;
  context: string;
};

function buildRequirementSeeds(profile: ProfileInput): RequirementSeed[] {
  const seeds: RequirementSeed[] = [];

  profile.painPoints.slice(0, 3).forEach((pain) => {
    seeds.push({
      item: `${pain} 해결 기능`,
      need_level: inferNeedLevel(pain),
      context: pain
    });
  });

  profile.goals.slice(0, 2).forEach((goal) => {
    seeds.push({
      item: `${goal} 달성 기능`,
      need_level: inferNeedLevel(goal),
      context: goal
    });
  });

  if (seeds.length < 3) {
    seeds.push(
      {
        item: "반복 업무 자동화 기능",
        need_level: "high",
        context: "반복 업무"
      },
      {
        item: "업무 상태 가시화 기능",
        need_level: "medium",
        context: "진행 상태 추적"
      },
      {
        item: "데이터 통합 리포트 기능",
        need_level: "medium",
        context: "보고 자동화"
      }
    );
  }

  const seen = new Set<string>();
  return seeds
    .filter((seed) => {
      const key = normalize(seed.item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function estimateCoverageForRequirement(requirement: RequirementSeed, items: RecommendationItem[]): number {
  const reqTokens = tokenize(requirement.item);

  const coverages = items.map((item) => {
    const itemText = normalize(
      `${item.whyRecommended} ${item.keyFeatures.join(" ")} ${item.pros.join(" ")} ${item.cautions.join(" ")}`
    );

    const tokenMatch = reqTokens.filter((token) => itemText.includes(token)).length;
    const base = item.score * 0.65 + (item.solvable ? 18 : 6) + tokenMatch * 10;

    const levelPenalty =
      requirement.need_level === "high" ? 10 : requirement.need_level === "medium" ? 5 : 0;
    return clamp(Math.round(base - levelPenalty), 5, 95);
  });

  return coverages.length > 0 ? Math.max(...coverages) : 10;
}

function estimateCustomBuildCost(profile: ProfileInput, gapAverage: number): number {
  const budget = normalize(profile.budgetPreference || "");
  let base = 1500000;

  if (budget.includes("무료") || budget.includes("무예산") || budget.includes("10만원 이하")) {
    base = 900000;
  } else if (budget.includes("10~50")) {
    base = 1800000;
  } else if (budget.includes("50") || budget.includes("외주") || budget.includes("개발")) {
    base = 3000000;
  }

  if (gapAverage >= 65) {
    base += 600000;
  }

  return Math.round(base / 100000) * 100000;
}

function buildProblemTyping(params: {
  profile: ProfileInput;
  gapAverage: number;
  workflowChange: boolean;
  manualRemaining: boolean;
  noCodeHard: boolean;
  apiLimit: boolean;
  hasSecurityNeed: boolean;
}): ProblemTypingItem[] {
  const { profile, gapAverage, workflowChange, manualRemaining, noCodeHard, apiLimit, hasSecurityNeed } =
    params;

  const scores: Record<ProblemTypeCode, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0
  };

  if (gapAverage < 45 && !workflowChange && !noCodeHard) scores.A += 2;
  if (workflowChange || manualRemaining) scores.B += 3;

  const dataSpecific = containsAny(
    `${profile.industry} ${profile.painPoints.join(" ")} ${profile.goals.join(" ")}`,
    ["데이터", "정산", "재고", "리포트", "출처", "통합", "분석"]
  );
  if (dataSpecific) scores.C += 2;

  const automationDemand = containsAny(
    `${profile.painPoints.join(" ")} ${profile.goals.join(" ")}`,
    ["자동", "연동", "api", "플랫폼", "크로스"]
  );
  if (automationDemand || noCodeHard || apiLimit) scores.D += 3;

  if (hasSecurityNeed) scores.E += 3;

  const rationaleMap: Record<ProblemTypeCode, ProblemTypingItem> = {
    A: {
      code: "A",
      title: "단순 기능 부족",
      rationale: `${profile.jobTitle || "사용자"} 업무에서 필요한 기능 자체는 시중 도구에 존재하지만, 설정/활용 방식 부족으로 효과를 충분히 못 내는 상태입니다.`
    },
    B: {
      code: "B",
      title: "워크플로우 불일치",
      rationale: "현재 업무 흐름과 도구의 기본 구조가 맞지 않아, 도구를 맞추기 위해 업무 절차를 바꾸거나 우회 작업이 발생하고 있습니다."
    },
    C: {
      code: "C",
      title: "데이터 구조 특수성",
      rationale: "데이터 출처와 연결 방식이 표준 템플릿과 달라서, 단일 SaaS만으로는 누락 없이 관리하기 어려운 구간이 보입니다."
    },
    D: {
      code: "D",
      title: "자동화 수준 요구 높음",
      rationale: "반복 작업을 줄이려면 API/크로스툴 연동 수준의 자동화가 필요해, 단순 설정만으로는 목표 수준에 도달하기 어렵습니다."
    },
    E: {
      code: "E",
      title: "보안/내부화 요구",
      rationale: "데이터 보안과 내부 통제 요구가 있어 외부 SaaS 의존을 줄이거나 권한/감사 추적을 강화해야 하는 조건입니다."
    }
  };

  const sorted = (Object.entries(scores) as Array<[ProblemTypeCode, number]>)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => rationaleMap[code]);

  if (sorted.length === 0) {
    return [rationaleMap.A];
  }

  return sorted.slice(0, 3);
}

function buildFinalDecisionReason(
  gapAverage: number,
  yesCount: number,
  paybackMonths: number,
  customBuild: boolean
): string {
  if (customBuild) {
    return `기능 Gap 평균 ${gapAverage}%이고 구조적 제약 YES가 ${yesCount}개이며, ROI 회수 예상 ${paybackMonths}개월입니다. 기준( Gap>50% OR 제약 YES>=3 OR 회수<6개월 )을 충족해 맞춤 개발을 권장합니다.`;
  }

  return `기능 Gap 평균 ${gapAverage}%이며 구조적 제약 YES ${yesCount}개, ROI 회수 예상 ${paybackMonths}개월로 분석되었습니다. 기준을 넘지 않아 기존 소프트웨어 우선 도입 후 보완하는 접근이 적합합니다.`;
}
function evaluateCustomBuildFramework(
  profile: ProfileInput,
  topItems: RecommendationItem[]
): CustomBuildFramework {
  const requirementSeeds = buildRequirementSeeds(profile);

  const capabilityGapMatrix: GapMatrixItem[] = requirementSeeds.map((seed) => {
    const coverage = estimateCoverageForRequirement(seed, topItems);
    return {
      item: seed.item,
      need_level: seed.need_level,
      software_coverage: coverage,
      gap: clamp(100 - coverage, 0, 100)
    };
  });

  const gapAverage = round1(average(capabilityGapMatrix.map((item) => item.gap)));
  const profileText = `${profile.jobTitle} ${profile.industry} ${profile.painPoints.join(" ")} ${profile.goals.join(" ")}`;
  const activeTools = profile.currentTools.filter((tool) => !["없음", "none"].includes(normalize(tool)));

  const workflowChange =
    gapAverage >= 45 ||
    containsAny(profileText, ["흐름", "프로세스", "승인", "핸드오프", "협업", "단계"]);

  const manualRemaining =
    containsAny(profileText, ["수작업", "반복", "누락", "복붙", "정리", "수동"]) ||
    capabilityGapMatrix.some((row) => row.gap >= 55);

  const multiToolWiring = activeTools.length >= 2;

  const noCodeHard =
    capabilityGapMatrix.some((row) => row.need_level === "high" && row.gap >= 60) ||
    (multiToolWiring && gapAverage >= 50);

  const hasSecurityNeed = containsAny(profileText, [
    "보안",
    "개인정보",
    "내부",
    "권한",
    "감사",
    "금융",
    "의료",
    "법률",
    "공공"
  ]);

  const apiLimit =
    containsAny(profileText, ["api", "연동", "통합", "크로스", "플랫폼"]) &&
    capabilityGapMatrix.some((row) => row.gap >= 50);

  const checks: StructuralCheckItem[] = [
    {
      question: "기존 SW를 쓰려면 워크플로우를 바꿔야 하는가?",
      yes: workflowChange,
      reason: workflowChange
        ? "현재 업무 흐름과 도구 기본 구조의 정렬 비용이 큽니다."
        : "기존 도구의 기본 흐름과 현재 업무가 크게 충돌하지 않습니다."
    },
    {
      question: "수작업이 계속 남는가?",
      yes: manualRemaining,
      reason: manualRemaining
        ? "반복/정리/확인성 작업이 자동화되지 않은 구간이 남아 있습니다."
        : "주요 작업은 자동화 또는 템플릿화가 가능한 수준입니다."
    },
    {
      question: "2개 이상 툴을 이어붙여야 하는가?",
      yes: multiToolWiring,
      reason: multiToolWiring
        ? `현재 사용 도구(${activeTools.join(", ")}) 간 연결/동기화가 필요합니다.`
        : "단일 도구 또는 단순 조합으로 운영 가능합니다."
    },
    {
      question: "Zapier/노코드로도 해결이 어려운가?",
      yes: noCodeHard,
      reason: noCodeHard
        ? "요구 기능의 Gap이 커서 단순 노코드 연결로는 안정적 해결이 어렵습니다."
        : "노코드 구성으로 1차 완화가 가능한 영역이 있습니다."
    },
    {
      question: "핵심 기능이 API에 없거나 제한적인가?",
      yes: apiLimit,
      reason: apiLimit
        ? "핵심 연동 구간에서 API 제약/부재 가능성이 높습니다."
        : "API 기반 연동으로 해결 가능한 여지가 있습니다."
    }
  ];

  const yesCount = checks.filter((check) => check.yes).length;
  const hasStructuralLimit = yesCount >= 3;

  const problemTyping = buildProblemTyping({
    profile,
    gapAverage,
    workflowChange,
    manualRemaining,
    noCodeHard,
    apiLimit,
    hasSecurityNeed
  });

  const weeklyHoursWasted = round1(
    clamp(2 + profile.painPoints.length * 1.2 + yesCount * 0.8 + gapAverage / 25, 2, 24)
  );
  const monthlyHoursWasted = round1(weeklyHoursWasted * 4);
  const hourlyValueKrw = 30000;
  const monthlyLossKrw = Math.round(monthlyHoursWasted * hourlyValueKrw);
  const estimatedCustomBuildCostKrw = estimateCustomBuildCost(profile, gapAverage);
  const paybackMonths = round2(monthlyLossKrw > 0 ? estimatedCustomBuildCostKrw / monthlyLossKrw : 12);
  const roiTurnsWithin6Months = paybackMonths < 6;

  const customBuild = gapAverage > 50 || yesCount >= 3 || paybackMonths < 6;

  return {
    problem_typing: problemTyping,
    capability_gap_matrix: capabilityGapMatrix,
    structural_constraint_test: {
      checks,
      yes_count: yesCount,
      has_structural_limit: hasStructuralLimit
    },
    roi_return_threshold: {
      weekly_hours_wasted: weeklyHoursWasted,
      monthly_hours_wasted: monthlyHoursWasted,
      hourly_value_krw: hourlyValueKrw,
      monthly_loss_krw: monthlyLossKrw,
      estimated_custom_build_cost_krw: estimatedCustomBuildCostKrw,
      payback_months: paybackMonths,
      roi_turns_within_6_months: roiTurnsWithin6Months
    },
    final_decision: {
      custom_build: customBuild,
      reason: buildFinalDecisionReason(gapAverage, yesCount, paybackMonths, customBuild)
    }
  };
}

function buildRecommendedFeatureNarratives(
  profile: ProfileInput,
  framework: CustomBuildFramework
): string[] {
  const topGaps = [...framework.capability_gap_matrix].sort((a, b) => b.gap - a.gap).slice(0, 3);

  const featureLines = topGaps.map((gapItem, index) => {
    const targetGoal = profile.goals[index] ?? profile.goals[0] ?? "업무 안정화";
    const relatedPain = profile.painPoints[index] ?? profile.painPoints[0] ?? "반복적인 운영 부담";

    return `${gapItem.item}이 필요합니다. 현재 "${relatedPain}" 문제를 줄이기 위해 ${profile.jobTitle || "실무"} 흐름에 맞춘 처리 규칙과 자동화를 넣어야 하며, 이렇게 설계하면 "${targetGoal}" 목표 달성 속도를 높일 수 있습니다.`;
  });

  const extraFeature =
    "추가로, 당장 불편이 크지 않더라도 사용자별 리포트/이상 징후 알림 기능을 함께 넣으면 업무 확장 시 관리 비용을 크게 줄일 수 있습니다.";

  return uniqueNonEmpty([...featureLines, extraFeature]).slice(0, 5);
}

function buildSolutionReasonFromFramework(framework: CustomBuildFramework): string {
  const gapAverage = round1(average(framework.capability_gap_matrix.map((item) => item.gap)));
  const typeSummary = framework.problem_typing.map((type) => `${type.code}.${type.title}`).join(", ");
  const yesCount = framework.structural_constraint_test.yes_count;
  const payback = framework.roi_return_threshold.payback_months;

  if (framework.final_decision.custom_build) {
    return `문제 유형은 ${typeSummary}로 분류됩니다. Capability Gap 평균이 ${gapAverage}%이고 구조적 제약 YES가 ${yesCount}개이며 ROI 회수 예상이 ${payback}개월로 계산되어, 맞춤 개발이 더 현실적인 선택입니다.`;
  }

  return `문제 유형은 ${typeSummary}로 분류되며, Capability Gap 평균 ${gapAverage}%, 구조적 제약 YES ${yesCount}개, ROI 회수 예상 ${payback}개월입니다. 현재는 기존 소프트웨어 우선 도입 후 부족한 구간을 점진 보완하는 전략이 적합합니다.`;
}

function buildDeterministicProactiveInsights(
  profile: ProfileInput
): FitAnalysis["proactiveInsights"] {
  const insights: NonNullable<FitAnalysis["proactiveInsights"]> = [];
  const profileText = normalize(
    `${profile.jobTitle} ${profile.industry} ${profile.painPoints.join(" ")} ${profile.goals.join(" ")}`
  );
  const statedPains = normalize(profile.painPoints.join(" "));

  // 수작업 자동화 — 언급 안 한 경우
  if (!statedPains.includes("자동") && !statedPains.includes("반복")) {
    insights.push({
      problem: "반복 업무 자동화 공백",
      reasoning: `${profile.jobTitle || "실무자"} 업무에서는 보고서 취합, 데이터 정리, 알림 발송 등 주기적 반복 작업이 많습니다. 현재 도구(${profile.currentTools.join(", ") || "기존 도구"})만으로는 이 흐름이 수동으로 남아있을 가능성이 있습니다.`,
      swSolution:
        "Zapier, Make(구 Integromat) 같은 자동화 도구를 연결하면 반복 업무를 트리거 기반으로 처리해 시간을 절약할 수 있습니다."
    });
  }

  // 데이터 흩어짐 — 언급 안 한 경우
  if (!statedPains.includes("데이터") && !statedPains.includes("흩어") && profile.currentTools.length >= 2) {
    insights.push({
      problem: "여러 도구 간 데이터 파편화",
      reasoning: `현재 ${profile.currentTools.join(", ")} 등 여러 도구를 함께 사용 중이라면, 정보가 각 앱에 분산되어 한 곳에서 현황을 보기 어려울 가능성이 있습니다.`,
      swSolution:
        "Notion이나 Airtable처럼 데이터베이스 기반 도구를 허브로 두면 흩어진 정보를 한 곳에서 관리하고 조회할 수 있습니다."
    });
  }

  // 협업/커뮤니케이션 누락 — 팀 규모가 있는 경우
  if (
    profile.teamSize >= 3 &&
    !statedPains.includes("협업") &&
    !statedPains.includes("커뮤니케이션") &&
    !statedPains.includes("누락")
  ) {
    insights.push({
      problem: "팀 내 업무 현황 가시성 부족",
      reasoning: `${profile.teamSize}명 팀에서는 누가 무엇을 언제 했는지 추적하기가 어려워, 확인을 위한 메신저나 회의가 반복될 수 있습니다.`,
      swSolution:
        "Notion, Jira, Asana 같은 업무 관리 도구를 도입하면 현황을 실시간으로 공유하고 불필요한 상태 확인을 줄일 수 있습니다."
    });
  }

  // 고객 관련 업무 — 업종/직무 기반
  if (
    containsAny(profileText, ["영업", "마케터", "이커머스", "고객", "crm"]) &&
    !statedPains.includes("고객") &&
    !statedPains.includes("crm")
  ) {
    insights.push({
      problem: "고객 정보 및 히스토리 관리 체계 부재",
      reasoning: `${profile.jobTitle || "업무"} 특성상 고객과의 접점이 많을 가능성이 있습니다. 고객별 상태, 연락 이력, 팔로업 일정이 정리되지 않으면 기회를 놓칠 수 있습니다.`,
      swSolution: "HubSpot Free나 Notion CRM 템플릿으로 고객 정보를 한 곳에 모아 팔로업 누락을 방지할 수 있습니다."
    });
  }

  return insights.slice(0, 3);
}

function buildPainAnalysis(
  pain: string,
  index: number,
  jobTitle: string,
  toolsText: string,
  goals: string[]
): { analysis: string; impact: string } {
  const painLower = normalize(pain);
  const job = jobTitle || "실무자";
  const goal = goals[index] ?? goals[0] ?? "업무 안정화";

  if (containsAny(painLower, ["수작업", "반복", "수동", "일일이", "하나씩", "매번"])) {
    return {
      analysis: `"${pain}" 문제는 ${job} 업무에서 자주 나타나는 운영 비효율입니다. ${toolsText} 환경에서는 데이터 입력·정리·확인이 모두 사람 손을 거쳐야 해서 실수가 쌓이고, 같은 작업을 반복하는 데 쓰는 시간이 점점 늘어납니다.`,
      impact: `이 반복 작업이 줄어들지 않으면 "${goal}" 달성에 투입해야 할 시간과 에너지가 계속 소모됩니다.`
    };
  }
  if (containsAny(painLower, ["집중", "집중도", "산만", "방해", "주의"])) {
    return {
      analysis: `${job} 입장에서 "${pain}"은 의지나 방법의 문제가 아닌 환경·구조 문제입니다. ${toolsText} 기반에서는 주의를 분산시키는 요소를 차단하거나 몰입 흐름을 지원하는 기능이 갖춰져 있지 않을 가능성이 있습니다.`,
      impact: `집중도 문제가 지속되면 수업·업무 품질이 낮아지고, "${goal}"을 위한 의미 있는 시간 확보가 어려워집니다.`
    };
  }
  if (containsAny(painLower, ["비용", "예산", "돈", "절약", "가격", "수익"])) {
    return {
      analysis: `"${pain}" 이슈는 ${job} 업무에서 수익성과 직결됩니다. ${toolsText} 기반에서는 비용 발생 시점과 규모를 실시간으로 파악하기 어려워 의사결정이 지연되는 경향이 있습니다.`,
      impact: `비용 가시성이 낮으면 불필요한 지출이 쌓이고, "${goal}" 목표를 위한 예산 배분도 어려워집니다.`
    };
  }
  if (containsAny(painLower, ["협업", "공유", "전달", "소통", "커뮤니케이션", "팀"])) {
    return {
      analysis: `"${pain}"은 팀 전체의 실행 속도를 좌우하는 문제입니다. ${toolsText}를 사용하는 ${job} 환경에서는 정보 전달 경로가 분산되어 같은 내용을 여러 번 확인하거나 판단 근거가 되는 정보가 늦게 도달하는 경우가 많습니다.`,
      impact: `이 문제가 해소되지 않으면 확인 회의와 중복 작업이 반복되고, "${goal}" 달성 속도가 팀 전체에서 느려집니다.`
    };
  }
  if (containsAny(painLower, ["학생", "수업", "교육", "강의"])) {
    return {
      analysis: `${job}에게 "${pain}" 문제는 교육 성과와 직결되는 핵심 과제입니다. ${toolsText} 환경에서는 학생 상태를 실시간으로 파악하기 어려워 수업 흐름을 즉각 조정하기가 까다롭습니다.`,
      impact: `이 문제가 지속되면 학습 효과가 낮아지고, "${goal}"을 위한 수업 개선 방향도 잡기 어려워집니다.`
    };
  }

  // index 기반 다양한 템플릿
  const templates: Array<{ analysis: string; impact: string }> = [
    {
      analysis: `"${pain}"은 ${job} 업무 흐름에서 실행을 막는 병목으로 작동합니다. ${toolsText} 환경에서 이 문제가 반복되면, 처리 시간이 예상보다 길어지고 다른 업무로의 전환도 늦어집니다.`,
      impact: `이 병목이 쌓이면 "${goal}" 달성에 투입할 집중 시간이 줄어들고, 운영 비용 누수로 이어집니다.`
    },
    {
      analysis: `${job} 관점에서 "${pain}"은 단순 불편을 넘어 실행 속도를 방해하는 구조적 마찰입니다. 현재 ${toolsText}로는 이 마찰을 줄이는 자동화나 구조화가 충분히 갖춰져 있지 않을 가능성이 있습니다.`,
      impact: `이 마찰이 해소되지 않으면 같은 문제가 반복되고, "${goal}" 목표를 향한 실행 밀도가 낮아집니다.`
    },
    {
      analysis: `"${pain}"은 ${job} 업무에서 시간과 집중력을 조금씩 잠식하는 문제입니다. ${toolsText}를 주로 쓰는 환경에서는 이 문제를 자동화하거나 구조화하는 흐름이 없어 수동 처리에 의존하는 구간이 남아 있을 가능성이 있습니다.`,
      impact: `수동 처리 의존이 계속되면 실수율이 높아지고, "${goal}" 같은 중요 목표에 투입해야 할 에너지가 소모됩니다.`
    }
  ];

  return templates[index % templates.length];
}

type SwFeatureTemplate = {
  name: string;
  description: string;
  makeWhyNeeded: (pain: string, job: string, teamSize: number) => string;
};

function resolveSwFeatureTemplate(painLower: string, index: number, teamSize: number): SwFeatureTemplate {
  if (containsAny(painLower, ["수작업", "반복", "수동", "일일이", "매번", "정리"])) {
    return {
      name: "업무 자동화 도구",
      description:
        "반복되는 작업을 조건에 따라 자동으로 처리하는 기능입니다. Zapier, Make(구 Integromat) 같은 자동화 서비스는 코딩 없이 두 앱을 연결해 데이터 입력·알림 발송·보고서 생성 등을 사람 손 없이 실행합니다.",
      makeWhyNeeded: (pain, job) =>
        `현재 "${pain}"로 매일 시간을 소모하고 계신데, 자동화 도구를 한 번 설정해 두면 이 반복 작업이 자동으로 실행됩니다. ${job}이 핵심 업무에 더 집중할 수 있게 됩니다.`
    };
  }
  if (containsAny(painLower, ["집중", "집중도", "참여", "산만", "수업", "강의"])) {
    return {
      name: "학습 참여 관리 도구",
      description:
        "수업 중 학생 반응을 실시간으로 확인하고 참여를 유도하는 기능입니다. Kahoot!(게임형 퀴즈 도구), Mentimeter(실시간 투표·설문 도구), Google Forms 같은 서비스를 활용하면 학생들의 이해도를 즉시 파악하고 수업 흐름을 조정할 수 있습니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 문제는 강사가 혼자 전체를 관찰하기 어려운 구조에서 발생합니다. 이 도구를 쓰면 시스템이 참여 상태를 자동 집계해 ${job}이 빠르게 파악하고 대응할 수 있습니다.`
    };
  }
  if (containsAny(painLower, ["비용", "예산", "수익", "정산", "돈", "매출"])) {
    return {
      name: "비용·수익 자동 추적 기능",
      description:
        "수입과 지출을 자동으로 기록하고 카테고리별로 집계해 현황을 보여주는 기능입니다. 스프레드시트에 직접 입력하는 대신, 카드 내역 연동이나 간단한 입력만으로 월별 추이·예산 초과 알림이 자동 생성됩니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 문제는 비용 현황이 실시간으로 보이지 않아서 생깁니다. 이 기능으로 ${job}이 매번 수동 계산 없이도 현황을 즉시 파악하고 빠르게 의사결정할 수 있습니다.`
    };
  }
  if (containsAny(painLower, ["학생", "교육", "과제", "채점", "출석", "성적"])) {
    return {
      name: "학습 관리 시스템 (LMS)",
      description:
        "과제 제출·채점·출석·성적을 한 곳에서 관리하는 기능입니다. LMS(학습 관리 시스템)는 Google Classroom, Class123 같은 서비스로, 강사·학생·학부모가 각자 접속해 학습 현황을 공유할 수 있습니다.",
      makeWhyNeeded: (pain, job) =>
        `${job} 업무에서 "${pain}"으로 관리 부담이 크다면, LMS를 도입하면 학생별 기록이 자동으로 누적되어 반복 확인 작업을 크게 줄일 수 있습니다.`
    };
  }
  if (containsAny(painLower, ["협업", "공유", "소통", "전달", "팀", "커뮤니케이션"])) {
    return {
      name: "팀 협업·정보 공유 플랫폼",
      description:
        "팀원들이 같은 문서·일정·업무를 실시간으로 보고 수정할 수 있는 기능입니다. Notion(메모·데이터베이스·일정을 통합하는 협업 도구), Slack(팀 전용 메신저) 같은 플랫폼으로 이메일 대신 업무 정보를 체계적으로 관리합니다.",
      makeWhyNeeded: (pain, job, size) =>
        `"${pain}" 문제는 정보가 여러 채널에 분산될 때 발생합니다. ${size}명 팀에서 협업 플랫폼을 쓰면 모두가 같은 정보를 보고 불필요한 확인 요청을 줄일 수 있습니다.`
    };
  }
  if (containsAny(painLower, ["관리", "추적", "기록", "이력"])) {
    return {
      name: "데이터 통합 관리 기능",
      description:
        "스프레드시트·메모·메신저에 흩어진 정보를 데이터베이스(정보를 체계적으로 저장·검색·공유하는 공간)로 통합하는 기능입니다. Notion, Airtable 같은 도구로 한 곳에서 모든 정보를 관리하고 검색할 수 있습니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 문제를 줄이려면 정보가 한 곳에 있어야 합니다. 이 기능으로 ${job} 업무에서 중복 입력·분산 관리 문제를 해결할 수 있습니다.`
    };
  }

  // index 기반 범용 fallback
  const fallbacks: SwFeatureTemplate[] = [
    {
      name: "업무 현황 대시보드",
      description:
        "진행 중인 업무·완료 항목·남은 할 일을 한 화면에서 보여주는 기능입니다. 대시보드(주요 정보를 시각적으로 정리한 화면)를 통해 매번 직접 확인하지 않아도 상황을 즉시 파악할 수 있습니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 상황을 체계적으로 관리하려면 ${job}이 언제든 현황을 바로 볼 수 있는 구조가 필요합니다.`
    },
    {
      name: "자동 알림·리마인더 기능",
      description:
        "마감·이벤트·확인 필요 항목이 생기면 자동으로 알림을 보내는 기능입니다. 직접 캘린더를 확인하거나 메모를 찾지 않아도, 정해진 조건에 따라 알림이 자동 발송됩니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 상황에서 중요한 일을 놓치지 않으려면 자동 알림 시스템이 ${job}을 대신해 적시에 알려줘야 합니다.`
    },
    {
      name: "업무 자동화 도구",
      description:
        "반복 작업을 코딩 없이 자동으로 연결하는 기능입니다. Zapier, Make 같은 서비스로 조건이 충족되면 알림·데이터 이동·보고서 생성 등이 자동 실행됩니다.",
      makeWhyNeeded: (pain, job) =>
        `"${pain}" 문제를 줄이고 ${job} 업무의 핵심 활동에 집중하기 위해 반복 작업을 자동화하는 것이 필요합니다.`
    }
  ];

  return fallbacks[index % fallbacks.length];
}

function buildStructuredFeatures(
  profile: ProfileInput,
  _framework: CustomBuildFramework
): Array<{ name: string; description: string; whyNeeded: string }> {
  const pains = profile.painPoints.length > 0 ? profile.painPoints.slice(0, 3) : ["업무 효율화"];
  const usedNames = new Set<string>();
  const features: Array<{ name: string; description: string; whyNeeded: string }> = [];

  pains.forEach((pain, index) => {
    const template = resolveSwFeatureTemplate(normalize(pain), index, profile.teamSize);
    if (!usedNames.has(template.name)) {
      usedNames.add(template.name);
      features.push({
        name: template.name,
        description: template.description,
        whyNeeded: template.makeWhyNeeded(pain, profile.jobTitle || "담당자", profile.teamSize)
      });
    }
  });

  return features.slice(0, 3);
}

function buildDeterministicAnalysis(
  profile: ProfileInput,
  initialFitDecision: string,
  topItems: RecommendationItem[]
): FitAnalysis {
  const framework = evaluateCustomBuildFramework(profile, topItems);
  const customBuild = framework.final_decision.custom_build;
  const canExistingSoftwareSolve = !customBuild;

  const identityParts = [
    profile.fullName.trim(),
    profile.jobTitle.trim() ? `${profile.jobTitle.trim()} 업무 담당` : "",
    profile.industry.trim() ? `${profile.industry.trim()} 업종` : "",
    `팀 ${profile.teamSize}명`
  ].filter((part) => part.length > 0);

  const toolsText =
    profile.currentTools.length > 0 && !profile.currentTools.includes("없음")
      ? profile.currentTools.join(", ")
      : "수작업 중심 운영";

  const coreBottlenecks = profile.painPoints.slice(0, 3).map((pain, index) => {
    const { analysis, impact } = buildPainAnalysis(pain, index, profile.jobTitle, toolsText, profile.goals);
    return { title: pain, analysis, impact };
  });

  if (coreBottlenecks.length === 0) {
    coreBottlenecks.push({
      title: "문제 상황 파악 정보 부족",
      analysis: "명시된 불편사항이 적어 확정 진단은 어렵지만, 현재 입력만으로도 업무 가시성과 자동화 수준 간 격차가 보입니다.",
      impact: "이 격차가 유지되면 일정 지연과 운영 비용 누수가 누적될 가능성이 큽니다."
    });
  }

  const recommendedFeatures = buildRecommendedFeatureNarratives(profile, framework);
  const structuredFeatures = buildStructuredFeatures(profile, framework);
  const reason = buildSolutionReasonFromFramework(framework);
  const evidenceCount = profile.painPoints.length + profile.goals.length + topItems.length;

  const confidenceLevel: FitAnalysis["confidence_level"] =
    evidenceCount >= 8 ? "high" : evidenceCount >= 4 ? "medium" : "low";

  const resolvedInitialFit =
    initialFitDecision === "custom_build" || customBuild ? "custom_build" : "software_fit";

  const proactiveInsights = buildDeterministicProactiveInsights(profile);

  return {
    user_identity: identityParts.join(", ") || "반복 업무 조율 부담을 가진 운영 실무 담당자",
    core_bottlenecks: coreBottlenecks,
    solution_direction: {
      can_existing_software_solve: resolvedInitialFit === "software_fit" && canExistingSoftwareSolve,
      reason,
      recommended_features_if_custom: recommendedFeatures,
      recommended_features_structured: structuredFeatures
    },
    custom_build_framework: framework,
    confidence_level: confidenceLevel,
    proactiveInsights
  };
}

function enforceFrameworkDecision(framework: CustomBuildFramework): CustomBuildFramework {
  const gapAverage = round1(average(framework.capability_gap_matrix.map((item) => item.gap)));
  const yesCount = clamp(Math.round(framework.structural_constraint_test.yes_count), 0, 5);
  const paybackMonths = round2(framework.roi_return_threshold.payback_months);

  const customBuild = gapAverage > 50 || yesCount >= 3 || paybackMonths < 6;

  return {
    ...framework,
    structural_constraint_test: {
      ...framework.structural_constraint_test,
      yes_count: yesCount,
      has_structural_limit: yesCount >= 3
    },
    roi_return_threshold: {
      ...framework.roi_return_threshold,
      payback_months: paybackMonths,
      roi_turns_within_6_months: paybackMonths < 6
    },
    final_decision: {
      custom_build: customBuild,
      reason:
        framework.final_decision.reason.trim() ||
        buildFinalDecisionReason(gapAverage, yesCount, paybackMonths, customBuild)
    }
  };
}

function normalizeFitAnalysis(
  analysis: FitAnalysis,
  fallback: FitAnalysis,
  profile: ProfileInput
): FitAnalysis {
  const coreBottlenecks = analysis.core_bottlenecks
    .map((item) => ({
      title: item.title.trim(),
      analysis: item.analysis.trim(),
      impact: item.impact.trim()
    }))
    .filter((item) => item.title.length > 0 && (item.analysis.length > 0 || item.impact.length > 0))
    .slice(0, 3);

  const normalizedFeatures = uniqueNonEmpty(
    analysis.solution_direction.recommended_features_if_custom
  ).filter((line) => line.length >= 10);

  const framework = enforceFrameworkDecision(
    analysis.custom_build_framework ?? fallback.custom_build_framework
  );

  const contextPrefix = buildProfileContextLine(profile);
  const rawReason = analysis.solution_direction.reason.trim() || buildSolutionReasonFromFramework(framework);
  const reason = hasProfileContext(rawReason, profile)
    ? rawReason
    : `${contextPrefix} ${rawReason}`;

  const normalizedBottlenecks = (coreBottlenecks.length > 0 ? coreBottlenecks : fallback.core_bottlenecks)
    .map((item) => {
      const analysisText = item.analysis.trim();
      const impactText = item.impact.trim();
      const merged = `${analysisText} ${impactText}`.trim();

      if (hasProfileContext(merged, profile)) {
        return item;
      }

      return {
        ...item,
        analysis: `${contextPrefix} ${analysisText || "업무 병목이 반복되고 있습니다."}`.trim()
      };
    })
    .slice(0, 3);

  const rawIdentity = analysis.user_identity.trim() || fallback.user_identity;
  const userIdentity = hasProfileContext(rawIdentity, profile)
    ? rawIdentity
    : `${profile.jobTitle} 직무와 ${profile.industry} 업종 맥락에서 ${rawIdentity}`;

  const aiStructuredFeatures = analysis.solution_direction.recommended_features_structured ?? [];
  const fallbackStructuredFeatures = fallback.solution_direction.recommended_features_structured ?? [];

  return {
    user_identity: userIdentity,
    core_bottlenecks: normalizedBottlenecks,
    solution_direction: {
      can_existing_software_solve: !framework.final_decision.custom_build,
      reason,
      recommended_features_if_custom:
        normalizedFeatures.length > 0
          ? normalizedFeatures
          : fallback.solution_direction.recommended_features_if_custom,
      recommended_features_structured:
        aiStructuredFeatures.length > 0 ? aiStructuredFeatures : fallbackStructuredFeatures
    },
    custom_build_framework: framework,
    confidence_level: analysis.confidence_level,
    proactiveInsights:
      (analysis.proactiveInsights ?? []).length > 0
        ? analysis.proactiveInsights
        : fallback.proactiveInsights
  };
}
const genericAnalysisPatterns = [
  /\bfirst\b.*\bsecond\b.*\bthird\b/i,
  /\bin summary\b/i,
  /\bin conclusion\b/i,
  /\btherefore\b/i,
  /(?:\uCCAB\uC9F8).*(?:\uB458\uC9F8).*(?:\uC14B\uC9F8)/u,
  /(?:\uC694\uC57D\uD558\uBA74)/u,
  /(?:\uACB0\uB860\uC801\uC73C\uB85C)/u,
  /(?:\uB530\uB77C\uC11C)\s+.+(?:\uC785\uB2C8\uB2E4)/u
];

function needsStageOneRegeneration(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 450) return true;
  if (genericAnalysisPatterns.some((pattern) => pattern.test(trimmed))) return true;

  const checklistLines = trimmed
    .split(/\r?\n/)
    .filter((line) => /^\s*(?:[-*]|\d+\.)\s+/.test(line));

  return checklistLines.length >= 4;
}

function needsProfileContextRegeneration(text: string, profile: ProfileInput): boolean {
  return !hasProfileContext(text, profile);
}

function buildStageOnePrompt(
  profile: ProfileInput,
  fitDecision: string,
  candidateContext: string,
  topItemContext: string
): string {
  const tools = profile.currentTools.length > 0 ? profile.currentTools.join(", ") : "(없음)";
  const painPoints = profile.painPoints.length > 0 ? profile.painPoints.join(", ") : "(없음)";
  const goals = profile.goals.length > 0 ? profile.goals.join(", ") : "(없음)";
  const mainPainDetail = profile.mainPainDetail?.trim() ? profile.mainPainDetail.trim() : null;

  return `
당신은 전문 상담가처럼 사용자의 상황을 듣고 진단하는 1단계 분석 전담입니다.
반드시 한국어로 작성하고, 자연스러운 문단형 텍스트만 출력하세요.

핵심 규칙:
- JSON 출력 금지
- 억지로 반복되는 문장 구조 금지
- "첫째/둘째/셋째", "요약하면", "결론적으로", "따라서" 같은 관성 문구 금지
- 사용자의 직업/업무 특성과 문제 상황을 직접 연결해서 설명
- "가장 불편한 점(상세)"이 제공되면 이를 분석의 최우선 기준으로 사용하고, 각 진단/해결 제안을 반드시 이 내용과 직접 연결
- 직무/업종 맥락과 어긋나는 일반론 또는 무관한 툴 제안 금지
- 각 핵심 진단 단락마다 반드시 직무(${profile.jobTitle}) 또는 업종(${profile.industry})을 직접 언급
- 관찰된 행동 -> 병목 -> 결과를 구체적으로 연결
- 근거가 약한 부분은 불확실성을 명시
- 기존 소프트웨어가 부분 해결 가능하면 한계를 명확히 설명
- 맞춤 개발이 필요하면 왜 필요한지 기능 단위로 설명

반드시 포함할 항목:
- 사용자 정체성 해석
- 문제 상황 분석(최대 3개, 깊이 있게)
- 시간/비용 낭비 지점
- 실제로 마찰을 줄일 시스템 방향
- 기존 소프트웨어 해결 가능성
- 필요 시 맞춤 개발 필수 기능
- AI 주도 잠재 문제 발굴(2~3개): 사용자가 언급하지 않았지만 직무/업종/팀규모/현재도구로 볼 때
  있을 가능성이 높은 문제를 발굴하고 각 문제에 대해 SW 솔루션 방향을 제시하세요.
  형식: "문제 제목 | 이 사람에게 있을 것으로 추측하는 이유 | SW로 해결하는 구체적 방향"
  규칙: "~할 수 있습니다", "~가능성이 있습니다" 형태로 추측 표현 사용, 확정 단정 금지
- 기술 용어 설명 규칙: 이 서비스의 사용자는 소프트웨어 비전문가입니다. "API", "SaaS", "노코드",
  "자동화", "CRM", "대시보드" 등 일반인이 모를 수 있는 기술 용어는 처음 사용 시 반드시
  괄호 안에 쉬운 설명을 추가하세요.
  예: "API 연동(두 서비스가 데이터를 자동으로 주고받는 기술)"
  예: "CRM(고객 정보와 소통 이력을 한 곳에서 관리하는 도구)"
  예: "노코드 도구(코딩 없이 클릭만으로 자동화를 만드는 서비스)"
- 필요 기능 설명 규칙: 개선 방향에서 기능을 제안할 때는 "기능 이름 | 이 기능이 무엇인지 쉬운 설명 | 왜 이 사용자에게 필요한지"로 구체적으로 작성하세요.

프로필:
- 이름: ${profile.fullName}
- 직무: ${profile.jobTitle}
- 업종: ${profile.industry}
- 팀 규모: ${profile.teamSize}
- 불편사항: ${painPoints}
- 목표: ${goals}
- 현재 도구: ${tools}
- 예산 선호: ${profile.budgetPreference}
- 도입 일정: ${profile.deadlinePreference}
- 가장 불편한 점(상세): ${mainPainDetail ?? "(미입력)"}
- 점수 기반 fitDecision: ${fitDecision}

후보 소프트웨어 정보:
${candidateContext || "- 없음"}

현재 추천 shortlist:
${topItemContext || "- 없음"}
  `.trim();
}

function buildStageTwoPrompt(rawAnalysis: string): string {
  return `
당신은 2단계 구조화 전담입니다.
아래 RAW ANALYSIS를 재해석하지 말고 의미를 유지한 채 JSON으로만 구조화하세요.

규칙:
- 재분석 금지
- 새로운 추론 추가 금지
- 뉘앙스 축약 금지
- 마케팅 문구 삽입 금지
- JSON만 출력
- user_identity에는 직무와 업종을 모두 포함
- core_bottlenecks의 각 analysis 또는 impact에 직무/업종 맥락을 최소 1회 포함
- solution_direction.reason에도 직무/업종 맥락을 포함

맞춤개발 최종판단 로직은 반드시 아래를 따르세요:
If (Gap 평균 > 50) OR (구조적 제약 YES >= 3) OR (ROI 회수 < 6개월) then custom_build=true, else false.

recommended_features_if_custom 작성 규칙:
- 단일 키워드 금지
- 각 항목을 문장형으로 작성
- "어떤 기능이 필요한지 + 왜 필요한지 + 기대 효과"를 포함
- 현재 문제 외에 장기적으로 도움이 되는 기능 1개 이상 포함

recommended_features_structured 작성 규칙:
- name: 소프트웨어 기능/도구 유형의 이름 (문제명이 아닌 SW 솔루션명).
  예: "업무 자동화 도구", "학습 참여 관리 도구", "팀 협업 플랫폼", "데이터 통합 관리 기능"
  절대 금지: 불편사항 이름 그대로 쓰기 (예: "수작업이 너무 많아요", "비용 절감")
- description: 이 SW 기능/도구가 무엇이고 어떤 원리로 문제를 해결하는지 비전문가도 이해하게 1~2문장 설명.
  구체적인 예시 도구(Zapier, Notion, Google Classroom 등)를 한 가지 이상 언급.
  기술 용어 사용 시 반드시 괄호로 쉬운 설명 추가.
  예: "Zapier, Make 같은 자동화 서비스(코딩 없이 두 앱을 연결해 반복 작업을 자동 실행하는 도구)를 활용하면 데이터 입력·알림 발송이 자동 처리됩니다."
- whyNeeded: 사용자의 구체적 불편사항을 언급하며 왜 이 SW 솔루션이 그 문제를 해결하는지 1~2문장

스키마:
{
  "user_identity": "...",
  "core_bottlenecks": [
    {
      "title": "...",
      "analysis": "...",
      "impact": "..."
    }
  ],
  "solution_direction": {
    "can_existing_software_solve": true,
    "reason": "...",
    "recommended_features_if_custom": ["..."],
    "recommended_features_structured": [
      {
        "name": "업무 자동화 도구",
        "description": "Zapier, Make 같은 자동화 서비스(코딩 없이 두 앱을 연결해 반복 작업을 자동 실행하는 도구)를 활용하면 데이터 입력·알림 발송 등을 사람 손 없이 처리할 수 있습니다.",
        "whyNeeded": "현재 수작업 중심 운영으로 인해 같은 작업을 반복하고 계신데, 자동화 도구를 설정하면 이 반복이 자동으로 처리됩니다."
      }
    ]
  },
  "custom_build_framework": {
    "problem_typing": [
      {
        "code": "A",
        "title": "...",
        "rationale": "..."
      }
    ],
    "capability_gap_matrix": [
      {
        "item": "...",
        "need_level": "high",
        "software_coverage": 35,
        "gap": 65
      }
    ],
    "structural_constraint_test": {
      "checks": [
        {
          "question": "...",
          "yes": true,
          "reason": "..."
        }
      ],
      "yes_count": 3,
      "has_structural_limit": true
    },
    "roi_return_threshold": {
      "weekly_hours_wasted": 4,
      "monthly_hours_wasted": 16,
      "hourly_value_krw": 30000,
      "monthly_loss_krw": 480000,
      "estimated_custom_build_cost_krw": 1200000,
      "payback_months": 2.5,
      "roi_turns_within_6_months": true
    },
    "final_decision": {
      "custom_build": true,
      "reason": "..."
    }
  },
  "confidence_level": "medium",
  "proactiveInsights": [
    {
      "problem": "반복 업무 자동화 공백",
      "reasoning": "현재 엑셀만 사용 중인데 마케터 업무 특성상 캠페인 데이터를 수동으로 취합하고 있을 가능성이 있습니다.",
      "swSolution": "Zapier나 Make 같은 자동화 도구를 활용하면 데이터 수집~보고서 작성 구간을 자동화할 수 있습니다."
    }
  ]
}

제약:
- confidence_level: low | medium | high
- core_bottlenecks 최대 3개
- capability_gap_matrix는 3~4개 권장
- proactiveInsights 2~3개, 사용자가 언급하지 않은 잠재 문제만 포함

RAW ANALYSIS:
${rawAnalysis}
  `.trim();
}
export async function generateFitAnalysis(
  profile: ProfileInput,
  fitDecision: string,
  topItems: RecommendationItem[],
  topCandidates: ScoredCandidate[]
): Promise<string> {
  const fallbackParsed = buildDeterministicAnalysis(profile, fitDecision, topItems);
  const fallback = JSON.stringify(fallbackParsed);
  const client = getOpenAIClient();

  if (!client) return fallback;

  const candidateContext = buildCandidateContext(topCandidates);
  const topItemContext = buildTopItemContext(topItems);
  const stageOnePrompt = buildStageOnePrompt(profile, fitDecision, candidateContext, topItemContext);

  const stageOneSystemPrompt =
    "당신은 시니어 상담형 제품 전략가입니다. 사용자 맥락 기반의 깊은 진단을 한국어 자연문으로 작성하세요. JSON 출력은 금지입니다.";
  const stageTwoSystemPrompt =
    "당신은 JSON 구조화 전담입니다. 주어진 분석 텍스트를 구조만 바꾸고 의미를 추가/변형하지 마세요.";

  try {
    const stageOneCompletion = await client.chat.completions.create({
      model: FIT_ANALYSIS_MODEL,
      messages: [
        { role: "system", content: stageOneSystemPrompt },
        { role: "user", content: stageOnePrompt }
      ]
    });
    logStageTokenUsage("stage1_analysis", stageOneCompletion.usage);

    let rawAnalysis = stageOneCompletion.choices[0]?.message?.content?.trim() ?? "";
    if (!rawAnalysis) return fallback;

    if (needsStageOneRegeneration(rawAnalysis) || needsProfileContextRegeneration(rawAnalysis, profile)) {
      const retry = await client.chat.completions.create({
        model: FIT_ANALYSIS_MODEL,
        messages: [
          { role: "system", content: stageOneSystemPrompt },
          { role: "user", content: stageOnePrompt },
          { role: "assistant", content: rawAnalysis },
          {
            role: "user",
            content:
              `지금 답변은 일반론적입니다. 반드시 직무(${profile.jobTitle})와 업종(${profile.industry})을 직접 언급하고, ` +
              "각 병목이 해당 맥락에서 왜 발생하는지 연결해서 상담가처럼 다시 분석하세요."
          }
        ]
      });
      logStageTokenUsage("stage1_analysis_regeneration", retry.usage);

      const rewritten = retry.choices[0]?.message?.content?.trim();
      if (rewritten) rawAnalysis = rewritten;
    }

    const stageTwoCompletion = await client.chat.completions.create({
      model: FIT_ANALYSIS_STRUCTURING_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: stageTwoSystemPrompt },
        { role: "user", content: buildStageTwoPrompt(rawAnalysis) }
      ]
    });
    logStageTokenUsage("stage2_structuring", stageTwoCompletion.usage);

    const content = stageTwoCompletion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return fallback;

    const parsed = fitAnalysisSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      console.warn("[generateFitAnalysis] Invalid JSON structure:", parsed.error.issues);
      return fallback;
    }

    return JSON.stringify(normalizeFitAnalysis(parsed.data, fallbackParsed, profile));
  } catch (error) {
    console.error("[generateFitAnalysis] OpenAI call failed:", error);
    return fallback;
  }
}

export async function generateRecommendationItems(
  profile: ProfileInput,
  candidates: ScoredCandidate[]
): Promise<RecommendationItem[]> {
  const topCandidates = candidates.slice(0, 8);
  if (topCandidates.length === 0) {
    return [];
  }

  const client = getOpenAIClient();
  if (!client) {
    return topCandidates.slice(0, 3).map((c) => fallbackNarrative(c, profile));
  }

  const model = RECOMMENDATION_FORMAT_MODEL;
  const top3 = topCandidates.slice(0, 3);
  const promptPayload = {
    profile,
    candidates: top3.map((candidate) => ({
      softwareId: candidate.item.id,
      name: candidate.item.name,
      category: candidate.item.category,
      pricingModel: candidate.item.pricing_model,
      tags: candidate.item.tags,
      description: candidate.item.description,
      keyFeatures: candidate.item.key_features,
      score: candidate.score,
      reasons: candidate.reasons
    }))
  };

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `당신은 이 특정 사용자만을 위한 1:1 소프트웨어 어드바이저입니다. ` +
            `누구에게나 적용되는 일반적 설명 대신, 이 사람의 직무/불편사항/현재도구를 직접 참조한 설명만 작성하세요. ` +
            `핵심 불편 상세가 주어지면 그것을 최우선 제약으로 삼아 관련성이 약한 후보는 절대 좋게 포장하지 마세요. ` +
            `맥락이 맞지 않는 후보는 solvable=false로 처리하고, 왜 부적합한지 분명히 적으세요. ` +
            `JSON만 반환하세요. softwareId/name은 입력과 동일하게 유지하고, 근거 없는 수치/확정 표현은 피하세요.`
        },
        {
          role: "user",
          content: `
상위 3개 후보에 대한 추천 설명을 한국어로 생성하고 JSON만 반환하세요.

이 사용자의 구체적 상황:
- 불편사항: ${profile.painPoints.join(", ") || "(없음)"}
- 목표: ${profile.goals.join(", ") || "(없음)"}
- 현재 도구: ${profile.currentTools.join(", ") || "(없음)"}
- 직무: ${profile.jobTitle}, 업종: ${profile.industry}, 팀 규모: ${profile.teamSize}명
- 핵심 불편 상세: ${profile.mainPainDetail?.trim() || "(미입력)"}

작성 규칙:
- JSON shape 정확히 유지, softwareId/name은 입력값 그대로
- whyRecommended: 위 불편사항 중 최소 1개를 직접 언급하며 이 도구가 어떻게 구체적으로 해결하는지 설명
- 핵심 불편 상세가 입력된 경우, whyRecommended/pros/cautions 모두에서 해당 상세를 직접 인용하거나 의미적으로 연결
- 직무/업종과 핵심 불편 상세 기준으로 보았을 때 관련성이 낮은 후보는 솔직히 "부분 적합" 또는 "부적합"으로 명시하고 solvable=false 처리
- pros: 이 사용자의 직무/업종/현재 도구 맥락에서의 구체적 장점만 (일반 표현 금지)
- cautions: 이 사용자가 현재 도구(${profile.currentTools.join(", ") || "기존 도구"})에서 전환할 때 실제로 겪을 수 있는 주의점
- 절대 금지: "업무 효율이 향상됩니다", "편리하게 관리할 수 있습니다" 등 누구에게나 해당하는 일반 표현
- 근거 없는 수치/비용/기간 단정 금지

Output shape:
{
  "items": [
    {
      "softwareId": "exact provided softwareId",
      "name": "exact provided name",
      "whyRecommended": "추천 이유",
      "keyFeatures": ["기능", "..."],
      "pros": ["..."],
      "cautions": ["..."],
      "solvable": true
    }
  ]
}

Candidate data:
${JSON.stringify(promptPayload)}
          `.trim()
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return topCandidates.slice(0, 3).map((c) => fallbackNarrative(c, profile));
    }

    const parsedJson = JSON.parse(content);
    const parsed = aiResponseSchema.safeParse(parsedJson);
    if (!parsed.success || parsed.data.items.length === 0) {
      console.warn("[generateRecommendationItems] Invalid AI JSON. Falling back.", parsed.error?.issues);
      return topCandidates.slice(0, 3).map((c) => fallbackNarrative(c, profile));
    }

    return mergeAiWithCandidates(topCandidates, parsed.data.items, profile);
  } catch (error) {
    console.error("[generateRecommendationItems] OpenAI call failed:", error);
    return topCandidates.slice(0, 3).map((c) => fallbackNarrative(c, profile));
  }
}
