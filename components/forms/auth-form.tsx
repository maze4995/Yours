"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Code2, User } from "lucide-react";
import { signInAction, signUpAction } from "@/lib/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Mode = "signin" | "signup";
type SignupRole = "USER" | "MAKER";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="#3C1E1E">
      <path d="M12 3C6.477 3 2 6.582 2 11c0 2.812 1.694 5.283 4.25 6.752L5.2 21l4.068-2.14C10.075 19.1 11.021 19.2 12 19.2c5.523 0 10-3.582 10-8.2C22 6.582 17.523 3 12 3z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signupRole, setSignupRole] = useState<SignupRole>("USER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleEmailSubmit = () => {
    startTransition(async () => {
      if (mode === "signin") {
        const result = await signInAction({ email, password });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("로그인되었습니다.");
        router.push(result.data.nextPath as never);
        router.refresh();
        return;
      }

      const result = await signUpAction({ email, password, role: signupRole });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("회원가입이 완료되었습니다.");
      router.push(result.data.nextPath as never);
      router.refresh();
    });
  };

  const handleSocialLogin = (provider: "google" | "github" | "kakao") => {
    startTransition(async () => {
      if (mode === "signup") {
        document.cookie = `oauth_intended_role=${signupRole}; path=/; max-age=300; SameSite=Lax`;
        document.cookie = "oauth_flow_mode=signup; path=/; max-age=300; SameSite=Lax";
      } else {
        document.cookie = "oauth_intended_role=; path=/; max-age=0";
        document.cookie = "oauth_flow_mode=signin; path=/; max-age=300; SameSite=Lax";
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error(error.message);
      }
    });
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "signin" ? "로그인" : "회원가입"}</CardTitle>
        <CardDescription>이메일 또는 소셜 계정으로 시작할 수 있습니다.</CardDescription>
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

        {mode === "signup" ? (
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
                  <p className="font-medium">일반 사용자</p>
                  <p className="text-xs opacity-70">AI 추천과 개발 의뢰</p>
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
                  <p className="font-medium">개발자</p>
                  <p className="text-xs opacity-70">입찰과 프로젝트 수행</p>
                </div>
              </button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => handleSocialLogin("google")} disabled={pending}>
            <GoogleIcon />
            Google로 계속하기
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-[#FEE500] bg-[#FEE500] text-[#3C1E1E] hover:border-[#F5DC00] hover:bg-[#F5DC00] dark:bg-[#FEE500] dark:text-[#3C1E1E]"
            onClick={() => handleSocialLogin("kakao")}
            disabled={pending}
          >
            <KakaoIcon />
            카카오로 계속하기
          </Button>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={() => handleSocialLogin("github")} disabled={pending}>
            <GithubIcon />
            GitHub로 계속하기
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">또는 이메일로</span>
          </div>
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

        <Button className="w-full" onClick={handleEmailSubmit} disabled={pending}>
          {pending ? (
            <span className="flex items-center gap-2">
              <Spinner />
              처리 중...
            </span>
          ) : mode === "signin" ? (
            "로그인"
          ) : signupRole === "MAKER" ? (
            "개발자로 가입하기"
          ) : (
            "회원가입"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
