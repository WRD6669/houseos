"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { parseRoomLayout } from "@/lib/ai/room-parser";
import { ArrowLeft, Check, Loader2, Sparkles, Wand2 } from "lucide-react";

interface PropertyFields {
  name: string;
  address: string;
  type: string;
  rent: number | null;
  area: number | null;
  rooms: string;
  listing_type: string;
  rent_price: number | null;
  sale_price: number | null;
  community: string;
  decoration: string;
  orientation: string;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  furniture: string;
  owner_name: string;
  owner_phone: string;
  notes: string;
}

type Step = "input" | "parsing" | "preview" | "saving" | "done";

export default function AiTextImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<PropertyFields | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleParse() {
    if (!rawText.trim()) { setError("请先粘贴房源信息"); return; }
    setError(null);
    setStep("parsing");

    try {
      const res = await fetch("/api/ai/property-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "AI 解析失败，请重试");
        setStep("input");
        return;
      }

      setParsed(data);
      setEdits({});
      setStep("preview");
    } catch {
      setError("网络请求失败，请检查网络连接");
      setStep("input");
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setStep("saving");
    setError(null);

    const name = edits["name"] ?? parsed.name ?? "";
    const address = edits["address"] ?? parsed.address ?? "";

    if (!name.trim()) { setError("请输入房源名称"); setStep("preview"); return; }

    // Parse rooms field 鈥?AI may return Chinese like "涓夊涓ゅ巺"
    const roomsRaw = edits["rooms"] ?? parsed.rooms ?? null;
    const roomResult = parseRoomLayout(roomsRaw);
    const bedrooms = roomResult.bedrooms;
    const livingRooms = roomResult.livingRooms;
    const bathrooms = roomResult.bathrooms;
    const roomLayout = roomsRaw || null;

    const supabase = createClient();
    const { error: insertError, data } = await supabase.from("properties").insert({
      name: name.trim(),
      address: address.trim(),
      area: (edits["area"] ? parseFloat(edits["area"]) : parsed.area) ?? null,
      listing_type: edits["listing_type"] || parsed.listing_type || "rent",
      rent_price: (edits["rent_price"] ? parseFloat(edits["rent_price"]) : parsed.rent_price) ?? null,
      sale_price: (edits["sale_price"] ? parseFloat(edits["sale_price"]) : parsed.sale_price) ?? null,
      bedrooms: bedrooms,
      living_rooms: livingRooms,
      bathrooms: bathrooms,
      room_layout: roomLayout,
      rent: (edits["rent_price"] ? parseFloat(edits["rent_price"]) : parsed.rent_price) ?? 0,
      owner_name: (edits["owner_name"] ?? parsed.owner_name)?.trim() || null,
      owner_phone: (edits["owner_phone"] ?? parsed.owner_phone)?.trim() || null,
      notes: (edits["notes"] ?? parsed.notes)?.trim() || null,
      status: "vacant",
      city: edits["city"] || "",
      community: edits["community"] || parsed.community || null,
      decoration: edits["decoration"] || parsed.decoration || null,
      orientation: edits["orientation"] || parsed.orientation || null,
      floor: (edits["floor"] ? parseInt(edits["floor"]) : parsed.floor) ?? null,
      total_floors: (edits["total_floors"] ? parseInt(edits["total_floors"]) : parsed.total_floors) ?? null,
      has_elevator: edits["has_elevator"] === "true" ? true : edits["has_elevator"] === "false" ? false : null,
      furniture: edits["furniture"] || parsed.furniture || null,
      type: edits["type"] || parsed.type || "apartment",
    }).select("id");

    if (insertError) {
      if (insertError.code === "42P01") {
        setError("数据库表不存在，请先执行 SQL 迁移");
      } else {
        setError(insertError.message);
      }
      setStep("preview");
      return;
    }

    if (!data || data.length === 0) {
      setError("添加失败：未收到数据库确认");
      setStep("preview");
      return;
    }

    setResult(name);
    setStep("done");
    router.refresh();
  }

  function setEdit(field: string, value: string) {
    setEdits((prev) => ({ ...prev, [field]: value }));
  }

  const getVal = (field: keyof PropertyFields): string => {
    if (edits[field] !== undefined) return edits[field];
    const v = parsed?.[field];
    if (v === null || v === undefined || v === "") return "";
    return String(v);
  };

  const hasVal = (field: keyof PropertyFields): boolean => {
    const v = getVal(field);
    return v !== "" && v !== "null" && v !== "undefined";
  };

  const parsedCount = parsed
    ? ["name", "address", "listing_type", "rent_price", "sale_price", "area", "rooms", "community", "decoration", "orientation", "owner_name", "owner_phone"].filter((f) => hasVal(f as keyof PropertyFields)).length
    : 0;

  const FIELDS: [keyof PropertyFields, string, boolean, string][] = [
    ["name", "房源名称", true, "如：十四佳园"],
    ["address", "地址", false, "如：1-3-301"],
    ["type", "类型", false, "apartment/villa/loft..."],
    ["listing_type", "交易", false, "rent/sale"],
    ["rent_price", "月租 (元)", false, "如：8000"],
    ["sale_price", "售价 (元)", false, "如：3500000"],
    ["community", "小区", false, "小区名称"],
    ["decoration", "装修", false, "furnished/standard/unfurnished/shell"],
    ["orientation", "朝向", false, "如：南"],
    ["floor", "楼层", false, "如：3"],
    ["total_floors", "总楼层", false, "如：6"],
    ["has_elevator", "电梯", false, "true/false"],
    ["furniture", "家具", false, "full/partial/none"],
    ["rent_price", "月租 (元)", false, "如：8000"],
    ["area", "面积 (㎡)", false, "如：94"],
    ["rooms", "户型", false, "如：2室1厅"],
    ["owner_name", "房东姓名", false, "如：张先生"],
    ["owner_phone", "房东电话", false, "如：13800000000"],
    ["notes", "备注", false, "其他信息"],
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link href="/properties"><ArrowLeft className="size-4" /> 返回房源</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Wand2 className="size-6 text-primary" />
          AI 快速录入
        </h1>
        <p className="text-muted-foreground mt-1">粘贴微信房源描述，AI 自动解析字段</p>
      </div>

      {/* Input */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>粘贴房源描述</CardTitle>
            <CardDescription>从聊天记录复制房源信息，粘贴到下方</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={"请粘贴房源信息，例如：十四佳园3栋301，120㎡，三室两厅，月租3500，房东张先生13800000000"}
              className="min-h-40"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRawText("")}>清空</Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                <Sparkles className="size-4" />
                AI 识别
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsing */}
      {step === "parsing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Wand2 className="size-10 animate-pulse text-primary" />
            <p className="text-sm font-medium">DeepSeek AI 正在解析房源信息...</p>
            <p className="text-xs text-muted-foreground">调用 AI 模型识别关键字段</p>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {step === "preview" && parsed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                AI 解析结果
              </CardTitle>
              <CardDescription>
                已识别 <Badge variant="secondary" className="ml-1">{parsedCount}</Badge> 个字段，请核对并修改
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map(([field, label, required, placeholder]) => (
                  <div key={field} className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {label}{required && <span className="text-destructive"> *</span>}
                      {!required && !hasVal(field) && (
                        <span className="text-muted-foreground font-normal ml-1">（未识别）</span>
                      )}
                    </label>
                    <Input
                      value={getVal(field)}
                      onChange={(e) => setEdit(field, e.target.value)}
                      placeholder={placeholder}
                      className={required && !getVal(field) ? "border-destructive" : ""}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setStep("input"); setError(null); }}>
              重新粘贴
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/properties")}>取消</Button>
              <Button onClick={handleSave}>
                <Check className="size-4" />
                保存房源
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Saving */}
      {step === "saving" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在保存房源...</p>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-emerald-500" />
              房源已保存
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm"><strong>{result}</strong> 已添加到房源列表。</p>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => { setStep("input"); setRawText(""); setParsed(null); setEdits({}); setResult(null); }}>
                继续录入
              </Button>
              <Button variant="default" asChild>
                <Link href="/properties">查看房源列表</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}