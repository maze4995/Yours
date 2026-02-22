import { describe, expect, it } from "vitest";
import { scoreCatalogCandidates } from "@/lib/recommendation/scoring";
import type { ProfileInput, SoftwareCatalogItem } from "@/lib/types";

const profile: ProfileInput = {
  fullName: "홍길동",
  jobTitle: "Operations Manager",
  industry: "SaaS",
  teamSize: 18,
  painPoints: ["manual reporting", "lead leak"],
  goals: ["workflow automation", "crm"],
  currentTools: ["excel", "slack"],
  budgetPreference: "낮은 초기비용",
  deadlinePreference: "4주 내"
};

const catalog: SoftwareCatalogItem[] = [
  {
    id: "1",
    name: "CRM Alpha",
    category: "CRM",
    target_roles: ["operations manager", "sales"],
    tags: ["crm", "workflow automation", "collaboration"],
    description: "SaaS 영업 운영 자동화",
    pricing_model: "Free + Paid",
    website_url: null,
    key_features: ["pipeline", "automation", "dashboard"],
    pros_template: [],
    cons_template: [],
    is_active: true
  },
  {
    id: "2",
    name: "Design Tool",
    category: "Design",
    target_roles: ["designer"],
    tags: ["prototyping"],
    description: "UI 디자인",
    pricing_model: "Paid",
    website_url: null,
    key_features: ["prototype", "asset"],
    pros_template: [],
    cons_template: [],
    is_active: true
  },
  {
    id: "3",
    name: "Automation Hub",
    category: "Internal Tooling",
    target_roles: ["operations"],
    tags: ["workflow automation", "collaboration"],
    description: "SaaS 운영 업무 자동화",
    pricing_model: "Free",
    website_url: null,
    key_features: ["automation", "integrations"],
    pros_template: [],
    cons_template: [],
    is_active: true
  }
];

describe("scoreCatalogCandidates", () => {
  it("returns deterministic sorted candidates", () => {
    const scored = scoreCatalogCandidates(profile, catalog);
    expect(scored.length).toBe(3);
    expect(scored[0].item.name).toBe("CRM Alpha");
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
    expect(scored[1].item.name).toBe("Automation Hub");
  });
});
