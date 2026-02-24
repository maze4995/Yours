"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ShieldX } from "lucide-react";
import { setMakerVerificationAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

type MakerVerifyButtonProps = {
  makerUserId: string;
  isVerified: boolean;
};

export function MakerVerifyButton({ makerUserId, isVerified }: MakerVerifyButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onToggle = () => {
    const nextVerified = !isVerified;
    const actionLabel = nextVerified ? "승인" : "해제";
    const confirmed = window.confirm(`이 개발자 검증을 ${actionLabel}하시겠습니까?`);
    if (!confirmed) return;

    startTransition(async () => {
      const result = await setMakerVerificationAction(makerUserId, nextVerified);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "변경이 완료되었습니다.");
      router.refresh();
    });
  };

  return (
    <Button
      size="sm"
      variant={isVerified ? "outline" : "default"}
      className="gap-1"
      onClick={onToggle}
      disabled={pending}
      aria-label={isVerified ? "개발자 검증 해제" : "개발자 검증 승인"}
    >
      {isVerified ? <ShieldX className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {isVerified ? "검증 해제" : "검증 승인"}
    </Button>
  );
}
