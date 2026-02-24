import { describe, expect, it } from "vitest";
import { scoreCatalogCandidates } from "@/lib/recommendation/scoring";
import type { ProfileInput, SoftwareCatalogItem } from "@/lib/types";

const baseCatalog: SoftwareCatalogItem[] = [
  {
    id: "1",
    name: "CRM Alpha",
    category: "CRM",
    target_roles: ["operations manager", "sales"],
    tags: ["crm", "workflow automation", "collaboration"],
    description: "Sales and operations workflow automation with customer pipeline.",
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
    description: "Design and prototyping tool.",
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
    description: "Automation and integrations for repeated operations work.",
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
    const profile: ProfileInput = {
      fullName: "Tester",
      jobTitle: "Operations Manager",
      industry: "SaaS",
      teamSize: 18,
      painPoints: ["manual reporting", "lead leak"],
      goals: ["workflow automation", "crm"],
      currentTools: ["excel", "slack"],
      budgetPreference: "free first",
      deadlinePreference: "within 4 weeks"
    };

    const scored = scoreCatalogCandidates(profile, baseCatalog);
    expect(scored.length).toBe(3);
    expect(scored[0].item.name).toBe("CRM Alpha");
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
    expect(scored[1].item.name).toBe("Automation Hub");
  });

  it("prioritizes main pain detail domain over generic collaboration tools", () => {
    const profile: ProfileInput = {
      fullName: "Restaurant Owner",
      jobTitle: "Owner",
      industry: "Restaurant",
      teamSize: 6,
      painPoints: ["ledger management is hard", "daily settlement is delayed"],
      mainPainDetail:
        "Restaurant ledger and daily settlement are managed manually. We need bookkeeping and POS level control.",
      goals: ["reduce accounting mistakes", "faster close"],
      currentTools: ["spreadsheet"],
      budgetPreference: "starter paid",
      deadlinePreference: "as soon as possible"
    };

    const catalog: SoftwareCatalogItem[] = [
      {
        id: "a",
        name: "Collab Docs",
        category: "Collaboration",
        target_roles: ["founder", "team lead"],
        tags: ["collaboration", "docs", "wiki"],
        description: "Shared docs and team writing space.",
        pricing_model: "Free + Team",
        website_url: null,
        key_features: ["docs", "comments", "pages"],
        pros_template: [],
        cons_template: [],
        is_active: true
      },
      {
        id: "b",
        name: "Restaurant Ledger POS",
        category: "POS",
        target_roles: ["owner", "operations"],
        tags: ["restaurant", "pos", "accounting", "bookkeeping", "settlement"],
        description: "POS, bookkeeping, and settlement for restaurants.",
        pricing_model: "Paid",
        website_url: null,
        key_features: ["daily close", "bookkeeping", "settlement", "receipt"],
        pros_template: [],
        cons_template: [],
        is_active: true
      }
    ];

    const scored = scoreCatalogCandidates(profile, catalog);
    expect(scored[0].item.name).toBe("Restaurant Ledger POS");
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });
});
