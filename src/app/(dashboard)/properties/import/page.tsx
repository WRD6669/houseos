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

// ── Field mapping table ──────────────────────────────────────────────
// Column header (lowercase) → property field
const HEADER_MAP: Record<string, string> = {
  name: "name",
  address: "address",
  rent: "rent",
  area: "area",
  rooms: "rooms",
  owner_name: "owner_name",
  owner_phone: "owner_phone",
  notes: "notes",
  // Chinese aliases
  名称: "name",
  地址: "address",
  租金: "rent",
  房租: "rent",
  面积: "area",
  房间数: "rooms",
  房间: "rooms",
  房东: "owner_name",
  房东姓名: "owner_name",
  房东电话: "owner_phone",
  电话: "owner_phone",
  备注: "notes",
  说明: "notes",
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

  // ── Parse file ────────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError("仅支持 .xlsx 格式文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[];
        if (json.length === 0) { setError("表格内容为空"); return; }

        // Auto-map headers
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

        if (!usedFields.has("name")) { setError('Column "name" (or "名称") is required but not found.'); return; }

        // Build parsed rows
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
          if (!r.name) r._errors.push("名称为空");
          parsed.push(r);
        }

        const validCount = parsed.filter((r) => r._errors.length === 0).length;
        if (validCount === 0) { setError("没有有效数据行（所有行的名称均为空）"); return; }

        setRows(parsed);
        setStep("preview");
      } catch {
        setError("Excel 文件解析失败，请确保是有效的 .xlsx 文件");
      }
    };
    reader.readAsBinaryString(file);
  }

  // ── Confirm & insert ──────────────────────────────────────────────
  async function handleConfirm() {
    setStep("saving");
    setError(null);
    const valid = rows.filter((r) => r._errors.length === 0);
    if (valid.length === 0) { setError("没有有效数据行可供导入"); setStep("preview"); return; }

    const supabase = createClient();
    const insertedRows = valid.map((r) => ({
      name: r.name,
      address: r.address,
      area: r.area,
      rooms: r.rooms,
      rent: r.rent ?? 0,
      owner_name: r.owner_name || null,
      owner_phone: r.owner_phone || null,
      notes: r.notes || null,
      status: "vacant",
      city: "",
      type: "apartment",
    }));

    // Insert in batches of 100 to avoid hitting limits
    const batchSize = 100;
    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < insertedRows.length; i += batchSize) {
      const batch = insertedRows.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("properties").insert(batch).select("id");
      if (insertError) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        totalInserted += batch.length;
      }
    }

    setResult({ inserted: totalInserted, errors });
    setStep("done");

    if (totalInserted > 0) router.refresh();
  }

  function reset() { setStep("upload"); setRows([]); setMappedFields([]); setResult(null); setError(null); if (fileRef.current) fileRef.current.value = ""; }

  // ── Render ────────────────────────────────────────────────────────
  const backLink = (
    <Button variant="ghost" size="sm" asChild className="mb-2">
      <Link href="/properties"><ArrowLeft className="size-4" /> Back to 条房源</Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      {backLink}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import 条房源</h1>
        <p className="text-sm text-muted-foreground">Upload an Excel file to batch-import properties.</p>
      </div>

      {/* ── Error banner ──────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <X className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Step: Upload ──────────────────────────────────────────── */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>上传房源文件</CardTitle>
            <CardDescription>
              Your .xlsx file should have a header row. Supported columns:
              name, address, rent, area, rooms, owner_name, owner_phone, notes
              (Chinese aliases like 名称, 地址, 租金 are also supported).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-12">
              <Upload className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop or click to select a .xlsx file</p>
              <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} className="file:hidden block w-full max-w-xs cursor-pointer rounded-md border px-3 py-2 text-sm" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Preview ──────────────────────────────────────────── */}
      {step === "preview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview ({rows.length} 行)</CardTitle>
              <CardDescription>
                已映射字段: {mappedFields.join(", ")}.
                {rows.filter((r) => r._errors.length > 0).length > 0 && (
                  <span className="text-destructive"> {rows.filter((r) => r._errors.length > 0).length} 行数据有错误.</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[50vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Address</TableHead>
                      <TableHead>Rent</TableHead><TableHead>Area</TableHead><TableHead>Rooms</TableHead>
                      <TableHead>Owner</TableHead><TableHead>Phone</TableHead><TableHead>Notes</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i} className={r._errors.length > 0 ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{r.name || <span className="text-destructive">—</span>}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[120px] truncate">{r.address}</TableCell>
                        <TableCell>{r.rent != null ? `$${r.rent}` : "—"}</TableCell>
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
              Confirm & Import {rows.filter((r) => r._errors.length === 0).length} Properties
            </Button>
          </div>
        </>
      )}

      {/* ── Step: Saving ───────────────────────────────────────────── */}
      {step === "saving" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在导入房源...</p>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Done ──────────────────────────────────────────────── */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-emerald-500" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">已导入 <strong>{result.inserted}</strong> properties.</p>
            {result.errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={reset}>继续导入</Button>
              <Button variant="default" asChild>
                <Link href="/properties">Go to 条房源</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
