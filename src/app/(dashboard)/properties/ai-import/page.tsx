"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
;
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parsePropertyText, type ParsedProperty } from "@/lib/ai/property-parser";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, ImageUp, Loader2, ScanEye, Sparkles, X } from "lucide-react";
import Link from "next/link";

type Step = "upload" | "analyzing" | "preview" | "saving" | "done";

export default function AiImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProperty | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function reset() {
    setStep("upload"); setImageUrl(null); setRawText(null); setParsed(null);
    setEdits({}); setError(null); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Upload & OCR ──────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("仅支持 PNG、JPG、JPEG 格式图片");
      return;
    }

    // Preview
    setImageUrl(URL.createObjectURL(file));
    setStep("analyzing");

    try {
      const text = await extractTextFromImage(file);
      if (!text.trim()) { setError("未能从图片中识别到文字，请尝试更清晰的截图"); setStep("upload"); return; }
      setRawText(text);
      const result = parsePropertyText(text);
      setParsed(result);
      setEdits({});
      setStep("preview");
    } catch {
      setError("AI 识别失败，请尝试其他图片或检查网络");
      setStep("upload");
    }
  }

  // ── Save ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!parsed) return;
    setStep("saving");
    setError(null);

    const name = edits["name"] ?? parsed.name ?? "";
    const address = edits["address"] ?? parsed.address ?? "";

    if (!name.trim()) { setError('请输入房源名称'); setStep("preview"); return; }

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

    if (insertError) { setError(insertError.message); setStep("preview"); return; }

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

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="mb-2">
      <Link href="/properties"><ArrowLeft className="size-4" /> Back to Properties</Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      {backLink}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Property Import</h1>
        <p className="text-sm text-muted-foreground">上传房源截图，AI 自动提取信息</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <X className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Upload ────────────────────────────────────────────────── */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageUp className="size-5" /> Upload Screenshot</CardTitle>
            <CardDescription>Upload a property listing screenshot (PNG, JPG, or JPEG). AI will extract the details automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12">
              <ImageUp className="size-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">Supported formats: PNG, JPG, JPEG<br />Best results with clear, well-lit screenshots</p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFile} className="block w-full max-w-xs cursor-pointer rounded-md border px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Analyzing ─────────────────────────────────────────────── */}
      {step === "analyzing" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Original Image</CardTitle></CardHeader>
            <CardContent>
              {imageUrl && <img src={imageUrl} alt="Uploaded screenshot" className="w-full rounded-lg border" />}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-20">
              <ScanEye className="size-12 animate-pulse text-primary" />
              <p className="text-sm font-medium">AI 正在分析图片...</p>
              <p className="text-xs text-muted-foreground">正在识别文字并提取房源信息</p>
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Preview ───────────────────────────────────────────────── */}
      {step === "preview" && parsed && (
        <>
          {/* OCR raw text */}
          <details className="cursor-pointer text-xs text-muted-foreground">
            <summary className="hover:text-foreground">查看识别原文</summary>
            <pre className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap max-h-40 overflow-auto">{rawText}</pre>
          </details>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Image preview */}
            <Card>
              <CardHeader><CardTitle>Original Image</CardTitle></CardHeader>
              <CardContent>
                {imageUrl && <img src={imageUrl} alt="Uploaded screenshot" className="w-full rounded-lg border" />}
              </CardContent>
            </Card>

            {/* Parsed fields */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  AI Recognition Results
                </CardTitle>
                <CardDescription>请核对并修改识别结果</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {([
                  ["name", "房源名称", true],
                  ["address", "地址", false],
                  ["rent", "月租 (元)", false],
                  ["area", "面积 (㎡)", false],
                  ["rooms", "户型", false],
                  ["owner_name", "房东姓名", false],
                  ["owner_phone", "房东电话", false],
                  ["notes", "备注", false],
                ] as [keyof ParsedProperty, string, boolean][]).map(([field, label, required]) => (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium">
                      {label}{required && <span className="text-destructive"> *</span>}
                      {!required && !hasValue(field) && <span className="text-muted-foreground font-normal">（未识别）</span>}
                    </label>
                    <Input
                      value={displayValue(field)}
                      onChange={(e) => setEdit(field, e.target.value)}
                      placeholder={required ? "必填" : "未识别到"}
                      className={required && !displayValue(field) ? "border-destructive" : ""}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={handleSave}>
              <Check className="size-4" />
              Save Property
            </Button>
          </div>
        </>
      )}

      {/* ── Saving ────────────────────────────────────────────────── */}
      {step === "saving" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在保存房源...</p>
          </CardContent>
        </Card>
      )}

      {/* ── Done ──────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-emerald-500" />
              Property Saved
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm"><strong>{result}</strong> has been added to your properties.</p>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={reset}>Import Another</Button>
              <Button variant="default" asChild>
                <Link href="/properties">Go to Properties</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
