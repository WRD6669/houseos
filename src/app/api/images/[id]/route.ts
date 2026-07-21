import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the image record to find the storage path
    const { data: imgRecord } = await supabase
      .from("property_images")
      .select("url, property_id")
      .eq("id", id)
      .single();

    if (imgRecord) {
      // Extract path from URL
      const url = new URL(imgRecord.url);
      const pathParts = url.pathname.split("/");
      const bucketIndex = pathParts.findIndex((p) => p === "property-images");
      if (bucketIndex >= 0) {
        const storagePath = pathParts.slice(bucketIndex + 1).join("/");
        await supabase.storage.from("property-images").remove([storagePath]);
      }
    }

    // Delete DB record
    const { error } = await supabase.from("property_images").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Image delete error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Only handle primary toggle for now
    if (body.is_primary !== true && body.is_primary !== false) {
      return NextResponse.json({ error: "请提供 is_primary 参数" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the image to know which property it belongs to
    const { data: img } = await supabase
      .from("property_images")
      .select("property_id")
      .eq("id", id)
      .single();

    if (!img) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    if (body.is_primary) {
      // Unset all primary for this property
      await supabase
        .from("property_images")
        .update({ is_primary: false })
        .eq("property_id", img.property_id);
    }

    // Set/unset this image as primary
    const { error } = await supabase
      .from("property_images")
      .update({ is_primary: body.is_primary })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "保存失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Image patch error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
