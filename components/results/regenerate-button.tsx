"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function RegenerateButton() {
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommendations/regenerate", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message ?? "재생성에 실패했습니다.");
        return;
      }
      // revalidatePath가 서버에서 캐시를 무효화했으므로 hard navigation으로 확실히 새 데이터 로드
      window.location.href = "/results";
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRegenerate}
      disabled={loading}
      className="gap-1.5 text-xs"
    >
      {loading ? (
        <>
          <Spinner className="h-3 w-3" />
          재생성 중...
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3" />
          AI 재분석
        </>
      )}
    </Button>
  );
}
