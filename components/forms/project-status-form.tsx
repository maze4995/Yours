"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectStatusAction } from "@/lib/actions";
import type { ProjectStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type ProjectStatusFormProps = {
  projectId: string;
  currentStatus: ProjectStatus;
};

export function ProjectStatusForm({ projectId, currentStatus }: ProjectStatusFormProps) {
  const [status, setStatus] = useState<ProjectStatus>(currentStatus);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onUpdate = () => {
    startTransition(async () => {
      const result = await updateProjectStatusAction(projectId, status, note);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("프로젝트 상태를 업데이트했습니다.");
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 text-sm font-medium">상태 업데이트</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectStatus">상태</Label>
          <select
            id="projectStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatus)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="delivered">delivered</option>
            <option value="accepted">accepted</option>
            <option value="closed">closed</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="statusNote">메모</Label>
          <Input id="statusNote" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
      <Button onClick={onUpdate} className="mt-4 gap-2" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            저장 중...
          </>
        ) : (
          "상태 저장"
        )}
      </Button>
    </div>
  );
}
