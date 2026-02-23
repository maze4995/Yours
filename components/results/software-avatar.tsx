"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoStage = "clearbit" | "google" | "initial";

interface SoftwareAvatarProps {
  name: string;
  websiteUrl?: string | null;
  isTop?: boolean;
  bg: string;
  textColor: string;
}

export function SoftwareAvatar({
  name,
  websiteUrl,
  isTop,
  bg,
  textColor,
}: SoftwareAvatarProps) {
  const [stage, setStage] = useState<LogoStage>(
    websiteUrl ? "clearbit" : "initial",
  );

  let domain: string | null = null;
  if (websiteUrl) {
    try {
      domain = new URL(websiteUrl).hostname;
    } catch {
      // invalid URL
    }
  }

  const imgSrc: string | null =
    domain && stage !== "initial"
      ? stage === "clearbit"
        ? `https://logo.clearbit.com/${domain}`
        : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      : null;

  const handleError = () => {
    setStage((prev) => (prev === "clearbit" ? "google" : "initial"));
  };

  const showLogo = imgSrc !== null;

  return (
    <div className="relative flex-shrink-0">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden",
          showLogo
            ? "border border-border/60 bg-white shadow-sm"
            : cn(bg, textColor, "text-base font-bold"),
        )}
      >
        {showLogo ? (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={`${name} logo`}
            className={cn(
              "object-contain",
              stage === "google" ? "h-8 w-8" : "h-9 w-9",
            )}
            onError={handleError}
          />
        ) : (
          name.charAt(0)
        )}
      </div>

      {isTop && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
          <Star className="h-3 w-3 fill-white text-white" />
        </span>
      )}
    </div>
  );
}
