"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/results/loading-overlay";

export function RegenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommendations/regenerate", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { message?: string; recommendationId?: string }
        | null;

      if (!res.ok) {
        toast.error(data?.message ?? "재생성에 실패했습니다.");
        return;
      }

      const nextPath = data?.recommendationId
        ? `/results?recommendationId=${data.recommendationId}`
        : "/results";

      router.replace(nextPath as never);
      router.refresh();
      toast.success("AI 분석을 다시 생성했습니다.");
    } catch (error) {
      console.error("[RegenerateButton] regenerate failed:", error);
      toast.error("재생성 중 오류가 발생했습니다.");
    } finally {
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
