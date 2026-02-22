import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl space-y-4 text-center">
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다.</h1>
      <p className="text-sm text-muted-foreground">요청한 리소스가 없거나 접근 권한이 없습니다.</p>
      <Link href="/">
        <Button>홈으로 이동</Button>
      </Link>
    </section>
  );
}
