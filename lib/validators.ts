import { z } from "zod";

const csvArraySchema = z.array(z.string().trim().min(1)).max(20);

export const authSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.")
});

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "이름을 입력해 주세요."),
  jobTitle: z.string().min(2, "직무를 입력해 주세요."),
  industry: z.string().min(2, "산업군을 입력해 주세요."),
  teamSize: z.coerce.number().int().min(1).max(10000),
  painPoints: csvArraySchema.min(1, "불편사항을 최소 1개 입력해 주세요."),
  goals: csvArraySchema.min(1, "목표를 최소 1개 입력해 주세요."),
  currentTools: csvArraySchema.default([]),
  budgetPreference: z.string().min(2, "예산 선호를 입력해 주세요."),
  deadlinePreference: z.string().min(2, "희망 일정을 입력해 주세요.")
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
    (value) =>
      value.budgetMin === null || value.budgetMax === null || value.budgetMin <= value.budgetMax,
    "최소 예산은 최대 예산보다 클 수 없습니다."
  );

export const submitBidSchema = z.object({
  price: z.coerce.number().positive("가격은 0보다 커야 합니다."),
  deliveryDays: z.coerce.number().int().positive("납기는 1일 이상이어야 합니다."),
  approachSummary: z.string().min(20),
  maintenanceOption: z.string().min(5),
  portfolioLink: z.string().url().nullable().optional()
});

export const updateProjectStatusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["active", "delivered", "accepted", "closed"]),
  note: z.string().max(500).optional()
});
