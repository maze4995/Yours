"use client";

import { FormEvent, useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const QUICK_QUESTIONS = [
  "의뢰서 제목을 어떻게 쓰면 좋아요?",
  "요구사항을 개발자가 이해하기 쉽게 바꿔줘",
  "예산 범위를 정하는 기준을 알려줘",
  "마감일을 현실적으로 잡는 방법은?"
];

const INITIAL_MESSAGE: ChatMessage = {
  id: "initial-assistant",
  role: "assistant",
  content:
    "의뢰서 작성 도우미입니다. 지금 고민되는 내용을 편하게 물어보세요. 문장을 함께 다듬거나, 개발자가 이해하기 쉬운 표현으로 바꿔드릴게요."
};

export function RequestAssistantChat() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || pending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/requests/assistant-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          history: nextMessages.slice(-8).map((item) => ({
            role: item.role,
            content: item.content
          }))
        })
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      const reply = data.reply?.trim();
      if (!response.ok || !reply) {
        toast.error(data.error ?? "AI 도우미 응답을 가져오지 못했습니다.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply
        }
      ]);
    } catch (error) {
      console.error("[request-assistant-chat] failed:", error);
      toast.error("네트워크 오류로 답변을 가져오지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40">
        <Button
          type="button"
          className="rounded-full px-4 shadow-lg"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "AI 도우미 닫기" : "AI 도우미 열기"}
        >
          {open ? <X className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          {open ? "닫기" : "AI 도우미"}
        </Button>
      </div>

      <aside
        className={cn(
          "fixed right-4 top-20 z-30 flex h-[calc(100vh-6.5rem)] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-card shadow-xl transition-all duration-200",
          open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">AI 의뢰서 도우미</p>
            <p className="text-xs text-muted-foreground">작성 중 궁금한 점을 바로 물어보세요.</p>
          </div>
          <Button
            size="default"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label="패널 닫기"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-border px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendMessage(question)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                message.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {message.content}
            </div>
          ))}
          {pending ? (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Spinner />
              답변 작성 중...
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="예: 이 문장을 개발자용으로 바꿔줘"
              aria-label="AI에게 질문 입력"
              maxLength={1000}
            />
            <Button
              type="submit"
              disabled={!canSend}
              size="default"
              className="h-10 w-10 p-0"
              aria-label="질문 보내기"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
