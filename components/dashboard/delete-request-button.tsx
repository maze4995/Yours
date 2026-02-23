"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRequestAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

type DeleteRequestButtonProps = {
  requestId: string;
  requestTitle: string;
};

export function DeleteRequestButton({ requestId, requestTitle }: DeleteRequestButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onDelete = () => {
    const confirmed = window.confirm(`"${requestTitle}" 요청을 삭제할까요?`);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteRequestAction(requestId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("요청이 삭제되었습니다.");
      router.refresh();
    });
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-destructive hover:text-destructive"
      onClick={onDelete}
      disabled={pending}
      aria-label="요청 삭제"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
