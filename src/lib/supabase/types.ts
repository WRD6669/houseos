export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  id_card: string | null;
  notes: string | null;
  status: "active" | "inactive" | "pending";
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  type: "apartment" | "villa" | "loft" | "cottage" | "commercial";
  status: "occupied" | "vacant" | "maintenance";
  rent: number;
  city: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  area: number | null;
  rooms: number | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  property_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number | null;
  payment_day: number | null;
  status: "active" | "expired" | "terminated";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Customer with property count (returned by data layer)
export interface CustomerWithPropertyCount {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  id_card: string | null;
  notes: string | null;
  status: string;
  property_count: number;
  created_at: string;
}

// Property with tenant name (returned by data layer)
export interface PropertyWithDetails {
  id: string;
  name: string;
  type: string;
  status: string;
  rent: number;
  city: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  area: number | null;
  rooms: number | null;
  tenant_name: string | null;
  created_at: string;
}

// Lease with joined customer/property names
export interface LeaseWithDetails {
  id: string;
  customer_id: string;
  property_id: string;
  customer_name: string;
  property_name: string;
  property_address: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number | null;
  payment_day: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}
