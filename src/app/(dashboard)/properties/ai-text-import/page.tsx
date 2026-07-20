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
import { parsePropertyText, type ParsedProperty } from "@/lib/ai/property-parser";
import { ArrowLeft, Check, Loader2, Sparkles, Wand2, X } from "lucide-react";

type Step = "input" | "parsing" | "preview" | "saving" | "done";

export default function AiTextImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedProperty | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleParse() {
    if (!rawText.trim()) { setError("请先粘贴房源信息"); return; }
    setError(null);
    setStep("parsing");

    // Simulate brief processing delay
    setTimeout(() => {
      try {
        const result = parsePropertyText(rawText);
        setParsed(result);
        setEdits({});
        setStep("preview");
      } catch {
        setError("解析失败，请检查文字格式后重试");
        setStep("input");
      }
    }, 600);
  }

  async function handleSave() {
    if (!parsed) return;
    setStep("saving");
    setError(null);

    const name = edits["name"] ?? parsed.name ?? "";
    const address = edits["address"] ?? parsed.address ?? "";

    if (!name.trim()) { setError("请输入房源名称"); setStep("preview"); return; }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("properties").insert({
      name: name.trim(),
      address: address.trim(),
      area: (edits["area"] ? parseFloat(edits["area"]) : parsed.area) ?? null,
      rooms: (edits["rooms"] ? edits["rooms"] : parsed.rooms) ?? null,
      rent: (edits["rent"] ? parseFloat(edits["rent"]) : parsed.rent) ?? 0,
      owner_name: (edits["owner_name"] ?? parsed.owner_name)?.trim() || null,
      owner_phone: (edits["owner_phone"] ?? parsed.owner_phone)?.trim() || null,
      notes: (edits["notes"] ?? parsed.notes)?.trim() || null,
      status: "vacant",
      city: "",
      type: "apartment",
    });

    if (insertError) {
      if (insertError.code === "42P01") {
        setError("数据库表不存在，请先执行 SQL 迁移");
      } else {
        setError(insertError.message);
      }
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

  const displayValue = (field: keyof ParsedProperty): string => {
    if (edits[field] !== undefined) return edits[field];
    const v = parsed?.[field];
    if (v === null || v === undefined) return "";
    return String(v);
  };

  const hasValue = (field: keyof ParsedProperty): boolean => {
    const v = displayValue(field);
    return v !== "" && v !== "null" && v !== "undefined";
  };

  const parsedCount = parsed ? ["name", "address", "rent", "area", "rooms", "owner_name", "owner_phone"].filter((f) => hasValue(f as keyof ParsedProperty)).length : 0;

  const FIELDS: [keyof ParsedProperty, string, boolean, string][] = [
    ["name", "房源名称", true, "如：十四佳园"],
    ["address", "地址", false, "如：1-3-301"],
    ["rent", "月租 (元)", false, "如：2500"],
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
        <p className="text-sm text-muted-foreground">粘贴房源描述文字，智能解析为结构化房源信息</p>
      </div>

      {toast && (
        <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="size-3.5" /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <X className="size-4" />
          {error}
          <button className="ml-auto hover:underline" onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {/* ── Step: Input ──────────────────────────────────────────── */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>粘贴房源信息</CardTitle>
            <CardDescription>支持微信聊天记录、房产论坛帖子等多种格式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={"请粘贴房源信息，例如：\n十四佳园3栋301，120㎡，三室两厅，月租3500，房东张先生13800000000\n\n或：\n小区名称：十四佳园\n楼号：3-301\n户型：3-2-2\n面积：120\n租金：3500\n房东：张先生\n电话：13800000000"}
              className="min-h-[200px]"
              value={rawText}
              onChange={(e) => { setRawText(e.target.value); setError(null); }}
            />
            <div className="flex justify-end">
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                <Sparkles className="size-4" />
                AI 智能解析
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Parsing ────────────────────────────────────────── */}
      {step === "parsing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Wand2 className="size-10 animate-pulse text-primary" />
            <p className="text-sm font-medium">AI 正在解析房源信息...</p>
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* ── Step: Preview ────────────────────────────────────────── */}
      {step === "preview" && parsed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                解析结果
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
                      {!required && !hasValue(field) && <span className="text-muted-foreground font-normal ml-1">（未识别）</span>}
                    </label>
                    <Input
                      value={displayValue(field)}
                      onChange={(e) => setEdit(field, e.target.value)}
                      placeholder={placeholder}
                      className={required && !displayValue(field) ? "border-destructive" : ""}
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

      {/* ── Step: Saving ─────────────────────────────────────────── */}
      {step === "saving" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在保存房源...</p>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Done ───────────────────────────────────────────── */}
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