import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { ids }: { ids: string[] } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "\u8BF7\u63D0\u4F9B\u6709\u6548\u7684\u623F\u6E90ID\u5217\u8868" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let deletedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      // 1. Get all images for this property
      const { data: images } = await supabase
        .from("property_images")
        .select("url")
        .eq("property_id", id);

      if (images && images.length > 0) {
        const paths: string[] = [];
        for (const img of images) {
          try {
            const url = new URL(img.url);
            const pathParts = url.pathname.split("/");
            const bucketIndex = pathParts.findIndex((p) => p === "property-images");
            if (bucketIndex >= 0) {
              paths.push(pathParts.slice(bucketIndex + 1).join("/"));
            }
          } catch {
            // skip invalid URLs
          }
        }
        // Delete from Storage
        if (paths.length > 0) {
          const { error: storageErr } = await supabase.storage.from("property-images").remove(paths);
          if (storageErr) console.error("Storage delete error for property", id, storageErr);
        }
      }

      // 2. Delete property (CASCADE deletes property_images records)
      const { error: deleteErr } = await supabase.from("properties").delete().eq("id", id).select("id");

      if (deleteErr) {
        errors.push(`${id}: ${deleteErr.message}`);
      } else {
        deletedCount++;
      }
    }

    return NextResponse.json({ deletedCount, errors });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF" }, { status: 500 });
  }
}
