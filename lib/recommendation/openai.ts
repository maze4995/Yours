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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}


function fallbackNarrative(candidate: ScoredCandidate): RecommendationItem {
  return {
    softwareId: candidate.item.id,
    name: candidate.item.name,
    whyRecommended: `직무/요구사항과 관련 태그가 일치해 우선 추천됩니다. (${candidate.reasons.join(", ")})`,
    keyFeatures: candidate.item.key_features.slice(0, 5),
    pros:
      candidate.item.pros_template.length > 0
        ? candidate.item.pros_template.slice(0, 3)
        : ["도입이 빠르고 초기 리스크가 낮습니다."],
    cautions:
      candidate.item.cons_template.length > 0
        ? candidate.item.cons_template.slice(0, 3)
        : ["세부 요구사항에 따라 커스텀 한계가 있을 수 있습니다."],
    solvable: candidate.score >= 40,
    score: candidate.score
  };
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
  aiItems: z.infer<typeof aiResponseSchema>["items"]
): RecommendationItem[] {
  const top3 = candidates.slice(0, 3);
  const aligned = alignAiItems(top3, aiItems);

  return top3.map((candidate, index) => {
    const aiItem = aligned[index];
    if (!aiItem) {
      return fallbackNarrative(candidate);
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

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-openai-api-key")) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export interface FitAnalysis {
  painAnalysis: { pain: string; detail: string }[];
  goalRefinements: { original: string; refined: string }[];
  recommendation: string;
}

const fitAnalysisSchema = z.object({
  painAnalysis: z.array(z.object({ pain: z.string(), detail: z.string() })),
  goalRefinements: z.array(z.object({ original: z.string(), refined: z.string() })),
  recommendation: z.string()
});

function buildDeterministicAnalysis(
  profile: ProfileInput,
  fitDecision: string,
  _topItems: RecommendationItem[],
  _topCandidates: ScoredCandidate[]
): string {
  const painAnalysis = profile.painPoints.slice(0, 5).map((pain) => ({
    pain,
    detail: `${profile.industry} 업종의 ${profile.jobTitle} 업무에서 "${pain}" 문제는 반복 작업과 누락으로 이어져 운영 효율을 떨어뜨릴 수 있습니다. 적절한 도구 도입으로 이 부분을 자동화하거나 체계화하면 시간과 비용을 절감할 수 있습니다.`
  }));

  const goalRefinements = profile.goals.slice(0, 4).map((goal) => ({
    original: goal,
    refined: `${profile.teamSize}명 규모의 ${profile.industry} 팀에서 "${goal}"은(는) 현재 사용 중인 도구(${profile.currentTools.join(", ") || "기존 도구"})를 보완하는 방향으로 단계적으로 달성할 수 있습니다.`
  }));

  const recommendation =
    fitDecision === "software_fit"
      ? `${profile.jobTitle}의 업무 흐름과 현재 팀 규모(${profile.teamSize}명)를 고려할 때, 기존 SaaS 도구로도 핵심 문제를 해결할 수 있는 수준입니다. 예산과 도입 속도를 감안해 아래 추천 소프트웨어부터 시작해 보세요.`
      : `${profile.jobTitle} 업무의 요구사항이 구체적이고 특수하여 기존 소프트웨어로는 완전한 충족이 어렵습니다. 맞춤 개발을 통해 ${profile.goals[0] ?? "목표 달성"}에 최적화된 시스템을 구축하는 것을 권장합니다.`;

  return JSON.stringify({ painAnalysis, goalRefinements, recommendation } satisfies FitAnalysis);
}

export async function generateFitAnalysis(
  profile: ProfileInput,
  fitDecision: string,
  topItems: RecommendationItem[],
  topCandidates: ScoredCandidate[]
): Promise<string> {
  const fallback = buildDeterministicAnalysis(profile, fitDecision, topItems, topCandidates);
  const client = getOpenAIClient();
  if (!client) return fallback;

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const prompt = `
사용자 프로필:
- 이름: ${profile.fullName || "미입력"}
- 직무: ${profile.jobTitle}
- 업종: ${profile.industry}
- 팀 규모: ${profile.teamSize}명
- 불편사항: ${profile.painPoints.join(", ") || "없음"}
- 목표: ${profile.goals.join(", ") || "없음"}
- 현재 사용 도구: ${profile.currentTools.join(", ") || "없음"}
- 예산 선호: ${profile.budgetPreference || "미입력"}
- 도입 일정: ${profile.deadlinePreference || "미입력"}
- 판정 결과: ${fitDecision === "software_fit" ? "기존 소프트웨어 적합" : "맞춤 개발 권장"}

아래 JSON 형식으로만 답변하세요 (마크다운/코드블록 금지):
{
  "painAnalysis": [
    {
      "pain": "불편사항 키워드 그대로",
      "detail": "이 사용자의 직무·업종·팀규모를 고려해 이 불편사항이 실제로 어떤 영향을 주는지 2문장으로 구체적 설명"
    }
  ],
  "goalRefinements": [
    {
      "original": "목표 키워드 그대로",
      "refined": "이 사용자가 이 목표를 통해 실제로 이룰 수 있는 구체적이고 현실적인 변화를 1~2문장으로 설명 (수치/시나리오 포함 권장)"
    }
  ],
  "recommendation": "판정 결과를 바탕으로 왜 이 선택이 이 사용자에게 최선인지 2~3문장으로 설명"
}

규칙:
- painAnalysis 항목 수는 사용자의 불편사항 수와 동일하게
- goalRefinements 항목 수는 사용자의 목표 수와 동일하게
- 비기술 사용자도 이해 가능한 쉬운 표현 사용
- 한국어로 작성
  `.trim();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "너는 B2B 소프트웨어 도입 전문 컨설턴트다. 사용자의 상황을 정확히 분석해 비기술 사용자도 이해할 수 있는 한국어로 JSON 형식으로만 답변한다."
        },
        { role: "user", content: prompt }
      ]
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return fallback;

    const parsed = fitAnalysisSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      console.warn("[generateFitAnalysis] Invalid JSON structure:", parsed.error.issues);
      return fallback;
    }
    return JSON.stringify(parsed.data);
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
    return topCandidates.slice(0, 3).map(fallbackNarrative);
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
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
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a B2B software advisor. Return JSON only. Keep softwareId and name exactly as provided."
        },
        {
          role: "user",
          content: `
Analyze exactly these 3 candidates and return Korean output.

Required JSON format:
{
  "items": [
    {
      "softwareId": "exact provided softwareId",
      "name": "exact provided name",
      "whyRecommended": "구체적 추천 이유",
      "keyFeatures": ["3~5 items"],
      "pros": ["1~5 items"],
      "cautions": ["1~5 items"],
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
      return topCandidates.slice(0, 3).map(fallbackNarrative);
    }

    const parsedJson = JSON.parse(content);
    const parsed = aiResponseSchema.safeParse(parsedJson);
    if (!parsed.success || parsed.data.items.length === 0) {
      console.warn(
        "[generateRecommendationItems] Invalid AI JSON. Falling back.",
        parsed.error?.issues
      );
      return topCandidates.slice(0, 3).map(fallbackNarrative);
    }

    return mergeAiWithCandidates(topCandidates, parsed.data.items);
  } catch (error) {
    console.error("[generateRecommendationItems] OpenAI call failed:", error);
    return topCandidates.slice(0, 3).map(fallbackNarrative);
  }
}
