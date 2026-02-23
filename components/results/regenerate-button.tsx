"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/results/loading-overlay";

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
