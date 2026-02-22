import OpenAI from "openai";
import { z } from "zod";
import type { ProfileInput, RecommendationItem } from "@/lib/types";
import type { ScoredCandidate } from "@/lib/recommendation/scoring";

const aiResponseSchema = z.object({
  items: z.array(
    z.object({
      softwareId: z.string(),
      whyRecommended: z.string(),
      keyFeatures: z.array(z.string()).min(3).max(5),
      pros: z.array(z.string()).min(1).max(5),
      cautions: z.array(z.string()).min(1).max(5),
      solvable: z.boolean()
    })
  )
});

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

function mergeAiWithCandidates(
  candidates: ScoredCandidate[],
  aiItems: z.infer<typeof aiResponseSchema>["items"]
): RecommendationItem[] {
  const aiMap = new Map(aiItems.map((item) => [item.softwareId, item]));
  return candidates.slice(0, 3).map((candidate) => {
    const aiItem = aiMap.get(candidate.item.id);
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

export async function generateRecommendationItems(
  profile: ProfileInput,
  candidates: ScoredCandidate[]
): Promise<RecommendationItem[]> {
  const topCandidates = candidates.slice(0, 8);
  if (topCandidates.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return topCandidates.slice(0, 3).map(fallbackNarrative);
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const promptPayload = {
    profile,
    candidates: topCandidates.map((candidate) => ({
      softwareId: candidate.item.id,
      name: candidate.item.name,
      category: candidate.item.category,
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
            "너는 B2B 소프트웨어 컨설턴트다. 반드시 JSON만 반환하고, 후보별 설명은 사실적이고 짧게 작성해라."
        },
        {
          role: "user",
          content: `
다음 데이터를 기반으로 상위 3개 후보만 분석해라.
반환 형식:
{
  "items": [
    {
      "softwareId": "...",
      "whyRecommended": "...",
      "keyFeatures": ["...", "...", "..."],
      "pros": ["...", "..."],
      "cautions": ["...", "..."],
      "solvable": true
    }
  ]
}

데이터:
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
    if (!parsed.success) {
      return topCandidates.slice(0, 3).map(fallbackNarrative);
    }

    return mergeAiWithCandidates(topCandidates, parsed.data.items);
  } catch (error) {
    console.error("OpenAI recommendation error:", error);
    return topCandidates.slice(0, 3).map(fallbackNarrative);
  }
}
