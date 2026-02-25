"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoadingOverlay } from "@/components/results/loading-overlay";

export function AiEnhanceTrigger({ recommendationId }: { recommendationId: string }) {
  const router = useRouter();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;

    const run = async () => {
      try {
        const res = await fetch(`/api/recommendations/${recommendationId}/enhance`, {
          method: "POST"
        });
        if (res.ok) {
          router.refresh();
        }
      } catch (error) {
        console.error("[AiEnhanceTrigger] enhancement failed:", error);
        router.refresh();
      }
    };

    void run();
  }, [recommendationId, router]);

  return <LoadingOverlay />;
}
