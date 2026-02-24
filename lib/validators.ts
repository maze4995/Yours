import { z } from "zod";

const csvArraySchema = z.array(z.string().trim().min(1)).max(20);

export const authSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상 입력해 주세요.")
});

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "이름을 2자 이상 입력해 주세요."),
  jobTitle: z.string().min(2, "직무를 입력해 주세요."),
  industry: z.string().min(2, "업종을 입력해 주세요."),
  teamSize: z.coerce.number().int().min(1).max(10000),
  painPoints: csvArraySchema.min(1, "불편사항을 1개 이상 입력해 주세요."),
  mainPainDetail: z.string().trim().max(2000).optional(),
  goals: csvArraySchema.min(1, "목표를 1개 이상 입력해 주세요."),
  currentTools: csvArraySchema.default([]),
  budgetPreference: z.string().min(2, "예산 범위를 입력해 주세요."),
  deadlinePreference: z.string().min(2, "도입 일정을 입력해 주세요.")
});

export const createRequestSchema = z
  .object({
    title: z.string().min(3),
    summary: z.string().min(10),
    requirements: z.string().min(20),
    budgetMin: z.coerce.number().nonnegative().nullable(),
    budgetMax: z.coerce.number().nonnegative().nullable(),
    deadlineDate: z.string().nullable(),
    priority: z.enum(["low", "medium", "high"]),
    recommendationId: z.string().uuid().nullable().optional()
  })
  .refine(
    (value) => value.budgetMin === null || value.budgetMax === null || value.budgetMin <= value.budgetMax,
    "최소 예산은 최대 예산보다 클 수 없습니다."
  );

export const submitBidSchema = z.object({
  price: z.coerce.number().positive("가격은 0보다 커야 합니다."),
  deliveryDays: z.coerce.number().int().positive("납기일은 1일 이상이어야 합니다."),
  approachSummary: z.string().min(20),
  maintenanceOption: z.string().min(5),
  portfolioLink: z.string().url().nullable().optional()
});

export const updateProjectStatusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["active", "delivered", "accepted", "closed"]),
  note: z.string().max(500).optional()
});

export const makerOnboardingSchema = z.object({
  displayName: z.string().min(2, "표시 이름을 입력해 주세요.").max(50, "표시 이름은 50자 이하로 입력해 주세요."),
  headline: z.string().max(100, "한 줄 소개는 100자 이하로 입력해 주세요.").optional().default(""),
  skills: z
    .array(z.string().trim().min(1))
    .min(1, "기술 스택을 1개 이상 입력해 주세요.")
    .max(20, "기술 스택은 최대 20개까지 입력할 수 있습니다."),
  portfolioLinks: z
    .array(z.string().url("올바른 URL 형식을 입력해 주세요."))
    .max(3, "포트폴리오 링크는 최대 3개까지 입력할 수 있습니다.")
    .default([])
});
