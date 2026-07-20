import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CustomerWithPropertyCount, PropertyWithDetails, LeaseWithDetails } from "./types";

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

// ── Customers ─────────────────────────────────────────────────────────

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
    if (error.code === "23505") return { data: null, error: "此邮箱已存在" };
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
    if (error.code === "23505") return { data: null, error: "此邮箱已存在" };
    return { data: null, error: error.message };
  }
  return { data: { ...data, property_count: 0 } as CustomerWithPropertyCount, error: null };
}

export async function deleteCustomer(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: null, error: null };
}

// ── Properties ────────────────────────────────────────────────────────

export async function fetchProperties(): Promise<QueryResult<PropertyWithDetails[]>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, area_sqft, owner_name, owner_phone, notes, area, rooms, created_at")
    .order("created_at", { ascending: false });
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  const { data: al } = await supabase.from("leases").select("property_id, customer_id").eq("status", "active");
  const tm: Record<string, string> = {};
  if (al) for (const r of al) tm[r.property_id] = r.customer_id;
  const nm = await fetchIdNames("customers", Object.values(tm));
  return { data: (data || []).map((p) => ({ ...p, tenant_name: nm[tm[p.id]] || null })), error: null };
}

export async function createProperty(input: {
  name: string; address: string; area: number | null; rooms: number | null; rent: number | null;
  owner_name: string | null; owner_phone: string | null; notes: string | null;
}): Promise<QueryResult<PropertyWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("properties")
    .insert({
      name: input.name, address: input.address, area: input.area, rooms: input.rooms,
      rent: input.rent ?? 0, owner_name: input.owner_name || null, owner_phone: input.owner_phone || null,
      notes: input.notes || null, status: "vacant", city: "", type: "apartment",
    })
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, area_sqft, owner_name, owner_phone, notes, area, rooms, created_at").single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: { ...data, tenant_name: null } as PropertyWithDetails, error: null };
}

export async function updateProperty(id: string, input: {
  name: string; address: string; area: number | null; rooms: number | null; rent: number | null;
  owner_name: string | null; owner_phone: string | null; notes: string | null;
}): Promise<QueryResult<PropertyWithDetails>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { data, error } = await supabase.from("properties")
    .update({
      name: input.name, address: input.address, area: input.area, rooms: input.rooms,
      rent: input.rent ?? 0, owner_name: input.owner_name || null, owner_phone: input.owner_phone || null,
      notes: input.notes || null,
    })
    .eq("id", id)
    .select("id, name, type, status, rent, city, address, bedrooms, bathrooms, area_sqft, owner_name, owner_phone, notes, area, rooms, created_at").single();
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: { ...data, tenant_name: null } as PropertyWithDetails, error: null };
}

export async function deleteProperty(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: null, error: null };
}

// ── Leases ────────────────────────────────────────────────────────────

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
  const propertyNames = await fetchIdNames("properties", [data.property_id]);
  const { data: pa } = await supabase.from("properties").select("address").eq("id", data.property_id).single();

  return {
    data: {
      ...data,
      customer_name: customerNames[data.customer_id] || "未知",
      property_name: propertyNames[data.property_id] || "未知",
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
      property_name: propertyNames[data.property_id] || "未知",
      property_address: pa?.address || "",
    } as LeaseWithDetails,
    error: null,
  };
}

export async function deleteLease(id: string): Promise<QueryResult<null>> {
  if (!isSupabaseConfigured()) return { data: null, error: "SUPABASE_NOT_CONFIGURED" };
  const supabase = await getServerClient();
  const { error } = await supabase.from("leases").delete().eq("id", id);
  if (error) return { data: null, error: error.code === "42P01" || error.message?.includes("does not exist") ? "TABLES_NOT_FOUND" : error.message };
  return { data: null, error: null };
}

export async function createPropertiesBatch(inputs: {
  name: string; address: string; area: number | null; rooms: number | null; rent: number | null;
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