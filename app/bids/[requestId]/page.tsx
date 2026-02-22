import Link from "next/link";
import { notFound } from "next/navigation";
import { BidForm } from "@/components/forms/bid-form";
import { SelectBidButton } from "@/components/bids/select-bid-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";

type BidsPageProps = {
  params: Promise<{ requestId: string }>;
};

export default async function BidsPage({ params }: BidsPageProps) {
  const { requestId } = await params;
  const { supabase, user } = await requireAuth();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profile?.role;

  const { data: request } = await supabase.from("requests").select("*").eq("id", requestId).maybeSingle();
  const isOwner = Boolean(request && request.user_id === user.id);

  if (isOwner) {
    const { data: bids } = await supabase
      .from("bids")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(10);

    const makerIds = (bids ?? []).map((bid) => bid.maker_id);
    const { data: makers } =
      makerIds.length > 0
        ? await supabase
            .from("maker_profiles")
            .select("user_id, display_name, headline, is_verified, skills, portfolio_links, rating")
            .in("user_id", makerIds)
        : { data: [] as Array<Record<string, unknown>> };

    const makerMap = new Map((makers ?? []).map((maker) => [maker.user_id as string, maker]));

    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">입찰 비교</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            가격뿐 아니라 납기, 접근 방식, 유사 경험, 유지관리 옵션을 함께 비교하세요.
          </p>
        </div>

        {(bids ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">아직 제출된 입찰이 없습니다.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {(bids ?? []).map((bid) => {
              const maker = makerMap.get(bid.maker_id);
              return (
                <Card key={bid.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-lg">{(maker?.display_name as string) ?? "Maker"}</CardTitle>
                      <Badge variant={bid.status === "accepted" ? "success" : "secondary"}>{bid.status}</Badge>
                    </div>
                    <CardDescription>{(maker?.headline as string) ?? "개발자 소개 미등록"}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>
                      <strong>가격:</strong> {bid.price}
                    </p>
                    <p>
                      <strong>납기:</strong> {bid.delivery_days}일
                    </p>
                    <p>
                      <strong>접근 방식:</strong> {bid.approach_summary}
                    </p>
                    <p>
                      <strong>유지관리:</strong> {bid.maintenance_option}
                    </p>
                    <p>
                      <strong>포트폴리오:</strong>{" "}
                      {bid.portfolio_link ? (
                        <a
                          href={bid.portfolio_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          링크 보기
                        </a>
                      ) : (
                        "미입력"
                      )}
                    </p>
                    {request.status === "open" ? <SelectBidButton requestId={requestId} bidId={bid.id} /> : null}
                    <Link href={`/makers/${bid.maker_id}`} className="text-sm text-primary underline">
                      개발자 프로필 보기
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (role !== "MAKER") {
    notFound();
  }

  const { data: makerProfile } = await supabase
    .from("maker_profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: openRequests } = await supabase.rpc("rpc_list_open_requests", {
    limit_count: 100,
    offset_count: 0
  });
  const target = (openRequests ?? []).find(
    (candidate: { request_id: string }) => candidate.request_id === requestId
  );

  if (!target) {
    notFound();
  }

  const { data: myBid } = await supabase
    .from("bids")
    .select("*")
    .eq("request_id", requestId)
    .eq("maker_id", user.id)
    .maybeSingle();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">요청 입찰</h1>
        <p className="mt-2 text-sm text-muted-foreground">검증된 Maker만 입찰할 수 있습니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{target.title}</CardTitle>
          <CardDescription>{target.summary}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          예산: {target.budget_min ?? "-"} ~ {target.budget_max ?? "-"} / 마감: {target.deadline_date ?? "-"}
        </CardContent>
      </Card>

      {!makerProfile?.is_verified ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            현재 계정은 검증된 Maker가 아니어서 입찰할 수 없습니다.
          </CardContent>
        </Card>
      ) : myBid ? (
        <Card>
          <CardHeader>
            <CardTitle>내 입찰</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>가격: {myBid.price}</p>
            <p>납기: {myBid.delivery_days}일</p>
            <p>상태: {myBid.status}</p>
          </CardContent>
        </Card>
      ) : (
        <BidForm requestId={requestId} />
      )}
    </section>
  );
}
