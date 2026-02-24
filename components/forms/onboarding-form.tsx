"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeOnboardingAndRecommendAction, saveOnboardingAction } from "@/lib/actions";
import type { ProfileInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { LoadingOverlay } from "@/components/results/loading-overlay";

type OnboardingFormProps = {
  initialValue?: Partial<ProfileInput>;
};

type OnboardingState = {
  fullName: string;
  jobTitle: string;
  industry: string;
  teamSize: number;
  painPoints: string[];
  mainPainDetail: string;
  goals: string[];
  currentTools: string[];
  budgetPreference: string;
  deadlinePreference: string;
};

const TEAM_SIZE_OPTIONS = [
  { label: "혼자", value: 1 },
  { label: "2~5명", value: 3 },
  { label: "6~15명", value: 10 },
  { label: "16~50명", value: 30 },
  { label: "50명+", value: 50 },
];

const JOB_OPTIONS = ["마케터", "개발자", "창업자/대표", "운영/기획", "디자이너", "기타"];
const INDUSTRY_OPTIONS = [
  "이커머스", "교육", "SaaS (구독형 서비스)", "제조", "유통/물류", "금융", "헬스케어", "기타"
];
const PAIN_POINT_OPTIONS = [
  "수작업이 너무 많아요",
  "고객 문의 대응 느림",
  "협업·커뮤니케이션 누락",
  "데이터가 흩어져 있어요",
  "보고서 작성 번거로움",
  "비용 추적 어려움",
  "채용/인사 관리 복잡",
  "일정 조율이 힘들어요",
];
const GOAL_OPTIONS = [
  "반복 작업 자동화",
  "고객 응답 속도 개선",
  "매출/전환율 높이기",
  "팀 협업 개선",
  "데이터 한눈에 보기",
  "비용 절감",
];
const TOOL_OPTIONS = [
  "엑셀/구글시트",
  "노션",
  "슬랙",
  "카카오톡",
  "Jira (업무관리)",
  "Trello (할일보드)",
  "없음",
];
const BUDGET_OPTIONS: { label: string; description: string }[] = [
  { label: "무료 / 무료 플랜 위주", description: "돈 안 쓰고 해결하고 싶어요" },
  { label: "월 10만원 이하", description: "소규모 팀 SaaS 구독 수준" },
  { label: "월 10~50만원", description: "중소기업 솔루션 구독 수준" },
  { label: "월 50만원 이상 / 일회성 투자 가능", description: "맞춤 개발도 고려 중이에요" },
];
const DEADLINE_OPTIONS: { label: string; description: string }[] = [
  { label: "2주 이내", description: "긴급한 상황이에요" },
  { label: "한 달 이내", description: "빠르게 해결하고 싶어요" },
  { label: "두 달 이내", description: "여유 있게 검토하고 싶어요" },
  { label: "급하지 않아요", description: "천천히 좋은 방법을 찾고 싶어요" },
];

const TOTAL_STEPS = 10;

function getInitialState(initialValue?: Partial<ProfileInput>): OnboardingState {
  return {
    fullName: initialValue?.fullName ?? "",
    jobTitle: initialValue?.jobTitle ?? "",
    industry: initialValue?.industry ?? "",
    teamSize: initialValue?.teamSize ?? 0,
    painPoints: initialValue?.painPoints ?? [],
    mainPainDetail: initialValue?.mainPainDetail ?? "",
    goals: initialValue?.goals ?? [],
    currentTools: initialValue?.currentTools ?? [],
    budgetPreference: initialValue?.budgetPreference ?? "",
    deadlinePreference: initialValue?.deadlinePreference ?? "",
  };
}

function SelectableCard({
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
        "w-full rounded-xl border-2 px-4 py-4 text-left transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
      )}
    >
      <span className="block text-sm font-medium">{label}</span>
      {description && (
        <span className={cn("mt-0.5 block text-xs", selected ? "text-primary/70" : "text-muted-foreground")}>
          {description}
        </span>
      )}
    </button>
  );
}

function HintBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary/80 leading-relaxed">
      💡 {children}
    </div>
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

export function OnboardingForm({ initialValue }: OnboardingFormProps) {
  const [state, setState] = useState<OnboardingState>(() => getInitialState(initialValue));
  const [step, setStep] = useState(1);
  const [animKey, setAnimKey] = useState(0);
  const [customJob, setCustomJob] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [customPain, setCustomPain] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customTool, setCustomTool] = useState("");
  const [pending, startTransition] = useTransition();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) inputRef.current?.focus();
  }, [step]);

  const goNext = () => {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goPrev = () => {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const toggleArray = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return state.fullName.trim().length >= 2;
      case 2: return state.jobTitle.trim().length >= 2;
      case 3: return state.industry.trim().length >= 2;
      case 4: return state.teamSize > 0;
      case 5: return state.painPoints.length >= 1;
      case 6: return true; // mainPainDetail is optional
      case 7: return state.goals.length >= 1;
      case 8: return state.currentTools.length >= 1;
      case 9: return state.budgetPreference.trim().length >= 2;
      case 10: return state.deadlinePreference.trim().length >= 2;
      default: return false;
    }
  };

  const addCustomChip = (
    field: "painPoints" | "goals" | "currentTools",
    value: string,
    clear: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      [field]: prev[field].includes(trimmed) ? prev[field] : [...prev[field], trimmed],
    }));
    clear();
  };

  const payload: ProfileInput = {
    fullName: state.fullName.trim(),
    jobTitle: state.jobTitle.trim(),
    industry: state.industry.trim(),
    teamSize: state.teamSize || 1,
    painPoints: state.painPoints,
    mainPainDetail: state.mainPainDetail.trim() || undefined,
    goals: state.goals,
    currentTools: state.currentTools,
    budgetPreference: state.budgetPreference.trim(),
    deadlinePreference: state.deadlinePreference.trim(),
  };

  const onComplete = () => {
    setIsAnalyzing(true);
    startTransition(async () => {
      const result = await completeOnboardingAndRecommendAction(payload);
      if (!result.ok) {
        setIsAnalyzing(false);
        toast.error(result.message);
        return;
      }
      toast.success("추천 결과를 준비했어요.");
      router.push(result.data.nextPath as never);
      router.refresh();
    });
  };

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

  const progress = ((step - 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {isAnalyzing && <LoadingOverlay />}
      {/* 진행 바 */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{step} / {TOTAL_STEPS}</span>
          <button type="button" onClick={onSave} disabled={pending} className="text-xs hover:text-foreground transition-colors">
            임시 저장
          </button>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* 스텝 콘텐츠 */}
      <div key={animKey} className="animate-fade-in-up space-y-8">

        {/* Step 1: 이름 */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-3xl font-bold leading-tight">안녕하세요!</p>
              <p className="text-3xl font-bold leading-tight text-primary">어떤 이름으로 불러드릴까요?</p>
              <p className="text-sm text-muted-foreground">입력하신 정보는 추천 결과를 더 잘 맞춤화하는 데만 사용돼요.</p>
            </div>
            <Input
              ref={inputRef}
              value={state.fullName}
              onChange={(e) => setState((prev) => ({ ...prev, fullName: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && canAdvance() && goNext()}
              placeholder="이름을 입력해 주세요"
              className="h-14 text-lg"
            />
          </div>
        )}

        {/* Step 2: 직군 */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-3xl font-bold leading-tight">
              주로 <span className="text-primary">어떤 일</span>을 하시나요?
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {JOB_OPTIONS.map((option) => (
                <SelectableCard
                  key={option}
                  label={option}
                  selected={option === "기타" ? false : state.jobTitle === option}
                  onClick={() => {
                    if (option === "기타") {
                      setState((prev) => ({ ...prev, jobTitle: "" }));
                    } else {
                      setState((prev) => ({ ...prev, jobTitle: option }));
                    }
                  }}
                />
              ))}
            </div>
            {(state.jobTitle === "" || !JOB_OPTIONS.slice(0, -1).includes(state.jobTitle)) && (
              <Input
                value={customJob}
                onChange={(e) => {
                  setCustomJob(e.target.value);
                  setState((prev) => ({ ...prev, jobTitle: e.target.value }));
                }}
                placeholder="직접 입력 (예: 프리랜서 디자이너)"
                className="h-12"
              />
            )}
          </div>
        )}

        {/* Step 3: 업종 */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-3xl font-bold leading-tight">
              어떤 <span className="text-primary">업종</span>에서 일하시나요?
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INDUSTRY_OPTIONS.map((option) => (
                <SelectableCard
                  key={option}
                  label={option}
                  selected={option === "기타" ? false : state.industry === option}
                  onClick={() => {
                    if (option === "기타") {
                      setState((prev) => ({ ...prev, industry: "" }));
                    } else {
                      setState((prev) => ({ ...prev, industry: option }));
                    }
                  }}
                />
              ))}
            </div>
            {(state.industry === "" || !INDUSTRY_OPTIONS.slice(0, -1).includes(state.industry)) && (
              <Input
                value={customIndustry}
                onChange={(e) => {
                  setCustomIndustry(e.target.value);
                  setState((prev) => ({ ...prev, industry: e.target.value }));
                }}
                placeholder="직접 입력 (예: 부동산, 법률)"
                className="h-12"
              />
            )}
          </div>
        )}

        {/* Step 4: 팀 규모 */}
        {step === 4 && (
          <div className="space-y-6">
            <p className="text-3xl font-bold leading-tight">
              함께 일하는 <span className="text-primary">팀 규모</span>는요?
            </p>
            <div className="flex flex-wrap gap-3">
              {TEAM_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, teamSize: option.value }))}
                  className={cn(
                    "flex-1 rounded-xl border-2 px-4 py-5 text-center text-sm font-semibold transition-all duration-150",
                    state.teamSize === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/60"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: 불편사항 */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                요즘 <span className="text-primary">가장 불편한 점</span>은?
              </p>
              <p className="text-sm text-muted-foreground">해당하는 것을 모두 선택하세요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PAIN_POINT_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={state.painPoints.includes(option)}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      painPoints: toggleArray(prev.painPoints, option),
                    }))
                  }
                />
              ))}
            </div>
            <HintBox>
              더 구체적으로 입력할수록 AI 분석이 정확해져요. 예: &ldquo;매일 주문 50건을 엑셀에 손으로 옮기느라 2시간이 걸려요&rdquo;
            </HintBox>
            <div className="flex gap-2">
              <Input
                value={customPain}
                onChange={(e) => setCustomPain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCustomChip("painPoints", customPain, () => setCustomPain(""));
                  }
                }}
                placeholder="나의 상황을 직접 설명해 주세요 (Enter로 추가)"
                className="h-10"
              />
              <Button
                type="button"
                onClick={() => addCustomChip("painPoints", customPain, () => setCustomPain(""))}
                className="h-10 min-w-24 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                추가
              </Button>
            </div>
            {state.painPoints.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.painPoints.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          painPoints: prev.painPoints.filter((v) => v !== item),
                        }))
                      }
                      className="ml-1 text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: 핵심 불편 상세 (선택) */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                그 중 <span className="text-primary">가장 불편한 것</span>을<br />좀 더 설명해 주세요
              </p>
              <p className="text-sm text-muted-foreground">
                선택사항이에요 — 더 구체적일수록 AI 분석이 정확해집니다
              </p>
            </div>
            <HintBox>
              예: &ldquo;매일 아침 고객 주문 50건을 엑셀에 손으로 옮기는 데 2시간이 걸려요. 실수도 많고요&rdquo;
            </HintBox>
            <textarea
              value={state.mainPainDetail}
              onChange={(e) => setState((prev) => ({ ...prev, mainPainDetail: e.target.value }))}
              placeholder="매일 반복하는 그 작업을 적어주세요 (건너뛰어도 됩니다)"
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {state.painPoints.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-primary">앞에서 선택한 불편사항</p>
                <div className="flex flex-wrap gap-2">
                  {state.painPoints.map((p) => (
                    <span key={p} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 7: 목표 */}
        {step === 7 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                꼭 개선하고 싶은 <span className="text-primary">목표</span>는?
              </p>
              <p className="text-sm text-muted-foreground">해당하는 것을 모두 선택하세요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={state.goals.includes(option)}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      goals: toggleArray(prev.goals, option),
                    }))
                  }
                />
              ))}
            </div>
            <HintBox>
              구체적인 목표를 추가하면 더 정확한 추천을 받을 수 있어요. 예: &ldquo;주문 처리 시간을 하루 2시간에서 30분으로 줄이고 싶어요&rdquo;
            </HintBox>
            <div className="flex gap-2">
              <Input
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCustomChip("goals", customGoal, () => setCustomGoal(""));
                  }
                }}
                placeholder="목표를 직접 설명해 주세요 (Enter로 추가)"
                className="h-10"
              />
              <Button
                type="button"
                onClick={() => addCustomChip("goals", customGoal, () => setCustomGoal(""))}
                className="h-10 min-w-24 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                추가
              </Button>
            </div>
            {state.goals.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.goals.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          goals: prev.goals.filter((v) => v !== item),
                        }))
                      }
                      className="ml-1 text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 8: 현재 툴 */}
        {step === 8 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                지금 쓰고 있는 <span className="text-primary">도구</span>가 있나요?
              </p>
              <p className="text-sm text-muted-foreground">도구를 안 쓰면 없음을 선택하세요</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOOL_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={state.currentTools.includes(option)}
                  onClick={() => {
                    if (option === "없음") {
                      setState((prev) => ({
                        ...prev,
                        currentTools: prev.currentTools.includes("없음") ? [] : ["없음"],
                      }));
                    } else {
                      setState((prev) => ({
                        ...prev,
                        currentTools: toggleArray(
                          prev.currentTools.filter((v) => v !== "없음"),
                          option
                        ),
                      }));
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customTool}
                onChange={(e) => setCustomTool(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCustomChip("currentTools", customTool, () => setCustomTool(""));
                  }
                }}
                placeholder="직접 입력 후 Enter (예: 구글 워크스페이스)"
                className="h-10"
              />
              <Button
                type="button"
                onClick={() => addCustomChip("currentTools", customTool, () => setCustomTool(""))}
                className="h-10 min-w-24 whitespace-nowrap rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                추가
              </Button>
            </div>
            {state.currentTools.filter((t) => !TOOL_OPTIONS.includes(t)).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {state.currentTools
                  .filter((t) => !TOOL_OPTIONS.includes(t))
                  .map((item) => (
                    <span
                      key={item}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            currentTools: prev.currentTools.filter((v) => v !== item),
                          }))
                        }
                        className="ml-1 text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 9: 예산 */}
        {step === 9 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                적절한 <span className="text-primary">예산 범위</span>는요?
              </p>
              <p className="text-sm text-muted-foreground">소프트웨어 도입 또는 개발 비용 기준이에요</p>
            </div>
            <div className="space-y-3">
              {BUDGET_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.label}
                  label={option.label}
                  description={option.description}
                  selected={state.budgetPreference === option.label}
                  onClick={() => setState((prev) => ({ ...prev, budgetPreference: option.label }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 10: 도입 기간 */}
        {step === 10 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-3xl font-bold leading-tight">
                언제까지 <span className="text-primary">해결</span>되길 원하세요?
              </p>
              <p className="text-sm text-muted-foreground">일정을 알면 더 적합한 방법을 추천할 수 있어요</p>
            </div>
            <div className="space-y-3">
              {DEADLINE_OPTIONS.map((option) => (
                <SelectableCard
                  key={option.label}
                  label={option.label}
                  description={option.description}
                  selected={state.deadlinePreference === option.label}
                  onClick={() => setState((prev) => ({ ...prev, deadlinePreference: option.label }))}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <div className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={step === 1 || pending}
          className="text-muted-foreground"
        >
          ← 이전
        </Button>

        {step < TOTAL_STEPS ? (
          <Button onClick={goNext} disabled={!canAdvance() || pending} size="lg" className="px-10">
            다음 →
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            disabled={!canAdvance() || pending}
            size="lg"
            className="gap-2 px-10"
          >
            {pending ? (
              <>
                <Spinner />
                추천 생성 중...
              </>
            ) : (
              "추천 받기 ✨"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
