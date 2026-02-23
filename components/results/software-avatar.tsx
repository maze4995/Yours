"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [failed, setFailed] = useState(false);

  let logoUrl: string | null = null;
  if (websiteUrl && !failed) {
    try {
      const domain = new URL(websiteUrl).hostname;
      logoUrl = `https://logo.clearbit.com/${domain}`;
    } catch {
      // invalid URL — fall through to initial avatar
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden",
          logoUrl
            ? "border border-border/60 bg-white shadow-sm"
            : cn(bg, textColor, "text-base font-bold"),
        )}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="h-9 w-9 object-contain"
            onError={() => setFailed(true)}
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
