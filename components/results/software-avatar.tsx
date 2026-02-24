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
          "flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl",
          showLogo
            ? "border border-border/60 bg-white shadow-sm"
            : cn(bg, textColor, "text-lg font-bold"),
        )}
      >
        {showLogo ? (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={`${name} logo`}
            className={cn(
              "object-contain",
              stage === "google" ? "h-9 w-9" : "h-10 w-10",
            )}
            onError={handleError}
          />
        ) : (
          name.charAt(0)
        )}
      </div>

      {isTop && (
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-sm">
          <Star className="h-3.5 w-3.5 fill-white text-white" />
        </span>
      )}
    </div>
  );
}
