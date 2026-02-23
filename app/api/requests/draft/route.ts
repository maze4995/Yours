import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export interface DraftInput {
  problem: string;
  currentSolution: string;
  desiredFeatures: string[];
  budgetRange: string;
  deadline: string;
}

export interface DraftOutput {
  title: string;
  summary: string;
  requirements: string;
  budgetMin: number | null;
  budgetMax: number | null;
  deadlineDate: string | null;
  priority: "low" | "medium" | "high";
}

function parseBudget(range: string): { budgetMin: number | null; budgetMax: number | null } {
  if (range.includes("50만원 이하")) return { budgetMin: 0, budgetMax: 500000 };
  if (range.includes("50~200만원")) return { budgetMin: 500000, budgetMax: 2000000 };
  if (range.includes("200~500만원")) return { budgetMin: 2000000, budgetMax: 5000000 };
  if (range.includes("500만원 이상")) return { budgetMin: 5000000, budgetMax: null };
  return { budgetMin: null, budgetMax: null };
}

function parseDeadline(deadline: string): { deadlineDate: string | null; priority: "low" | "medium" | "high" } {
  const now = new Date();
  if (deadline.includes("2주")) {
    now.setDate(now.getDate() + 14);
    return { deadlineDate: now.toISOString().split("T")[0], priority: "high" };
  }
  if (deadline.includes("한 달")) {
    now.setMonth(now.getMonth() + 1);
    return { deadlineDate: now.toISOString().split("T")[0], priority: "high" };
  }
  if (deadline.includes("2~3개월")) {
    now.setMonth(now.getMonth() + 2);
    return { deadlineDate: now.toISOString().split("T")[0], priority: "medium" };
  }
  return { deadlineDate: null, priority: "low" };
}

function buildFallbackDraft(input: DraftInput): DraftOutput {
  const { budgetMin, budgetMax } = parseBudget(input.budgetRange);
  const { deadlineDate, priority } = parseDeadline(input.deadline);

  const title = input.problem.length > 40 ? input.problem.slice(0, 40) + "..." : input.problem;
  const summary =
    `${input.problem}\n\n현재 ${input.currentSolution || "별도 해결책 없이"} 처리하고 있으며, ` +
    `${input.desiredFeatures.join(", ")} 기능이 있는 프로그램이 필요합니다.`;
  const requirements =
    `[문제 상황]\n${input.problem}\n\n` +
    `[현재 방법]\n${input.currentSolution || "없음"}\n\n` +
    `[필요한 기능]\n${input.desiredFeatures.map((f) => `- ${f}`).join("\n")}\n\n` +
    `[예산]\n${input.budgetRange}\n\n` +
    `[일정]\n${input.deadline}`;

  return { title, summary, requirements, budgetMin, budgetMax, deadlineDate, priority };
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: DraftInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { budgetMin, budgetMax } = parseBudget(body.budgetRange);
  const { deadlineDate, priority } = parseDeadline(body.deadline);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-openai-api-key")) {
    return NextResponse.json(buildFallbackDraft(body));
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const prompt = `
아래 사용자 정보를 바탕으로 소프트웨어 맞춤 개발 의뢰서를 작성해주세요.
개발자가 이해하기 쉽도록 명확하고 구체적으로 작성해야 합니다.

사용자 입력:
- 해결하고 싶은 문제: ${body.problem}
- 현재 해결 방법: ${body.currentSolution || "없음"}
- 원하는 기능: ${body.desiredFeatures.join(", ")}
- 예산 범위: ${body.budgetRange}
- 도입 일정: ${body.deadline}

아래 JSON 형식으로만 답변하세요:
{
  "title": "의뢰서 제목 (40자 이내, 핵심 문제를 담아서)",
  "summary": "의뢰 요약 (3~5문장. 어떤 문제를 왜 해결하고 싶은지 비기술적 언어로)",
  "requirements": "상세 요구사항 (섹션별로 나눠서 작성. [문제 배경], [원하는 기능], [참고사항] 포함. 개발자가 견적을 낼 수 있을 정도로 구체적으로)"
}

규칙:
- 비기술 사용자가 작성한 내용을 개발자가 이해할 수 있는 언어로 변환하되, 과도한 기술 용어 금지
- 한국어로 작성
- 마크다운 코드블록/JSON 래퍼 금지
  `.trim();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "너는 소프트웨어 개발 의뢰서 작성 전문가다. 비기술 사용자의 말을 개발자가 이해할 수 있는 명확한 의뢰서로 변환한다."
        },
        { role: "user", content: prompt }
      ]
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json(buildFallbackDraft(body));
    }

    const parsed = JSON.parse(content) as { title?: string; summary?: string; requirements?: string };
    if (!parsed.title || !parsed.summary || !parsed.requirements) {
      return NextResponse.json(buildFallbackDraft(body));
    }

    const result: DraftOutput = {
      title: parsed.title,
      summary: parsed.summary,
      requirements: parsed.requirements,
      budgetMin,
      budgetMax,
      deadlineDate,
      priority
    };
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/requests/draft] OpenAI 호출 실패:", error);
    return NextResponse.json(buildFallbackDraft(body));
  }
}
