"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import type { PropertyImage } from "@/lib/supabase/types";

/** Strip Supabase image transformation query params (e.g. ?width=100) to get original full-res URL */
function originalUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove all query params — Supabase uses them for on-the-fly transformations
    u.search = "";
    return u.toString();
  } catch {
    return url;
  }
}

interface Props {
  images: PropertyImage[];
  propertyName: string;
}

export function PropertyGallery({ images, propertyName }: Props) {
  // Default to the primary image, or first image
  const primaryIndex = images.findIndex((i) => i.is_primary);
  const [selectedIndex, setSelectedIndex] = useState(primaryIndex >= 0 ? primaryIndex : 0);

  const selected = images[selectedIndex];
  if (!selected) return null;

  const hasMultiple = images.length > 1;

  function goPrev() {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }

  function goNext() {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-3">
      {/* ── Main Image ──────────────────────────────── */}
      <div className="relative aspect-[16/9] max-h-[500px] bg-muted rounded-xl overflow-hidden group">
        <img
          src={originalUrl(selected.url)}
          alt={propertyName || ""}
          className="w-full h-full object-cover"
        />

        {/* Left / Right arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="上一张"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="下一张"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {hasMultiple && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* ── Thumbnail Strip ─────────────────────────── */}
      {hasMultiple && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative size-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                index === selectedIndex
                  ? "border-white ring-2 ring-primary shadow-md scale-105"
                  : "border-transparent opacity-70 hover:opacity-100 hover:border-white/50"
              }`}
            >
              <img
                src={originalUrl(img.thumbnail_url || img.url)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
