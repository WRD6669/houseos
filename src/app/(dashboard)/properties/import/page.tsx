"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";

const HEADER_MAP: Record<string, string> = {
  name: "name",
  address: "address",
  rent: "rent",
  area: "area",
  rooms: "rooms",
  owner_name: "owner_name",
  owner_phone: "owner_phone",
  notes: "notes",
  "\u540d\u79f0": "name",
  "\u5730\u5740": "address",
  "\u79df\u91d1": "rent",
  "\u623f\u79df": "rent",
  "\u9762\u79ef": "area",
  "\u623f\u95f4\u6570": "rooms",
  "\u623f\u95f4": "rooms",
  "\u623f\u4e1c": "owner_name",
  "\u623f\u4e1c\u59d3\u540d": "owner_name",
  "\u623f\u4e1c\u7535\u8bdd": "owner_phone",
  "\u7535\u8bdd": "owner_phone",
  "\u5907\u6ce8": "notes",
  "\u8bf4\u660e": "notes",
};

interface ParsedRow {
  name: string;
  address: string;
  area: number | null;
  rooms: number | null;
  rent: number | null;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  _errors: string[];
}

type Step = "upload" | "preview" | "saving" | "done";

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mappedFields, setMappedFields] = useState<string[]>([]);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError("\u4ec5\u652f\u6301 .xlsx \u683c\u5f0f\u6587\u4ef6");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[];
        if (json.length === 0) { setError("\u8868\u683c\u5185\u5bb9\u4e3a\u7a7a"); return; }

        const headers = Object.keys(json[0]);
        const mapping: Record<string, string> = {};
        const usedFields = new Set<string>();
        for (const h of headers) {
          const field = HEADER_MAP[h.trim().toLowerCase()];
          if (field && !usedFields.has(field)) {
            mapping[h] = field;
            usedFields.add(field);
          }
        }
        setMappedFields([...usedFields]);

        if (!usedFields.has("name")) { setError('\u201c\u540d\u79f0\u201d \u5217\u662f\u5fc5\u586b\u9879\uff0c\u672a\u5728\u8868\u683c\u4e2d\u627e\u5230\u3002'); return; }

        const parsed: ParsedRow[] = [];
        for (const row of json) {
          const r: ParsedRow = { name: "", address: "", area: null, rooms: null, rent: null, owner_name: null, owner_phone: null, notes: null, _errors: [] };
          for (const [col, field] of Object.entries(mapping)) {
            const val = row[col];
            if (field === "name") r.name = String(val ?? "").trim();
            else if (field === "address") r.address = String(val ?? "").trim();
            else if (field === "rent") r.rent = parseNum(val);
            else if (field === "area") r.area = parseNum(val);
            else if (field === "rooms") r.rooms = parseNum(val);
            else if (field === "owner_name") r.owner_name = String(val ?? "").trim() || null;
            else if (field === "owner_phone") r.owner_phone = String(val ?? "").trim() || null;
            else if (field === "notes") r.notes = String(val ?? "").trim() || null;
          }
          if (!r.name) r._errors.push("\u540d\u79f0\u4e3a\u7a7a");
          parsed.push(r);
        }

        const validCount = parsed.filter((r) => r._errors.length === 0).length;
        if (validCount === 0) { setError("\u6ca1\u6709\u6709\u6548\u6570\u636e\u884c\uff08\u6240\u6709\u884c\u7684\u540d\u79f0\u5747\u4e3a\u7a7a\uff09"); return; }

        setRows(parsed);
        setResult(null);
        setStep("preview");
      } catch {
        setError("\u65e0\u6cd5\u89e3\u6790\u8be5\u6587\u4ef6\uff0c\u8bf7\u68c0\u67e5\u662f\u5426\u4e3a\u6709\u6548\u7684 .xlsx \u683c\u5f0f\u3002");
      }
    };
    reader.readAsBinaryString(file);
  }

  async function handleConfirm() {
    const validRows = rows.filter((r) => r._errors.length === 0);
    if (validRows.length === 0) return;

    setStep("saving");
    setError(null);

    const supabase = createClient();
    const insertPayload = validRows.map((r) => ({
      name: r.name,
      address: r.address,
      area: r.area,
      rooms: r.rooms,
      rent: r.rent ?? 0,
      owner_name: r.owner_name,
      owner_phone: r.owner_phone,
      notes: r.notes,
      status: "vacant",
      city: "",
      type: "apartment",
    }));

    const errs: string[] = [];
    let inserted = 0;
    for (const row of insertPayload) {
      const { error: insertError } = await supabase.from("properties").insert(row);
      if (insertError) { errs.push(`${row.name}: ${insertError.message}`); }
      else { inserted++; }
    }

    setResult({ inserted, errors: errs });
    setStep("done");
    router.refresh();
  }

  function reset() {
    setStep("upload"); setRows([]); setMappedFields([]); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const backLink = (
    <Button variant="ghost" size="sm" asChild className="mb-2">
      <Link href="/properties"><ArrowLeft className="size-4" /> 返回房源</Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      {backLink}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Excel 批量导入</h1>
        <p className="text-sm text-muted-foreground">上传 .xlsx 文件批量导入房源数据</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <X className="size-4" />
          {error}
          <button className="ml-auto hover:underline" onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>选择 .xlsx 文件开始导入</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <Upload className="size-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">选择 .xlsx 文件</p>
              <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="block w-full max-w-xs cursor-pointer rounded-md border px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>预览 ({rows.length} 行)</CardTitle>
              <CardDescription>
                已映射字段: {(() => {
                  const labels: Record<string, string> = { name: "名称", address: "地址", rent: "租金", area: "面积", rooms: "房间数", owner_name: "房东", owner_phone: "电话", notes: "备注" };
                  return mappedFields.map((f) => labels[f] ?? f).join("、");
                })()}。
                {rows.filter((r) => r._errors.length > 0).length > 0 && (
                  <span className="text-destructive"> {rows.filter((r) => r._errors.length > 0).length} 行数据有错误。</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead><TableHead>地址</TableHead>
                      <TableHead>租金</TableHead><TableHead>面积</TableHead><TableHead>房间数</TableHead>
                      <TableHead>房东</TableHead><TableHead>电话</TableHead><TableHead>备注</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r._errors.length > 0 ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{r.name || <span className="text-destructive">—</span>}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[120px] truncate">{r.address}</TableCell>
                        <TableCell>{r.rent != null ? `\u00a5${r.rent}` : "—"}</TableCell>
                        <TableCell>{r.area ?? "—"}</TableCell>
                        <TableCell>{r.rooms ?? "—"}</TableCell>
                        <TableCell>{r.owner_name ?? "—"}</TableCell>
                        <TableCell>{r.owner_phone ?? "—"}</TableCell>
                        <TableCell className="max-w-[100px] truncate text-muted-foreground">{r.notes ?? "—"}</TableCell>
                        <TableCell>
                          {r._errors.length > 0 && <Badge variant="destructive" className="text-[10px]">{r._errors.join(", ")}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>取消</Button>
            <Button onClick={handleConfirm}>
              <Check className="size-4" />
              确认并导入 {rows.filter((r) => r._errors.length === 0).length} 套房源
            </Button>
          </div>
        </>
      )}

      {step === "saving" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在导入房源...</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-emerald-500" />
              导入完成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">已导入 <strong>{result.inserted}</strong> 套房源。</p>
            {result.errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={reset}>继续导入</Button>
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