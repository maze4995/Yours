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

  if (text.includes("제목")) {
    return "의뢰서 제목은 '무엇을 자동화/개선하고 싶은지 + 대상 업무' 조합으로 쓰면 좋습니다. 예: '고객 문의 접수·분류 자동화 시스템 구축'.";
  }

  if (text.includes("예산")) {
    return "예산은 기능 범위를 기준으로 나누어 적는 게 좋아요. 필수 기능, 있으면 좋은 기능을 분리하고 필수 기능 기준으로 최소/최대 예산을 제시해보세요.";
  }

  if (text.includes("마감") || text.includes("일정")) {
    return "일정은 '기획 1주 + 개발 2~4주 + 테스트 1주'처럼 여유를 둔 범위로 제시하면 개발자와 현실적인 협의가 쉬워집니다.";
  }

  return "좋은 질문이에요. 현재 겪는 문제, 원하는 결과, 필수 기능 3가지를 함께 적어주시면 의뢰서 문장으로 구체적으로 다듬어드릴게요.";
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
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "당신은 의뢰서 작성 도우미입니다. 사용자가 비개발자라고 가정하고 한국어로 짧고 명확하게 답하세요. " +
            "요청 내용을 개발자가 이해하기 쉬운 문장으로 바꿔주고, 불명확한 부분은 1~2개의 확인 질문으로 되물으세요."
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
    console.error("[/api/requests/assistant-chat] OpenAI call failed:", error);
    return NextResponse.json({ reply: fallbackReply(payload.message) });
  }
}

