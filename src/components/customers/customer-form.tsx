"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { parseDocumentText } from "@/lib/ai/document-parser";
import { Camera, Loader2, Plus, X } from "lucide-react";

interface FormData {
  name: string; email: string; phone: string; wechat: string; id_card: string; notes: string;
}

const EMPTY: FormData = { name: "", email: "", phone: "", wechat: "", id_card: "", notes: "" };

export function AddCustomerButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── OCR upload handler ────────────────────────────────────────────
  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG, JPG, JPEG images are supported.");
      return;
    }

    setOcrLoading(true);
    try {
      const text = await extractTextFromImage(file);
      const parsed = parseDocumentText(text);

      // Map parsed fields to form fields
      const formNotesParts: string[] = [];
      if (parsed.community) formNotesParts.push(`\u5c0f\u533a: ${parsed.community}`);
      if (parsed.address) formNotesParts.push(`\u5730\u5740: ${parsed.address}`);
      if (parsed.area) formNotesParts.push(`\u9762\u79ef: ${parsed.area}\u33a1`);
      if (parsed.price) formNotesParts.push(`\u4ef7\u683c: ${parsed.price}`);
      if (parsed.room) formNotesParts.push(`\u6237\u578b: ${parsed.room}`);
      if (parsed.floor) formNotesParts.push(`\u697c\u5c42: ${parsed.floor}`);
      if (parsed.remark) formNotesParts.push(`\u5907\u6ce8: ${parsed.remark}`);

      setForm((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        phone: parsed.phone || prev.phone,
        notes: formNotesParts.length > 0 ? formNotesParts.join("; ") : prev.notes,
      }));
    } catch {
      setError("OCR processing failed. Try a clearer image.");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("customers").insert({
      name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
      wechat: form.wechat.trim() || null, id_card: form.id_card.trim() || null,
      notes: form.notes.trim() || null, status: "active",
    });
    setSaving(false);

    if (insertError) {
      if (insertError.code === "23505") setError("A customer with this email already exists.");
      else if (insertError.code === "42P01") setError("Database tables not found. Run the SQL migration first.");
      else setError(insertError.message);
      return;
    }
    setForm(EMPTY); setOpen(false); router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add Customer
      </Button>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleOcrUpload} className="hidden" />

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && !ocrLoading && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Add Customer</CardTitle>
                <CardDescription>Enter details or upload a document image.</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" title="Upload image for OCR" disabled={ocrLoading || saving} onClick={() => fileRef.current?.click()}>
                  {ocrLoading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => !saving && setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ocrLoading && (
                <div className="mb-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Scanning image with AI...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
                  <Input placeholder="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={saving} autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input placeholder="+86 138-0000-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WeChat</label>
                  <Input placeholder="WeChat ID" value={form.wechat} onChange={(e) => set("wechat", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID Card</label>
                  <Input placeholder="ID card number" value={form.id_card} onChange={(e) => set("id_card", e.target.value)} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input placeholder="Additional notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={saving} />
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />} Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
