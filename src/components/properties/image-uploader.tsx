"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { PropertyImage } from "@/lib/supabase/types";
import {
  Upload, X, Star, ChevronUp, ChevronDown, Loader2,
} from "lucide-react";

// Client-side image compression using canvas
function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("压缩失败"));
        },
        file.type,
        quality
      );
    };
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

interface ImageUploaderProps {
  propertyId: string;
  images: PropertyImage[];
  onImagesChange: (images: PropertyImage[]) => void;
  disabled?: boolean;
}

export function ImageUploader({ propertyId, images, onImagesChange, disabled }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setUploading(true);
      setError(null);

  
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Compress
          const compressed = await compressImage(file);
          const compressedFile = new File([compressed], file.name, { type: file.type });

          // Upload via API
          const formData = new FormData();
          formData.append("property_id", propertyId);
          formData.append("file", compressedFile);

          const res = await fetch("/api/images/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "上传失败");
          }

          const newImage = await res.json();
          onImagesChange([...images, newImage]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "上传失败");
        }
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [propertyId, images, onImagesChange]
  );

  async function handleDelete(imageId: string) {
    const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      onImagesChange(images.filter((img) => img.id !== imageId));
    } else {
      setError("删除失败");
    }
  }

  async function handleSetPrimary(imageId: string) {
    const supabase = createClient();
    // Unset all primary
    const { error } = await supabase
      .from("property_images")
      .update({ is_primary: false })
      .eq("property_id", propertyId);
    if (!error) {
      await supabase
        .from("property_images")
        .update({ is_primary: true })
        .eq("id", imageId);
      onImagesChange(
        images.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      );
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const a = images[index - 1];
    const b = images[index];
    const supabase = createClient();
    await supabase.from("property_images").update({ sort_order: index }).eq("id", a.id);
    await supabase.from("property_images").update({ sort_order: index - 1 }).eq("id", b.id);
    const updated = [...images];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onImagesChange(updated);
  }

  async function handleMoveDown(index: number) {
    if (index >= images.length - 1) return;
    handleMoveUp(index + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">房源图片</label>
        <span className="text-xs text-muted-foreground">
          {images.length} 张图片
        </span>
      </div>

      {/* Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-muted"
            >
              <img
                src={img.thumbnail_url || img.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center gap-1 p-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded bg-white/80 p-1 hover:bg-white disabled:opacity-30"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="上移"
                >
                  <ChevronUp className="size-3 text-foreground" />
                </button>
                <button
                  type="button"
                  className="rounded bg-white/80 p-1 hover:bg-white disabled:opacity-30"
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= images.length - 1}
                  title="下移"
                >
                  <ChevronDown className="size-3 text-foreground" />
                </button>
                <button
                  type="button"
                  className="rounded bg-white/80 p-1 hover:bg-white"
                  onClick={() => handleSetPrimary(img.id)}
                  title="设为封面"
                >
                  <Star
                    className={`size-3 ${
                      img.is_primary
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-foreground"
                    }`}
                  />
                </button>
                <button
                  type="button"
                  className="rounded bg-white/80 p-1 hover:bg-white"
                  onClick={() => handleDelete(img.id)}
                  title="删除"
                >
                  <X className="size-3 text-destructive" />
                </button>
              </div>
              {/* Primary badge */}
              {img.is_primary && (
                <div className="absolute top-1 left-1 rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  封面
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              上传图片
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          支持 JPG/PNG/WebP，自动压缩
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
