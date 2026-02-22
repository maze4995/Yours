"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInAction, signUpAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      const action = mode === "signin" ? signInAction : signUpAction;
      const result = await action({ email, password });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(mode === "signin" ? "로그인 완료" : "회원가입 완료");
      router.push(result.data.nextPath as never);
      router.refresh();
    });
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "로그인" : "회원가입"}</CardTitle>
        <CardDescription>이메일/비밀번호로 간단히 시작하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === "signin" ? "default" : "outline"} onClick={() => setMode("signin")}>
            로그인
          </Button>
          <Button variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
            회원가입
          </Button>
        </div>

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
          ) : (
            "회원가입"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
