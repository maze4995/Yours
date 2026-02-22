"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOnboardingAndRecommendAction, saveOnboardingAction } from "@/lib/actions";
import type { ProfileInput } from "@/lib/types";
import { parseCsvInput } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type OnboardingFormProps = {
  initialValue?: Partial<ProfileInput>;
};

const totalSteps = 3;

export function OnboardingForm({ initialValue }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [fullName, setFullName] = useState(initialValue?.fullName ?? "");
  const [jobTitle, setJobTitle] = useState(initialValue?.jobTitle ?? "");
  const [industry, setIndustry] = useState(initialValue?.industry ?? "");
  const [teamSize, setTeamSize] = useState(initialValue?.teamSize?.toString() ?? "1");
  const [painPoints, setPainPoints] = useState((initialValue?.painPoints ?? []).join(", "));
  const [goals, setGoals] = useState((initialValue?.goals ?? []).join(", "));
  const [currentTools, setCurrentTools] = useState((initialValue?.currentTools ?? []).join(", "));
  const [budgetPreference, setBudgetPreference] = useState(initialValue?.budgetPreference ?? "");
  const [deadlinePreference, setDeadlinePreference] = useState(initialValue?.deadlinePreference ?? "");

  const payload = useMemo<ProfileInput>(
    () => ({
      fullName,
      jobTitle,
      industry,
      teamSize: Number(teamSize) || 1,
      painPoints: parseCsvInput(painPoints),
      goals: parseCsvInput(goals),
      currentTools: parseCsvInput(currentTools),
      budgetPreference,
      deadlinePreference
    }),
    [fullName, jobTitle, industry, teamSize, painPoints, goals, currentTools, budgetPreference, deadlinePreference]
  );

  const onSave = () => {
    startTransition(async () => {
      const result = await saveOnboardingAction(payload);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("임시 저장되었습니다.");
    });
  };

  const onComplete = () => {
    startTransition(async () => {
      const result = await completeOnboardingAndRecommendAction(payload);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("추천이 준비되었습니다.");
      router.push(result.data.nextPath as never);
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>프로파일링</CardTitle>
        <CardDescription>3단계 질문으로 현재 상황을 빠르게 파악합니다.</CardDescription>
        <Progress value={(step / totalSteps) * 100} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Input id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">직무</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">산업군</Label>
              <Input id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">팀 규모</Label>
              <Input
                id="teamSize"
                type="number"
                min={1}
                value={teamSize}
                onChange={(event) => setTeamSize(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="painPoints">현재 불편사항 (쉼표 구분)</Label>
              <Textarea
                id="painPoints"
                value={painPoints}
                onChange={(event) => setPainPoints(event.target.value)}
                placeholder="예: 수작업 보고, 고객 문의 누락"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">달성 목표 (쉼표 구분)</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(event) => setGoals(event.target.value)}
                placeholder="예: 리드 전환율 향상, 운영 자동화"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentTools">현재 사용 도구 (쉼표 구분)</Label>
              <Textarea
                id="currentTools"
                value={currentTools}
                onChange={(event) => setCurrentTools(event.target.value)}
                placeholder="예: Notion, Slack, Excel"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budgetPreference">예산 선호</Label>
              <Input
                id="budgetPreference"
                value={budgetPreference}
                onChange={(event) => setBudgetPreference(event.target.value)}
                placeholder="예: 월 20~50만원, 낮은 초기비용"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadlinePreference">희망 일정</Label>
              <Input
                id="deadlinePreference"
                value={deadlinePreference}
                onChange={(event) => setDeadlinePreference(event.target.value)}
                placeholder="예: 4주 내 도입"
              />
            </div>
            <div className="md:col-span-2 rounded-md border border-border bg-muted/40 p-4 text-sm">
              제출하면 추천 결과를 생성하고 `/results`로 이동합니다.
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={step === 1 || pending}>
              이전
            </Button>
            <Button variant="outline" onClick={onSave} disabled={pending}>
              임시 저장
            </Button>
          </div>
          {step < totalSteps ? (
            <Button onClick={() => setStep((prev) => Math.min(totalSteps, prev + 1))} disabled={pending}>
              다음
            </Button>
          ) : (
            <Button onClick={onComplete} disabled={pending} className="gap-2">
              {pending ? (
                <>
                  <Spinner />
                  추천 생성 중...
                </>
              ) : (
                "완료하고 추천 받기"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
