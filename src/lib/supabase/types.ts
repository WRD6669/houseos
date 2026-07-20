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
  type: "apartment" | "villa" | "loft" | "cottage" | "commercial" | "shop" | "office";
  status: "vacant" | "occupied" | "sold" | "maintenance" | "pending";
  listing_type: "rent" | "sale";
  rent: number;
  rent_price: number | null;
  sale_price: number | null;
  city: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  living_rooms?: number;
  area_sqft?: number;
  community?: string;
  decoration?: "furnished" | "standard" | "unfurnished" | "shell";
  orientation?: string;
  floor?: number;
  total_floors?: number;
  has_elevator?: boolean;
  furniture?: "full" | "partial" | "none";

  year_built?: number;
  property_rights?: "owned" | "mortgage" | "shared" | "other";
  heating?: "central" | "floor" | "radiator" | "ac" | "none";
  parking?: "yes" | "no" | "shared";
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  room_layout: string | null;
  area: number | null;
  rooms: number | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_primary: boolean;
  width: number | null;
  height: number | null;
  file_size: number | null;
  created_at: string;
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
  listing_type: string;
  rent: number;
  rent_price: number | null;
  sale_price: number | null;
  city: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  living_rooms: number | null;
  area_sqft: number | null;
  community: string | null;
  decoration: string | null;
  orientation: string | null;
  floor: number | null;
  total_floors: number | null;
  has_elevator: boolean | null;
  furniture: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  room_layout: string | null;
  area: number | null;
  rooms: number | null;
  year_built: number | null;
  property_rights: string | null;
  heating: string | null;
  parking: string | null;
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
