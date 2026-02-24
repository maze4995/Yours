"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Code2, User } from "lucide-react";
import { selectSocialRoleAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type RoleOption = "USER" | "MAKER";

export function SocialRoleForm() {
  const [selectedRole, setSelectedRole] = useState<RoleOption>("USER");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      try {
        const result = await selectSocialRoleAction(selectedRole);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success("가입 유형이 설정되었습니다.");
        router.replace(result.data.nextPath as never);
      } catch (error) {
        const message = error instanceof Error ? error.message : "진행 중 오류가 발생했습니다.";
        toast.error(message);
      }
    });
  };

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedRole("USER")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              selectedRole === "USER"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <p className="font-semibold">일반 사용자</p>
            </div>
            <p className="text-sm text-muted-foreground">
              AI 추천 결과 확인과 맞춤 개발 요청까지 이어서 진행합니다.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("MAKER")}
            className={`rounded-xl border p-4 text-left transition-colors ${
              selectedRole === "MAKER"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <p className="font-semibold">개발자</p>
            </div>
            <p className="text-sm text-muted-foreground">
              의뢰 게시판 조회, 입찰 제안, 프로젝트 수행을 진행합니다.
            </p>
          </button>
        </div>

        <Button onClick={submit} disabled={pending} className="w-full">
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              설정 중...
            </span>
          ) : selectedRole === "MAKER" ? (
            "개발자로 계속하기"
          ) : (
            "일반 사용자로 계속하기"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
