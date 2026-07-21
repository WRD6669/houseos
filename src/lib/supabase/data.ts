import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CustomerWithPropertyCount, PropertyWithDetails, LeaseWithDetails, PropertyImage } from "./types";

async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url === "your-project-url.supabase.co" || key === "your-anon-key") return false;
  return true;
}

export interface QueryResult<T> { data: T | null; error: string | null; }

interface IdName { id: string; name: string; }

async function fetchIdNames(table: string, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const supabase = await getServerClient();
  const { data } = await supabase.from(table).select("id, name").in("id", ids);
  const map: Record<string, string> = {};
  if (data) for (const row of data as IdName[]) map[row.id] = row.name;
  return map;
}

// 闂佸啿鍘滈崑鎾绘煃閸忓浜?Dashboard Stats 闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸?
export interface DashboardStats {
  customerCount: number;
  propertyCount: number;
  occupiedCount: number;
  vacantCount: number;
  occupancyRate: number;
  totalMonthlyRent: number;
  recentActivity: { action: string; target: string; time: string }[];
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return mins + " 分钟前";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " 小时前";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + " 天前";
  return new Date(iso).toISOString().slice(0, 10);
}

export async function fetchDashboardStats(): Promise<QueryResult<DashboardStats>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();

  const { count: customerCount, error: cErr } = await supabase.from("customers").select("*", { count: "exact", head: true });
  if (cErr) return { data: null, error: cErr.message };

  const { data: props, error: pErr } = await supabase.from("properties").select("status, rent, rent_price, name, created_at").order("created_at", { ascending: false });
  if (pErr) return { data: null, error: pErr.code === "42P01" ? "TABLES_NOT_FOUND" : pErr.message };

  const propertyCount = props?.length ?? 0;
  const occupied = props?.filter((p: { status: string }) => p.status === "occupied").length ?? 0;
  const vacant = props?.filter((p: { status: string }) => p.status === "vacant").length ?? 0;
  const occupancyRate = propertyCount > 0 ? Math.round((occupied / propertyCount) * 100) : 0;

  const { data: activeLeases, error: lErr } = await supabase.from("leases").select("monthly_rent, customer_id, property_id, created_at").eq("status", "active");
  if (lErr) return { data: null, error: lErr.code === "42P01" ? "TABLES_NOT_FOUND" : lErr.message };
  const totalMonthlyRent = (activeLeases ?? []).reduce((sum: number, l: { monthly_rent: number }) => sum + (l.monthly_rent ?? 0), 0);

  const recent: { action: string; target: string; time: string }[] = [];

  const { data: recentCustomers } = await supabase.from("customers").select("name, created_at").order("created_at", { ascending: false }).limit(3);
  if (recentCustomers) for (const c of recentCustomers as { name: string; created_at: string }[]) recent.push({ action: "新增客户", target: c.name, time: c.created_at });

  const { data: recentProps } = await supabase.from("properties").select("name, created_at").order("created_at", { ascending: false }).limit(3);
  if (recentProps) for (const p of recentProps as { name: string; created_at: string }[]) recent.push({ action: "新增房源", target: p.name, time: p.created_at });

  const { data: recentLeases } = await supabase.from("leases").select("created_at").order("created_at", { ascending: false }).limit(3);
  if (recentLeases) for (const l of recentLeases as { created_at: string }[]) recent.push({ action: "新签租约", target: "", time: l.created_at });

  recent.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const recentActivity = recent.slice(0, 6).map((r) => ({ ...r, time: formatRelativeTime(r.time) }));

  return {
    data: { customerCount: customerCount ?? 0, propertyCount, occupiedCount: occupied, vacantCount: vacant, occupancyRate, totalMonthlyRent, recentActivity },
    error: null,
  };
}

// 闂佸啿鍘滈崑鎾绘煃閸忓浜?Customers 闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑?
export async function fetchCustomers(): Promise<QueryResult<CustomerWithPropertyCount[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, wechat, id_card, notes, status, created_at")
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  const { data: lc } = await supabase.from("leases").select("customer_id").in("status", ["active", "expired"]);
  const cm: Record<string, number> = {};
  if (lc) for (const r of lc) cm[r.customer_id] = (cm[r.customer_id] || 0) + 1;
  return { data: (data || []).map((c) => ({ ...c, property_count: cm[c.id] || 0 })), error: null };
}

export async function createCustomer(input: {
  name: string; email: string | null; phone: string | null; wechat: string | null; id_card: string | null; notes: string | null;
}): Promise<QueryResult<CustomerWithPropertyCount>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("customers")
    .insert({ name: input.name, email: input.email || null, phone: input.phone || null, wechat: input.wechat || null, id_card: input.id_card || null, notes: input.notes || null, status: "active" })
    .select("id, name, email, phone, wechat, id_card, notes, status, created_at").single();
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) return { data: null, error: "TABLES_NOT_FOUND" };
    return { data: null, error: error.message };
  }
  return { data: { ...data, property_count: 0 } as CustomerWithPropertyCount, error: null };
}

export async function updateCustomer(id: string, input: {
  name: string; email: string | null; phone: string | null; wechat: string | null; id_card: string | null; notes: string | null;
}): Promise<QueryResult<CustomerWithPropertyCount>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("customers")
    .update({ name: input.name, email: input.email || null, phone: input.phone || null, wechat: input.wechat || null, id_card: input.id_card || null, notes: input.notes || null })
    .eq("id", id)
    .select("id, name, email, phone, wechat, id_card, notes, status, created_at").single();
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) return { data: null, error: "TABLES_NOT_FOUND" };
    return { data: null, error: error.message };
  }
  return { data: { ...data, property_count: 0 } as CustomerWithPropertyCount, error: null };
}

export async function deleteCustomer(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error, data } = await supabase.from("customers").delete().eq("id", id).select("id");
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  if (!error && !data?.length) return { data: null, error: "删除失败：未能删除此记录，请检查数据库权限" };
  return { data: null, error: null };
}

// 闂佸啿鍘滈崑鎾绘煃閸忓浜?Properties 闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕

export async function fetchProperties(): Promise<QueryResult<PropertyWithDetails[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, living_rooms, area_sqft, listing_type, rent_price, sale_price, community, decoration, orientation, floor, total_floors, has_elevator, furniture, owner_name, owner_phone, notes, room_layout, area, rooms, year_built, property_rights, heating, parking, property_no, district, building, unit_num, room_number, usage_type, kitchens, balconies, payment_method, source, manager, follow_up_content, last_follow_up_time, viewing_method, created_at").order("created_at", { ascending: false });
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  const { data: al } = await supabase.from("leases").select("property_id, customer_id").eq("status", "active");
  const tm: Record<string, string> = {};
  if (al) for (const r of al) tm[r.property_id] = r.customer_id;
  const nm = await fetchIdNames("customers", Object.values(tm));
  // Fetch primary images for all properties
  const propIds = (data || []).map((p) => p.id);
  const imageMap: Record<string, string> = {};
  if (propIds.length > 0) {
    const { data: images } = await supabase.from("property_images").select("property_id, url").eq("is_primary", true).in("property_id", propIds);
    if (images) for (const img of images) imageMap[img.property_id] = img.url;
  }
  return { data: (data || []).map((p) => ({ ...p, tenant_name: nm[tm[p.id]] || null, primary_image_url: imageMap[p.id] || null })), error: null };
}


export async function fetchPropertyById(id: string): Promise<QueryResult<PropertyWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, living_rooms, area_sqft, listing_type, rent_price, sale_price, community, decoration, orientation, floor, total_floors, has_elevator, furniture, owner_name, owner_phone, notes, room_layout, area, rooms, year_built, property_rights, heating, parking, created_at")
    .eq("id", id)
    .single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  // Attach tenant_name
  const { data: al } = await supabase.from("leases").select("customer_id").eq("property_id", id).eq("status", "active").limit(1);
  let tenantName: string | null = null;
  if (al && al.length > 0) {
    const { data: cust } = await supabase.from("customers").select("name").eq("id", al[0].customer_id).single();
    tenantName = cust?.name ?? null;
  }
  const { data: piById } = await supabase.from("property_images").select("url").eq("property_id", id).eq("is_primary", true).limit(1).maybeSingle();
  return { data: { ...data, tenant_name: tenantName, primary_image_url: piById?.url ?? null } as PropertyWithDetails, error: null };
}

export async function createProperty(input: {
  name: string; address: string; area: number | null; rooms: number | null; room_layout: string | null; rent: number | null;
  owner_name: string | null; owner_phone: string | null; notes: string | null;
}): Promise<QueryResult<PropertyWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("properties")
    .insert({
      name: input.name, address: input.address, area: input.area, 
    rent: input.rent ?? 0, owner_name: input.owner_name || null, owner_phone: input.owner_phone || null,
      notes: input.notes || null, room_layout: input.room_layout || null, status: "vacant", city: "", type: "apartment",
    })
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, area_sqft, listing_type, rent_price, sale_price, community, decoration, orientation, floor, total_floors, has_elevator, furniture, owner_name, owner_phone, notes, room_layout, area, rooms, year_built, property_rights, heating, parking, created_at").single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: { ...data, tenant_name: null, primary_image_url: null } as PropertyWithDetails, error: null };
}

export async function updateProperty(id: string, input: {
  name: string; address: string; area: number | null; rooms: number | null; room_layout: string | null; rent: number | null;
  owner_name: string | null; owner_phone: string | null; notes: string | null;
}): Promise<QueryResult<PropertyWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("properties")
    .update({
      name: input.name, address: input.address, area: input.area, 
    rent: input.rent ?? 0, owner_name: input.owner_name || null, owner_phone: input.owner_phone || null,
      notes: input.notes || null, room_layout: input.room_layout || null,
    })
    .eq("id", id)
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, area_sqft, listing_type, rent_price, sale_price, community, decoration, orientation, floor, total_floors, has_elevator, furniture, owner_name, owner_phone, notes, room_layout, area, rooms, year_built, property_rights, heating, parking, created_at").single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: { ...data, tenant_name: null, primary_image_url: null } as PropertyWithDetails, error: null };
}

export async function deleteProperty(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error, data } = await supabase.from("properties").delete().eq("id", id).select("id");
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  if (!error && !data?.length) return { data: null, error: "删除失败：未能删除此记录，请检查数据库权限" };
  return { data: null, error: null };
}

// 闂佸啿鍘滈崑鎾绘煃閸忓浜?Leases 闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕闂佸啿鍘滈崑鎾绘煃閸忓浜鹃梺鍐插帨閸嬫捇鏌嶉崗澶婁壕

export async function fetchLeases(): Promise<QueryResult<LeaseWithDetails[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("leases")
    .select("id, customer_id, property_id, start_date, end_date, monthly_rent, deposit, payment_day, status, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };

  const customerIds = [...new Set((data || []).map((l) => l.customer_id))];
  const propertyIds = [...new Set((data || []).map((l) => l.property_id))];
  const customerNames = await fetchIdNames("customers", customerIds);
  const propertyNames = await fetchIdNames("properties", propertyIds);
  const addressMap: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const { data: pa } = await supabase.from("properties").select("id, address").in("id", propertyIds);
    if (pa) for (const r of pa as { id: string; address: string }[]) addressMap[r.id] = r.address;
  }

  const result: LeaseWithDetails[] = (data || []).map((l) => ({
    ...l,
    customer_name: customerNames[l.customer_id] || "未知",
    property_name: propertyNames[l.property_id] || "未知",
    property_address: addressMap[l.property_id] || "",
  }));
  return { data: result, error: null };

}
export async function createLease(input: {
  customer_id: string; property_id: string; start_date: string; end_date: string;
  monthly_rent: number; deposit: number | null; payment_day: number | null; notes: string | null;
}): Promise<QueryResult<LeaseWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("leases")
    .insert({
      customer_id: input.customer_id, property_id: input.property_id,
      start_date: input.start_date, end_date: input.end_date,
      monthly_rent: input.monthly_rent, deposit: input.deposit,
      payment_day: input.payment_day ?? 1, notes: input.notes || null, status: "active",
    })
    .select("id, customer_id, property_id, start_date, end_date, monthly_rent, deposit, payment_day, status, notes, created_at")
    .single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };

  const customerNames = await fetchIdNames("customers", [data.customer_id]);

  const { data: pa } = await supabase.from("properties").select("address").eq("id", data.property_id).single();

  return {
    data: {
      ...data,
      customer_name: customerNames[data.customer_id] || "未知",
      property_address: pa?.address || "",
    } as LeaseWithDetails,
    error: null,
  };
}

export async function updateLease(id: string, input: {
  customer_id: string; property_id: string; start_date: string; end_date: string;
  monthly_rent: number; deposit: number | null; payment_day: number | null; notes: string | null;
}): Promise<QueryResult<LeaseWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("leases")
    .update({
      customer_id: input.customer_id, property_id: input.property_id,
      start_date: input.start_date, end_date: input.end_date,
      monthly_rent: input.monthly_rent, deposit: input.deposit,
      payment_day: input.payment_day ?? 1, notes: input.notes || null,
    })
    .eq("id", id)
    .select("id, customer_id, property_id, start_date, end_date, monthly_rent, deposit, payment_day, status, notes, created_at")
    .single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };

  const customerNames = await fetchIdNames("customers", [data.customer_id]);
  const propertyNames = await fetchIdNames("properties", [data.property_id]);
  const { data: pa } = await supabase.from("properties").select("address").eq("id", data.property_id).single();

  return {
    data: {
      ...data,
      customer_name: customerNames[data.customer_id] || "未知",
      property_address: pa?.address || "",
    } as LeaseWithDetails,
    error: null,
  };
}

export async function deleteLease(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error, data } = await supabase.from("leases").delete().eq("id", id).select("id");
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  if (!error && !data?.length) return { data: null, error: "删除失败：未能删除此记录，请检查数据库权限" };
  return { data: null, error: null };
}

export async function createPropertiesBatch(inputs: {
  name: string; address: string; area: number | null; rooms: number | null; living_rooms: number | null; rent: number | null;
  owner_name: string | null; owner_phone: string | null; notes: string | null;
}[]): Promise<QueryResult<{ inserted: number; errors: string[] }>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  if (inputs.length === 0) return { data: { inserted: 0, errors: [] }, error: null };

  const supabase = await getServerClient();
  const rows = inputs.map((input) => ({
    name: input.name,
    address: input.address,
    area: input.area,
    rooms: input.rooms,
    living_rooms: input.living_rooms,
    rent: input.rent ?? 0,
    owner_name: input.owner_name || null,
    owner_phone: input.owner_phone || null,
    notes: input.notes || null,
    status: "vacant",
    city: "",
    type: "apartment",
  }));

  const { data, error } = await supabase.from("properties").insert(rows).select("id");
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) return { data: null, error: "TABLES_NOT_FOUND" };
    return { data: null, error: error.message };
  }

  return { data: { inserted: data?.length || 0, errors: [] }, error: null };
}

// ============================================================
// Image CRUD
// ============================================================

export async function fetchPropertyImages(propertyId: string): Promise<QueryResult<(PropertyImage & { created_at: string })[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: true });
  if (error) return { data: null, error: error.code === "42P01" ? "TABLES_NOT_FOUND" : error.message };
  return { data: data as (PropertyImage & { created_at: string })[], error: null };
}

export async function createPropertyImage(input: {
  property_id: string;
  url: string;
  thumbnail_url?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
}): Promise<QueryResult<PropertyImage & { created_at: string }>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("property_images")
    .insert({
      property_id: input.property_id,
      url: input.url,
      thumbnail_url: input.thumbnail_url || null,
      sort_order: input.sort_order ?? 0,
      is_primary: input.is_primary ?? false,
      width: input.width || null,
      height: input.height || null,
      file_size: input.file_size || null,
    })
    .select("*")
    .single();
  if (error) return { data: null, error: error.code === "42P01" ? "TABLES_NOT_FOUND" : error.message };
  return { data: data as PropertyImage & { created_at: string }, error: null };
}

export async function updatePropertyImage(id: string, input: {
  url?: string;
  thumbnail_url?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
}): Promise<QueryResult<PropertyImage & { created_at: string }>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("property_images")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { data: null, error: error.code === "42P01" ? "TABLES_NOT_FOUND" : error.message };
  return { data: data as PropertyImage & { created_at: string }, error: null };
}

export async function deletePropertyImage(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error, data } = await supabase.from("property_images").delete().eq("id", id).select("id");
  if (error) return { data: null, error: error.code === "42P01" ? "TABLES_NOT_FOUND" : error.message };
  if (!data?.length) return { data: null, error: "删除失败" };
  return { data: null, error: null };
}

export async function setPrimaryImage(propertyId: string, imageId: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  // Unset all primary
  await supabase.from("property_images").update({ is_primary: false }).eq("property_id", propertyId);
  // Set the target as primary
  const { error } = await supabase.from("property_images").update({ is_primary: true }).eq("id", imageId);
  if (error) return { data: null, error: error.code === "42P01" ? "TABLES_NOT_FOUND" : error.message };
  return { data: null, error: null };
}
