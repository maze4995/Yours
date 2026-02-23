"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Code2, User } from "lucide-react";
import { signInAction, signUpAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Mode = "signin" | "signup";
type SignupRole = "USER" | "MAKER";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signupRole, setSignupRole] = useState<SignupRole>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      if (mode === "signin") {
        const result = await signInAction({ email, password });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("로그인 완료");
        router.push(result.data.nextPath as never);
        router.refresh();
      } else {
        const result = await signUpAction({ email, password, role: signupRole });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("회원가입 완료");
        router.push(result.data.nextPath as never);
        router.refresh();
      }
    });
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "로그인" : "회원가입"}</CardTitle>
        <CardDescription>이메일/비밀번호로 간단히 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 로그인 / 회원가입 탭 */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>
            로그인
          </Button>
          <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
            회원가입
          </Button>
        </div>

        {/* 회원가입 시: 역할 선택 */}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label>가입 유형</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignupRole("USER")}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  signupRole === "USER"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <User className="h-5 w-5" />
                <div className="text-center">
                  <p className="font-medium">소프트웨어 추천</p>
                  <p className="text-xs opacity-70">AI 분석으로 맞는 툴 찾기</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSignupRole("MAKER")}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                  signupRole === "MAKER"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Code2 className="h-5 w-5" />
                <div className="text-center">
                  <p className="font-medium">Maker 참여</p>
                  <p className="text-xs opacity-70">개발 의뢰 수주·입찰하기</p>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            type="password"
            placeholder="8자 이상"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              처리 중...
            </span>
          ) : mode === "signin" ? (
            "로그인"
          ) : signupRole === "MAKER" ? (
            "Maker로 가입하기"
          ) : (
            "회원가입"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
