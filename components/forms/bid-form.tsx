"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitBidAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type BidFormProps = {
  requestId: string;
};

export function BidForm({ requestId }: BidFormProps) {
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [approachSummary, setApproachSummary] = useState("");
  const [maintenanceOption, setMaintenanceOption] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const router = useRouter();

  const onSubmit = () => {
    startTransition(async () => {
      const result = await submitBidAction(requestId, {
        price: Number(price),
        deliveryDays: Number(deliveryDays),
        approachSummary,
        maintenanceOption,
        portfolioLink: portfolioLink || null
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("입찰이 제출되었습니다.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold">입찰 제출</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">가격</Label>
          <Input id="price" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDays">납기(일)</Label>
          <Input
            id="deliveryDays"
            type="number"
            value={deliveryDays}
            onChange={(event) => setDeliveryDays(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="approachSummary">접근 방식 요약</Label>
        <Textarea
          id="approachSummary"
          value={approachSummary}
          onChange={(event) => setApproachSummary(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maintenanceOption">유지관리 옵션</Label>
        <Textarea
          id="maintenanceOption"
          value={maintenanceOption}
          onChange={(event) => setMaintenanceOption(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portfolioLink">포트폴리오 링크</Label>
        <Input
          id="portfolioLink"
          value={portfolioLink}
          onChange={(event) => setPortfolioLink(event.target.value)}
          placeholder="https://..."
        />
      </div>
      <Button onClick={onSubmit} disabled={pending} className="gap-2">
        {pending ? (
          <>
            <Spinner />
            제출 중...
          </>
        ) : (
          "입찰 제출"
        )}
      </Button>
    </div>
  );
}
