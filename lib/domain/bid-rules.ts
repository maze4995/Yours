import type { RequestStatus, UserRole } from "@/lib/types";

type SubmitBidRuleInput = {
  role: UserRole;
  isVerifiedMaker: boolean;
  requestStatus: RequestStatus | null;
  hasExistingBid: boolean;
};

export function canSubmitBid(input: SubmitBidRuleInput): { allowed: boolean; reason?: string } {
  if (input.role !== "MAKER") {
    return { allowed: false, reason: "개발자 계정만 입찰 가능합니다." };
  }

  if (!input.isVerifiedMaker) {
    return { allowed: false, reason: "검증된 개발자만 입찰 가능합니다." };
  }

  if (input.requestStatus !== "open") {
    return { allowed: false, reason: "요청이 열려있지 않습니다." };
  }

  if (input.hasExistingBid) {
    return { allowed: false, reason: "이미 입찰을 제출했습니다." };
  }

  return { allowed: true };
}

export function canSelectBid(requestStatus: RequestStatus): { allowed: boolean; reason?: string } {
  if (requestStatus !== "open") {
    return { allowed: false, reason: "open 상태에서만 입찰 선택이 가능합니다." };
  }

  return { allowed: true };
}
