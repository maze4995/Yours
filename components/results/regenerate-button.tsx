"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Sparkles, Search, Brain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAGES = [
  { icon: Search, label: "프로필 분석 중", detail: "직무·업종·불편사항을 파악하고 있어요" },
  { icon: Brain, label: "카탈로그 매칭 중", detail: "34개+ 소프트웨어 중 최적 후보를 선별해요" },
  { icon: Sparkles, label: "AI 리포트 생성 중", detail: "개인화된 분석 리포트를 작성하고 있어요" },
  { icon: CheckCircle2, label: "마무리 중", detail: "결과를 저장하고 화면을 준비해요" },
];

function LoadingOverlay() {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 전체 예상 시간: ~12초 (단계별 3초씩)
    const stageDuration = 3000;
    const tickInterval = 50;

    const ticker = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (stageDuration * STAGES.length / tickInterval));
        return Math.min(next, 97); // 완료 전에 97%에서 멈춤
      });
    }, tickInterval);

    const stageTimer = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, stageDuration);

    return () => {
      clearInterval(ticker);
      clearInterval(stageTimer);
    };
  }, []);

  const currentStage = STAGES[stageIndex];
  const StageIcon = currentStage.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {/* 아이콘 + 타이틀 */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <StageIcon className="h-8 w-8 text-primary animate-pulse" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
              </span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold">{currentStage.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{currentStage.detail}</p>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="space-y-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>AI 분석 중...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* 단계 인디케이터 */}
        <div className="flex items-center justify-center gap-2">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isDone = i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div key={stage.label} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all duration-500 ${
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary/20 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className={`h-0.5 w-6 transition-all duration-500 ${
                      isDone ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          AI 분석에 10~20초 정도 소요됩니다. 잠시만 기다려 주세요.
        </p>
      </div>
    </div>
  );
}

export function RegenerateButton() {
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommendations/regenerate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message ?? "재생성에 실패했습니다.");
        setLoading(false);
        return;
      }
      window.location.href = "/results";
    } catch {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay />}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRegenerate}
        disabled={loading}
        className="gap-1.5 text-xs"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        AI 재분석
      </Button>
    </>
  );
}
