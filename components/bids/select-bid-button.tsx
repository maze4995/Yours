"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { selectBidAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type SelectBidButtonProps = {
  requestId: string;
  bidId: string;
};

export function SelectBidButton({ requestId, bidId }: SelectBidButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onSelect = () => {
    startTransition(async () => {
      const result = await selectBidAction(requestId, bidId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("개발자를 선택했습니다.");
      router.push(`/project/${result.data.projectId}` as never);
      router.refresh();
    });
  };

  return (
    <Button onClick={onSelect} disabled={pending} className="gap-2">
      {pending ? (
        <>
          <Spinner />
          처리 중...
        </>
      ) : (
        "이 입찰 선택"
      )}
    </Button>
  );
}
