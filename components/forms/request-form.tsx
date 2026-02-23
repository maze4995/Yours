"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRequestAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles, ChevronRight, Edit2 } from "lucide-react";
import type { DraftOutput } from "@/app/api/requests/draft/route";

type RequestFormProps = {
  recommendationId?: string | null;
};

type WizardState = {
  problem: string;
  currentSolution: string;
  desiredFeatures: string[];
  budgetRange: string;
  deadline: string;
};

const FEATURE_OPTIONS = [
  "반복 작업 자동으로 처리",
  "고객에게 알림/메시지 자동발송",
  "데이터 한눈에 모아보기",
  "고객 정보 관리",
  "주문/재고 관리",
  "결제 처리",
  "직원/팀 관리",
  "보고서 자동 생성",
];

const CURRENT_SOLUTION_OPTIONS = [
  "엑셀/스프레드시트로 관리",
  "카카오톡/문자로 처리",
  "종이에 수기로 기록",
  "다른 프로그램 사용 중",
  "해결 방법 없이 방치",
];

const BUDGET_OPTIONS = [
  { label: "50만원 이하", description: "일단 저렴하게 시작하고 싶어요" },
  { label: "50~200만원", description: "적당한 비용으로 제대로 만들고 싶어요" },
  { label: "200~500만원", description: "퀄리티 있는 결과물을 원해요" },
  { label: "500만원 이상", description: "규모 있는 시스템이 필요해요" },
  { label: "협의 가능", description: "먼저 이야기해보고 싶어요" },
];

const DEADLINE_OPTIONS = [
  { label: "2주 이내", description: "매우 긴급한 상황이에요" },
  { label: "한 달 이내", description: "빠르게 해결하고 싶어요" },
  { label: "2~3개월", description: "여유 있게 잘 만들고 싶어요" },
  { label: "급하지 않아요", description: "시간을 충분히 갖고 싶어요" },
];

const TOTAL_STEPS = 5;

function SelectCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      )}
    >
      <span className="block text-sm font-semibold">{label}</span>
      {description && (
        <span className={cn("mt-0.5 block text-xs", selected ? "text-primary/70" : "text-muted-foreground")}>
          {description}
        </span>
      )}
    </button>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-150",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      )}
    >
      {label}
    </button>
  );
}

export function RequestForm({ recommendationId }: RequestFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [customSolution, setCustomSolution] = useState("");
  const [customFeature, setCustomFeature] = useState("");

  const [wizard, setWizard] = useState<WizardState>({
    problem: "",
    currentSolution: "",
    desiredFeatures: [],
    budgetRange: "",
    deadline: "",
  });

  // Draft state
  const [isDrafting, setIsDrafting] = useState(false);
  const [draft, setDraft] = useState<DraftOutput | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editRequirements, setEditRequirements] = useState("");

  const goNext = () => {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goPrev = () => {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleFeature = (f: string) => {
    setWizard((prev) => ({
      ...prev,
      desiredFeatures: prev.desiredFeatures.includes(f)
        ? prev.desiredFeatures.filter((v) => v !== f)
        : [...prev.desiredFeatures, f],
    }));
  };

  const addCustomFeature = () => {
    const t = customFeature.trim();
    if (!t) return;
    setWizard((prev) => ({
      ...prev,
      desiredFeatures: prev.desiredFeatures.includes(t) ? prev.desiredFeatures : [...prev.desiredFeatures, t],
    }));
    setCustomFeature("");
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return wizard.problem.trim().length >= 10;
      case 2: return wizard.currentSolution.trim().length >= 1;
      case 3: return wizard.desiredFeatures.length >= 1;
      case 4: return wizard.budgetRange.length > 0;
      case 5: return wizard.deadline.length > 0;
      default: return false;
    }
  };

  const generateDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch("/api/requests/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizard),
      });
      if (!res.ok) throw new Error("초안 생성 실패");
      const data: DraftOutput = await res.json();
      setDraft(data);
      setEditTitle(data.title);
      setEditSummary(data.summary);
      setEditRequirements(data.requirements);
    } catch {
      toast.error("초안 생성 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setIsDrafting(false);
    }
  };

  const onSubmit = () => {
    if (!draft) return;
    startTransition(async () => {
      const result = await createRequestAction({
        title: editTitle,
        summary: editSummary,
        requirements: editRequirements,
        budgetMin: draft.budgetMin,
        budgetMax: draft.budgetMax,
        deadlineDate: draft.deadlineDate,
        priority: draft.priority,
        recommendationId: recommendationId ?? null,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("개발자들에게 의뢰가 전달됐어요!");
      router.push(`/request/${result.data.requestId}` as never);
      router.refresh();
    });
  };

  const progress = draft ? 100 : ((step - 1) / TOTAL_STEPS) * 100;

  // ── 초안 완성 화면 ──
  if (draft) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">AI가 의뢰서 초안을 작성했어요</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            내용을 확인하고 수정한 뒤 제출하면, 검증된 개발자들에게 바로 전달됩니다.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">의뢰서 초안</span>
            <span className="flex items-center gap-1 text-xs text-primary">
              <Edit2 className="h-3 w-3" /> 직접 수정 가능해요
            </span>
          </div>
          <div className="space-y-5 px-5 py-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">제목</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-base font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">요약</label>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
                className="resize-none text-sm leading-relaxed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">상세 내용</label>
              <Textarea
                value={editRequirements}
                onChange={(e) => setEditRequirements(e.target.value)}
                rows={10}
                className="resize-none text-sm leading-relaxed font-mono"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">예산 · 일정 (자동 설정됨)</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-background border px-3 py-1">
              예산: {wizard.budgetRange}
            </span>
            <span className="rounded-full bg-background border px-3 py-1">
              일정: {wizard.deadline}
            </span>
            <span className="rounded-full bg-background border px-3 py-1">
              우선순위: {draft.priority === "high" ? "높음" : draft.priority === "medium" ? "중간" : "낮음"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDraft(null)} className="flex-1">
            처음부터 다시 작성
          </Button>
          <Button onClick={onSubmit} disabled={pending || !editTitle || !editSummary || !editRequirements} className="flex-1 gap-2">
            {pending ? <><Spinner /> 제출 중...</> : <>개발자에게 전달하기 <ChevronRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    );
  }

  // ── 위저드 화면 ──
  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* 진행 바 */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>질문 {step} / {TOTAL_STEPS}</span>
          <span className="text-xs">AI가 의뢰서를 작성해드려요</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div key={animKey} className="animate-fade-in-up space-y-8">

        {/* Step 1: 문제 설명 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">
                어떤 <span className="text-primary">문제</span>를 해결하고 싶으세요?
              </p>
              <p className="text-sm text-muted-foreground">
                일상적인 말로 편하게 적어주세요. 기술 용어 몰라도 괜찮아요.
              </p>
            </div>
            <Textarea
              value={wizard.problem}
              onChange={(e) => setWizard((prev) => ({ ...prev, problem: e.target.value }))}
              placeholder={`예시:\n"매일 카카오톡으로 주문을 받고, 엑셀에 손으로 옮기는 게 너무 힘들어요. 자동으로 정리되면 좋겠어요."\n"직원들 근태를 종이에 기록하는데, 급여 계산할 때마다 실수가 생겨요."`}
              rows={6}
              className="text-sm leading-relaxed resize-none"
            />
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary/80">
              💡 구체적인 상황을 적을수록 AI가 더 정확한 의뢰서를 작성해줘요
            </div>
          </div>
        )}

        {/* Step 2: 현재 해결 방법 */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">
                지금은 어떻게 <span className="text-primary">해결</span>하고 있나요?
              </p>
              <p className="text-sm text-muted-foreground">가장 가까운 방법을 선택하거나 직접 입력하세요</p>
            </div>
            <div className="space-y-3">
              {CURRENT_SOLUTION_OPTIONS.map((option) => (
                <SelectCard
                  key={option}
                  label={option}
                  selected={wizard.currentSolution === option}
                  onClick={() => {
                    setWizard((prev) => ({ ...prev, currentSolution: option }));
                    setCustomSolution("");
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customSolution}
                onChange={(e) => {
                  setCustomSolution(e.target.value);
                  setWizard((prev) => ({ ...prev, currentSolution: e.target.value }));
                }}
                placeholder="직접 설명해 주세요"
                className="h-10"
              />
            </div>
          </div>
        )}

        {/* Step 3: 원하는 기능 */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">
                어떤 <span className="text-primary">기능</span>이 있으면 좋겠어요?
              </p>
              <p className="text-sm text-muted-foreground">여러 개 선택 가능해요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={wizard.desiredFeatures.includes(option)}
                  onClick={() => toggleFeature(option)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomFeature()}
                placeholder="원하는 기능을 직접 입력 (Enter로 추가)"
                className="h-10"
              />
              <Button type="button" variant="outline" onClick={addCustomFeature}>추가</Button>
            </div>
            {wizard.desiredFeatures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {wizard.desiredFeatures.map((f) => (
                  <span key={f} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <CheckCircle2 className="h-3 w-3" /> {f}
                    <button type="button" onClick={() => toggleFeature(f)} className="ml-1 text-primary/60 hover:text-primary">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: 예산 */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">
                <span className="text-primary">예산</span>은 어느 정도 생각하세요?
              </p>
              <p className="text-sm text-muted-foreground">개발자가 견적을 맞추는 데 참고해요</p>
            </div>
            <div className="space-y-3">
              {BUDGET_OPTIONS.map((option) => (
                <SelectCard
                  key={option.label}
                  label={option.label}
                  description={option.description}
                  selected={wizard.budgetRange === option.label}
                  onClick={() => setWizard((prev) => ({ ...prev, budgetRange: option.label }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 5: 일정 */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">
                <span className="text-primary">언제까지</span> 해결되길 원하세요?
              </p>
              <p className="text-sm text-muted-foreground">개발 기간 결정에 참고해요</p>
            </div>
            <div className="space-y-3">
              {DEADLINE_OPTIONS.map((option) => (
                <SelectCard
                  key={option.label}
                  label={option.label}
                  description={option.description}
                  selected={wizard.deadline === option.label}
                  onClick={() => setWizard((prev) => ({ ...prev, deadline: option.label }))}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" onClick={goPrev} disabled={step === 1 || isDrafting} className="text-muted-foreground">
          ← 이전
        </Button>

        {step < TOTAL_STEPS ? (
          <Button onClick={goNext} disabled={!canAdvance()} size="lg" className="px-10">
            다음 →
          </Button>
        ) : (
          <Button
            onClick={generateDraft}
            disabled={!canAdvance() || isDrafting}
            size="lg"
            className="gap-2 px-8"
          >
            {isDrafting ? (
              <><Spinner /> AI가 의뢰서 작성 중...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> AI 의뢰서 초안 생성</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
