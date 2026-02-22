export type UserRole = "USER" | "MAKER" | "ADMIN";
export type RequestStatus = "draft" | "open" | "selected" | "canceled";
export type BidStatus = "submitted" | "withdrawn" | "accepted" | "rejected";
export type ProjectStatus = "active" | "delivered" | "accepted" | "closed";
export type PriorityLevel = "low" | "medium" | "high";
export type FitDecision = "software_fit" | "custom_build";

export type ProfileInput = {
  fullName: string;
  jobTitle: string;
  industry: string;
  teamSize: number;
  painPoints: string[];
  goals: string[];
  currentTools: string[];
  budgetPreference: string;
  deadlinePreference: string;
};

export type SoftwareCatalogItem = {
  id: string;
  name: string;
  category: string;
  target_roles: string[];
  tags: string[];
  description: string;
  pricing_model: string | null;
  website_url: string | null;
  key_features: string[];
  pros_template: string[];
  cons_template: string[];
  is_active: boolean;
};

export type RecommendationItem = {
  softwareId: string;
  name: string;
  whyRecommended: string;
  keyFeatures: string[];
  pros: string[];
  cautions: string[];
  solvable: boolean;
  score: number;
};

export type RecommendationResult = {
  recommendationId?: string;
  items: RecommendationItem[];
  fitDecision: FitDecision;
  fitReason: string;
};

export type CreateRequestInput = {
  title: string;
  summary: string;
  requirements: string;
  budgetMin: number | null;
  budgetMax: number | null;
  deadlineDate: string | null;
  priority: PriorityLevel;
  recommendationId?: string | null;
};

export type SubmitBidInput = {
  price: number;
  deliveryDays: number;
  approachSummary: string;
  maintenanceOption: string;
  portfolioLink?: string | null;
};

export type ProjectTimelineEvent = {
  id: string;
  eventType: string;
  eventNote: string | null;
  createdAt: string;
};

export type ActionResult<T = void> =
  | { ok: true; data: T; message?: string }
  | { ok: false; code: string; message: string };
