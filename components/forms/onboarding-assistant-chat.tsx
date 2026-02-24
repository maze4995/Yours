"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
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
  "직무를 어떻게 적어야 정확한 추천이 나올까요?",
  "'가장 불편한 것'을 구체적으로 쓰는 예시를 알려주세요.",
  "목표를 결과 중심 문장으로 바꿔주세요.",
  "예산과 도입 일정을 현실적으로 정하는 방법이 궁금해요."
];

const INITIAL_MESSAGE: ChatMessage = {
  id: "initial-assistant",
  role: "assistant",
  content:
    "프로파일링 도우미입니다. 업무 상황을 편하게 적어주시면, 온보딩 입력칸에 넣기 좋은 문장으로 정리해드릴게요."
};

export function OnboardingAssistantChat() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [showNudge, setShowNudge] = useState(true);
  const [pulseButton, setPulseButton] = useState(true);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  const sendMessage = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || pending) return;

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
      const response = await fetch("/api/onboarding/assistant-chat", {
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
      console.error("[onboarding-assistant-chat] failed:", error);
      toast.error("네트워크 오류로 AI 응답을 가져오지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await sendMessage(input);
  };

  useEffect(() => {
    if (open) {
      setShowNudge(false);
      setPulseButton(false);
      return;
    }

    const hideInitial = window.setTimeout(() => {
      setShowNudge(false);
      setPulseButton(false);
    }, 5000);

    const interval = window.setInterval(() => {
      setShowNudge(true);
      setPulseButton(true);
      window.setTimeout(() => {
        setShowNudge(false);
        setPulseButton(false);
      }, 5000);
    }, 18000);

    return () => {
      window.clearTimeout(hideInitial);
      window.clearInterval(interval);
    };
  }, [open]);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
        <div
          className={cn(
            "pointer-events-none max-w-[250px] rounded-xl border border-primary/25 bg-white/95 px-3 py-2 text-xs font-medium text-primary shadow-lg backdrop-blur transition-all duration-300",
            showNudge && !open ? "translate-y-0 opacity-100 animate-bounce" : "translate-y-2 opacity-0"
          )}
          aria-hidden={!showNudge || open}
        >
          <div className="flex items-start gap-1.5">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>AI 도우미로 입력을 더 쉽게 정리해보세요.</span>
          </div>
        </div>

        <Button
          type="button"
          className={cn("rounded-full px-4 shadow-lg transition", pulseButton && !open && "animate-pulse")}
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "프로파일링 AI 도우미 닫기" : "프로파일링 AI 도우미 열기"}
        >
          {open ? <X className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          {open ? "닫기" : "프로파일링 AI"}
        </Button>
      </div>

      <aside
        className={cn(
          "fixed right-4 top-20 z-30 flex h-[calc(100vh-6.5rem)] w-[min(390px,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-card shadow-xl transition-all duration-200",
          open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-6 opacity-0"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">프로파일링 AI 도우미</p>
            <p className="text-xs text-muted-foreground">입력 문장을 항목에 맞게 다듬어 드립니다.</p>
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
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line",
                message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
              placeholder="예: 식당 장부 정리를 하루 2시간 수기로 해요."
              aria-label="AI 도우미에게 질문 입력"
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
