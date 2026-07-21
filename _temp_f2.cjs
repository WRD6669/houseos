const fs = require("fs");
const path = "C:/Users/lenovo/houseos/src/components/properties/property-form.tsx";
const bt = "\x60"; // backtick

const component = `

export function PropertyForm({ mode = "add", initialData, propertyId, trigger, onSuccess }: PropertyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<import("@/lib/supabase/types").PropertyImage[]>([]);
  const [tab, setTab] = useState<TabKey>("basic");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit && initialData) {
      setOpen(true);
      const defaults = { ...EMPTY };
      const merged = { ...defaults, ...initialData };
      setForm(merged);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof PropertyFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function nextTab() {
    const idx = TABS.findIndex((t) => t.key === tab);
    if (idx < TABS.length - 1) setTab(TABS[idx + 1].key);
  }
  function prevTab() {
    const idx = TABS.findIndex((t) => t.key === tab);
    if (idx > 0) setTab(TABS[idx - 1].key);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("\u8bf7\u8f93\u5165\u623f\u6e90\u540d\u79f0"); return; }

    const isRent = form.listing_type !== "sale";

    const bedrooms = form.bedrooms ? parseInt(form.bedrooms) : null;
    const livingRooms = form.living_rooms ? parseInt(form.living_rooms) : null;
    const bathroomsVal = form.bathrooms ? parseInt(form.bathrooms) : null;
    const kitchensVal = form.kitchens ? parseInt(form.kitchens) : 1;
    const balconiesVal = form.balconies ? parseInt(form.balconies) : 0;

    setSaving(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      property_no: form.property_no.trim() || null,
      name: form.name.trim(),
      listing_type: form.listing_type || "rent",
      status: form.status || "vacant",
      source: form.source || null,
      manager: form.manager.trim() || null,
      city: form.city || "",
      district: form.district.trim() || null,
      community: form.community.trim() || null,
      building: form.building.trim() || null,
      unit_num: form.unit_num.trim() || null,
      room_number: form.room_number.trim() || null,
      address: form.address.trim() || "",
      type: form.type || "apartment",
      usage_type: form.usage_type || null,
      area: form.area ? parseFloat(form.area) : null,
      bedrooms, living_rooms: livingRooms, bathrooms: bathroomsVal,
      kitchens: kitchensVal, balconies: balconiesVal,
      decoration: form.decoration || null,
      orientation: form.orientation.trim() || null,
      floor: form.floor ? parseInt(form.floor) : null,
      total_floors: form.total_floors ? parseInt(form.total_floors) : null,
      has_elevator: form.has_elevator === "true",
      furniture: form.furniture || null,
      year_built: form.year_built ? parseInt(form.year_built) : null,
      rent_price: isRent && form.rent_price ? parseFloat(form.rent_price) : null,
      sale_price: !isRent && form.sale_price ? parseFloat(form.sale_price) : null,
      rent: isRent && form.rent_price ? parseFloat(form.rent_price) : 0,
      payment_method: form.payment_method || null,
      property_rights: form.property_rights || null,
      heating: form.heating || null,
      parking: form.parking || null,
      owner_name: form.owner_name.trim() || null,
      owner_phone: form.owner_phone.trim() || null,
      follow_up_content: form.follow_up_content.trim() || null,
      last_follow_up_time: form.last_follow_up_time || null,
      viewing_method: form.viewing_method || null,
      notes: form.notes.trim() || null,
    };

    if (isEdit && propertyId) {
      const { error: updateError, data } = await supabase.from("properties").update(payload).eq("id", propertyId).select("id");
      setSaving(false);
      if (updateError) {
        if (updateError.code === "42P01") setError("\u6570\u636e\u5e93\u8868\u4e0d\u5b58\u5728\uff0c\u8bf7\u5148\u6267\u884c SQL \u8fc1\u79fb");
        else setError(updateError.message);
        return;
      }
      if (!data || data.length === 0) { setError("\u66f4\u65b0\u5931\u8d25\uff1a\u672a\u627e\u5230\u6b64\u8bb0\u5f55"); return; }
      setOpen(false);
      router.refresh();
      onSuccess?.();
    } else {
      const { error: insertError } = await supabase.from("properties").insert(payload);
      setSaving(false);
      if (insertError) {
        if (insertError.code === "42P01") setError("\u6570\u636e\u5e93\u8868\u4e0d\u5b58\u5728\uff0c\u8bf7\u5148\u6267\u884c SQL \u8fc1\u79fb");
        else if (insertError.code === "23505") setError("\u623f\u6e90\u7f16\u53f7\u5df2\u5b58\u5728\uff0c\u8bf7\u4f7f\u7528\u4e0d\u540c\u7f16\u53f7");
        else setError(insertError.message);
        return;
      }
      setOpen(false);
      router.refresh();
      onSuccess?.();
    }
  }

  const isRent = form.listing_type !== "sale";

  return (
    <>
      {!isEdit && trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : !isEdit ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />\u65b0\u589e\u623f\u6e90
        </Button>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => !saving && setOpen(false)} />
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>{isEdit ? "\u7f16\u8f91\u623f\u6e90" : "\u65b0\u589e\u623f\u6e90"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} disabled={saving}>
                  <X className="size-4" />
                </Button>
              </div>
              <CardDescription>
                {isEdit ? "\u4fee\u6539\u623f\u6e90\u4fe1\u606f" : "\u586b\u5199\u623f\u6e90\u8be6\u7ec6\u4fe1\u606f"}
              </CardDescription>
            </CardHeader>

            <div className="flex border-b px-4 shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={${bt}flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${
                    tab === t.key
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }${bt}}
                >
                  {tabIcon(t.key)}
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4 flex-1">
              {tab === "basic" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="\u623f\u6e90\u7f16\u53f7" value={form.property_no} placeholder="\u81ea\u52a8\u751f\u6210\u6216\u624b\u52a8\u8f93\u5165" onChange={(v) => set("property_no", v)} disabled={saving} />
                    <TextField label="\u623f\u6e90\u540d\u79f0" value={form.name} placeholder="\u5982\uff1a\u671b\u4eacSOHO\u7cbe\u88c5\u4e09\u5ba4" onChange={(v) => set("name", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <SelectField label="\u4ea4\u6613\u7c7b\u578b" value={form.listing_type} options={[["rent", "\u51fa\u79df"], ["sale", "\u51fa\u552e"]]} onChange={(v) => set("listing_type", v)} disabled={saving} />
                    <SelectField label="\u623f\u6e90\u72b6\u6001" value={form.status} options={STATUS_OPTIONS} onChange={(v) => set("status", v)} disabled={saving} />
                    <SelectField label="\u6765\u6e90" value={form.source} options={SOURCE_OPTIONS} onChange={(v) => set("source", v)} disabled={saving} />
                  </div>
                  <TextField label="\u8d1f\u8d23\u4eba" value={form.manager} placeholder="\u8d1f\u8d23\u4e2d\u4ecb\u59d3\u540d" onChange={(v) => set("manager", v)} disabled={saving} />
                </div>
              )}

              {tab === "location" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="\u57ce\u5e02" value={form.city} placeholder="\u5982\uff1a\u5317\u4eac" onChange={(v) => set("city", v)} disabled={saving} />
                    <TextField label="\u533a\u57df" value={form.district} placeholder="\u5982\uff1a\u671d\u9633\u533a" onChange={(v) => set("district", v)} disabled={saving} />
                  </div>
                  <TextField label="\u5c0f\u533a" value={form.community} placeholder="\u5982\uff1a\u671b\u4eacSOHO" onChange={(v) => set("community", v)} disabled={saving} />
                  <div className="grid grid-cols-3 gap-3">
                    <TextField label="\u680b" value={form.building} placeholder="\u5982\uff1a3\u53f7\u697c" onChange={(v) => set("building", v)} disabled={saving} />
                    <TextField label="\u5355\u5143" value={form.unit_num} placeholder="\u5982\uff1a1\u5355\u5143" onChange={(v) => set("unit_num", v)} disabled={saving} />
                    <TextField label="\u95e8\u724c" value={form.room_number} placeholder="\u5982\uff1a301" onChange={(v) => set("room_number", v)} disabled={saving} />
                  </div>
                  <TextField label="\u8be6\u7ec6\u5730\u5740" value={form.address} placeholder="\u5b8c\u6574\u5730\u5740" onChange={(v) => set("address", v)} disabled={saving} />
                </div>
              )}

              {tab === "property" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <SelectField label="\u623f\u6e90\u7c7b\u578b" value={form.type} options={TYPE_OPTIONS} onChange={(v) => set("type", v)} disabled={saving} />
                    <SelectField label="\u7528\u9014" value={form.usage_type} options={USAGE_OPTIONS} onChange={(v) => set("usage_type", v)} disabled={saving} />
                    <TextField label="\u9762\u79ef (m\xb2)" value={form.area} placeholder="\u5982\uff1a120" type="number" onChange={(v) => set("area", v)} disabled={saving} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">\u6237\u578b\u62c6\u5206</label>
                    <div className="grid grid-cols-5 gap-2">
                      <TextField label="\u5ba4" value={form.bedrooms} placeholder="0" type="number" onChange={(v) => set("bedrooms", v)} disabled={saving} />
                      <TextField label="\u5385" value={form.living_rooms} placeholder="0" type="number" onChange={(v) => set("living_rooms", v)} disabled={saving} />
                      <TextField label="\u536b" value={form.bathrooms} placeholder="0" type="number" onChange={(v) => set("bathrooms", v)} disabled={saving} />
                      <TextField label="\u53a8" value={form.kitchens} placeholder="1" type="number" onChange={(v) => set("kitchens", v)} disabled={saving} />
                      <TextField label="\u9633\u53f0" value={form.balconies} placeholder="0" type="number" onChange={(v) => set("balconies", v)} disabled={saving} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="\u88c5\u4fee" value={form.decoration} options={DECORATION_OPTIONS} onChange={(v) => set("decoration", v)} disabled={saving} />
                    <TextField label="\u671d\u5411" value={form.orientation} placeholder="\u5982\uff1a\u5357\u5317" onChange={(v) => set("orientation", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <TextField label="\u697c\u5c42" value={form.floor} placeholder="\u5982\uff1a3" type="number" onChange={(v) => set("floor", v)} disabled={saving} />
                    <TextField label="\u603b\u697c\u5c42" value={form.total_floors} placeholder="\u5982\uff1a6" type="number" onChange={(v) => set("total_floors", v)} disabled={saving} />
                    <SelectField label="\u7535\u68af" value={form.has_elevator} options={[["false", "\u65e0"], ["true", "\u6709"]]} onChange={(v) => set("has_elevator", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="\u5bb6\u5177" value={form.furniture} options={FURNITURE_OPTIONS} onChange={(v) => set("furniture", v)} disabled={saving} />
                    <TextField label="\u5efa\u9020\u5e74\u4efd" value={form.year_built} placeholder="\u5982\uff1a2015" type="number" onChange={(v) => set("year_built", v)} disabled={saving} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectField label="\u4f9b\u6696" value={form.heating} options={HEATING_OPTIONS} onChange={(v) => set("heating", v)} disabled={saving} />
                    <SelectField label="\u8f66\u4f4d" value={form.parking} options={PARKING_OPTIONS} onChange={(v) => set("parking", v)} disabled={saving} />
                  </div>
                </div>
              )}

              {tab === "transaction" && (
                <div className="space-y-4">
                  {isRent ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <TextField label="\u6708\u79df (\u5143)" value={form.rent_price} placeholder="\u5982\uff1a8000" type="number" onChange={(v) => set("rent_price", v)} disabled={saving} />
                        <SelectField label="\u4ed8\u6b3e\u65b9\u5f0f" value={form.payment_method} options={PAYMENT_OPTIONS} onChange={(v) => set("payment_method", v)} disabled={saving} />
                      </div>
                    </>
                  ) : (
                    <TextField label="\u552e\u4ef7 (\u5143)" value={form.sale_price} placeholder="\u5982\uff1a3500000" type="number" onChange={(v) => set("sale_price", v)} disabled={saving} />
                  )}
                  <SelectField label="\u4ea7\u6743" value={form.property_rights} options={RIGHTS_OPTIONS} onChange={(v) => set("property_rights", v)} disabled={saving} />
                </div>
              )}

              {tab === "followup" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="\u623f\u4e1c\u59d3\u540d" value={form.owner_name} placeholder="\u623f\u4e1c\u59d3\u540d" onChange={(v) => set("owner_name", v)} disabled={saving} />
                    <TextField label="\u623f\u4e1c\u7535\u8bdd" value={form.owner_phone} placeholder="138-0000-0000" onChange={(v) => set("owner_phone", v)} disabled={saving} />
                  </div>
                  <SelectField label="\u770b\u623f\u65b9\u5f0f" value={form.viewing_method} options={VIEWING_OPTIONS} onChange={(v) => set("viewing_method", v)} disabled={saving} />
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">\u8ddf\u8fdb\u5185\u5bb9</label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      placeholder="\u8ddf\u8fdb\u8bb0\u5f55..." value={form.follow_up_content}
                      onChange={(e) => set("follow_up_content", e.target.value)} disabled={saving}
                    />
                  </div>
                  <TextField label="\u6700\u540e\u8ddf\u8fdb\u65f6\u95f4" value={form.last_follow_up_time} placeholder="\u5982\uff1a2025-01-15" type="date" onChange={(v) => set("last_follow_up_time", v)} disabled={saving} />
                </div>
              )}

              {tab === "notes" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">\u5907\u6ce8</label>
                    <textarea
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                      placeholder="\u5176\u4ed6\u5907\u6ce8\u4fe1\u606f..." value={form.notes}
                      onChange={(e) => set("notes", e.target.value)} disabled={saving}
                    />
                  </div>
                  {isEdit && propertyId && (
                    <ImageUploader
                      propertyId={propertyId}
                      images={images}
                      onImagesChange={setImages}
                      disabled={saving}
                    />
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-1">
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={prevTab} disabled={tab === "basic" || saving}
                  >
                    <ChevronLeft className="size-4" />\u4e0a\u4e00\u6b65
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={nextTab} disabled={tab === "notes" || saving}
                  >
                    \u4e0b\u4e00\u6b65<ChevronRight className="size-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    \u53d6\u6d88
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="size-4 animate-spin" />}
                    \u4fdd\u5b58
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}

export function AddPropertyButton() { return <PropertyForm mode="add" />; }
`;

fs.appendFileSync(path, component, "utf8");
console.log("PropertyForm complete - rewritten with 6-tab layout");