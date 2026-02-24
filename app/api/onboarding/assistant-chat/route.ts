import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000)
      })
    )
    .max(12)
    .optional()
    .default([])
});

function fallbackReply(message: string): string {
  const text = message.toLowerCase();

  if (text.includes("직무") || text.includes("job")) {
    return "직무는 직책명보다 실제로 하는 일을 중심으로 쓰면 좋습니다. 예: '식당 운영(장부·정산·재고 관리)'처럼 적어보세요.";
  }

  if (text.includes("불편") || text.includes("문제")) {
    return "가장 불편한 점은 '반복 빈도 + 걸리는 시간 + 실수/지연 결과'를 함께 쓰면 정확도가 올라갑니다. 예: '매일 장부 정리에 2시간, 정산 오류가 주 2회 발생'.";
  }

  if (text.includes("목표")) {
    return "목표는 측정 가능한 문장으로 적어보세요. 예: '장부 정리 시간을 하루 2시간에서 30분으로 줄이기'.";
  }

  if (text.includes("예산") || text.includes("일정")) {
    return "예산과 일정은 '최소 시작안' 기준으로 적으면 됩니다. 예: 월 10~30만원, 1개월 내 파일럿 도입.";
  }

  return "좋아요. 현재 업무, 가장 불편한 상황, 원하는 변화(목표)를 한 문장씩 보내주시면 온보딩 항목에 맞춰 바로 정리해드릴게요.";
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-openai-api-key")) {
    return NextResponse.json({ reply: fallbackReply(payload.message) });
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "당신은 비개발자를 돕는 프로파일링 코치입니다. 답변은 반드시 한국어로 작성하세요. " +
            "목표는 사용자의 자유 문장을 온보딩 입력용으로 다듬는 것입니다. " +
            "각 답변은 4문장 이내로 짧고 명확하게 작성하고, 필요하면 예시 1개를 포함하세요. " +
            "직무/업종/가장 불편한 점/목표/현재도구/예산/일정 항목 중 무엇에 넣으면 좋은지도 함께 안내하세요. " +
            "근거 없는 확정 표현은 피하고, 엉뚱한 툴 추천보다 현재 입력을 정제하는 데 집중하세요."
        },
        ...payload.history.map((item) => ({
          role: item.role,
          content: item.content
        })),
        {
          role: "user",
          content: payload.message
        }
      ]
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ reply: fallbackReply(payload.message) });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[/api/onboarding/assistant-chat] OpenAI call failed:", error);
    return NextResponse.json({ reply: fallbackReply(payload.message) });
  }
}
