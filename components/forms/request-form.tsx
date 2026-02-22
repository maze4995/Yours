"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRequestAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { PriorityLevel } from "@/lib/types";

type RequestFormProps = {
  recommendationId?: string | null;
};

export function RequestForm({ recommendationId }: RequestFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("medium");

  const onSubmit = () => {
    startTransition(async () => {
      const result = await createRequestAction({
        title,
        summary,
        requirements,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        deadlineDate: deadlineDate || null,
        priority,
        recommendationId: recommendationId ?? null
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("요청이 생성되었습니다.");
      router.push(`/request/${result.data.requestId}` as never);
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>맞춤 개발 요청 생성</CardTitle>
        <CardDescription>요구사항 요약, 예산, 마감 정보를 입력하면 검증된 Maker가 입찰합니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">요청 제목</Label>
          <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">요약</Label>
          <Textarea id="summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requirements">상세 요구사항</Label>
          <Textarea
            id="requirements"
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder="필수 기능, 제약사항, 원하는 결과물을 구체적으로 적어주세요."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="budgetMin">최소 예산</Label>
            <Input
              id="budgetMin"
              type="number"
              min={0}
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budgetMax">최대 예산</Label>
            <Input
              id="budgetMax"
              type="number"
              min={0}
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="deadlineDate">희망 마감일</Label>
            <Input
              id="deadlineDate"
              type="date"
              value={deadlineDate}
              onChange={(event) => setDeadlineDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">우선순위</Label>
            <select
              id="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as PriorityLevel)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">낮음</option>
              <option value="medium">중간</option>
              <option value="high">높음</option>
            </select>
          </div>
        </div>
        <Button onClick={onSubmit} disabled={pending} className="w-full gap-2">
          {pending ? (
            <>
              <Spinner />
              생성 중...
            </>
          ) : (
            "요청 생성하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
