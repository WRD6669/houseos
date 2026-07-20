import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET = "property-images";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const propertyId = formData.get("property_id") as string;
    const file = formData.get("file") as File | null;

    if (!propertyId) return NextResponse.json({ error: "缺少房源ID" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "仅支持PNG/JPG/WebP格式" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "图片大小不能超过5MB" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ext = file.type.split("/")[1] || "jpg";
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "图片上传失败" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    // Create property_images record
    const { data: imgRecord, error: dbError } = await supabase
      .from("property_images")
      .insert({
        property_id: propertyId,
        url: urlData.publicUrl,
        is_primary: false,
        sort_order: 0,
        file_size: file.size,
      })
      .select("*")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      return NextResponse.json({ error: "记录保存失败" }, { status: 500 });
    }

    return NextResponse.json(imgRecord);
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
