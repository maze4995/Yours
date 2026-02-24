"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Plus, Link as LinkIcon } from "lucide-react";
import { completeMakerOnboardingAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function MakerOnboardingForm() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([""]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    if (skills.length >= 20) {
      toast.error("스킬은 최대 20개까지 입력할 수 있습니다.");
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  const addPortfolioLink = () => {
    if (portfolioLinks.length >= 3) {
      toast.error("포트폴리오 링크는 최대 3개까지 입력할 수 있습니다.");
      return;
    }
    setPortfolioLinks((prev) => [...prev, ""]);
  };

  const updatePortfolioLink = (index: number, value: string) => {
    setPortfolioLinks((prev) => prev.map((link, i) => (i === index ? value : link)));
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!displayName.trim()) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    if (skills.length === 0) {
      toast.error("스킬을 최소 1개 입력해 주세요.");
      return;
    }

    const validLinks = portfolioLinks.filter((link) => link.trim());

    startTransition(async () => {
      const result = await completeMakerOnboardingAction({
        displayName: displayName.trim(),
        headline: headline.trim(),
        skills,
        portfolioLinks: validLinks
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("개발자 프로필이 생성되었습니다!");
      router.push(result.data.nextPath as never);
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardContent className="space-y-5 pt-6">
        {/* 이름 */}
        <div className="space-y-2">
          <Label htmlFor="displayName">
            이름 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="displayName"
            placeholder="홍길동"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
          />
        </div>

        {/* 한줄 소개 */}
        <div className="space-y-2">
          <Label htmlFor="headline">한줄 소개</Label>
          <Input
            id="headline"
            placeholder="예: 풀스택 개발자 · React / Node.js 전문"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* 스킬 */}
        <div className="space-y-2">
          <Label>
            스킬 <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="React, Python 등 (Enter로 추가)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
            />
            <Button type="button" variant="outline" size="sm" onClick={addSkill} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-0.5 rounded-full hover:text-destructive"
                    aria-label={`${skill} 제거`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 포트폴리오 링크 */}
        <div className="space-y-2">
          <Label>포트폴리오 링크 (최대 3개)</Label>
          <div className="space-y-2">
            {portfolioLinks.map((link, index) => (
              <div key={index} className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="https://github.com/yourname"
                    value={link}
                    onChange={(e) => updatePortfolioLink(index, e.target.value)}
                    className="pl-8"
                  />
                </div>
                {portfolioLinks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePortfolioLink(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {portfolioLinks.length < 3 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addPortfolioLink}
              className="gap-1 text-xs text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              링크 추가
            </Button>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          가입 후 관리자 검증이 완료되면 의뢰에 입찰할 수 있습니다. 포트폴리오 링크를 입력하면 검증에 도움이 됩니다.
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              처리 중...
            </span>
          ) : (
            "개발자 프로필 완성하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
