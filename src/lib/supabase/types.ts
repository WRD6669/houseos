export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  id_card: string | null;
  notes: string | null;
  status: "active" | "inactive" | "pending" | "new" | "contacting" | "viewing" | "deal" | "closed";
  customer_type: "buyer" | "renter" | "both" | null;
  budget_min: number | null;
  budget_max: number | null;
  target_city: string | null;
  target_district: string | null;
  target_community: string | null;
  property_type_pref: string | null;
  bedrooms_pref: number | null;
  area_min: number | null;
  area_max: number | null;
  source: string | null;
  manager: string | null;
  last_follow_up_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  name: string;
  type: "apartment" | "villa" | "loft" | "cottage" | "commercial" | "shop" | "office";
  status: "vacant" | "occupied" | "sold" | "maintenance" | "pending";
  listing_type: "rent" | "sale";
  /** @deprecated Use rent_price instead */
  /** @deprecated */
  /** @deprecated Use rent_price instead */
  rent: number | null;
  rent_price: number | null;
  sale_price: number | null;
  city: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  living_rooms?: number;
  /** @deprecated Use area instead */
  area_sqft?: number;
  community?: string;
  decoration?: "furnished" | "standard" | "unfurnished" | "shell";
  orientation?: string;
  floor?: number;
  total_floors?: number;
  has_elevator?: boolean;
  furniture?: "full" | "partial" | "none";

  year_built?: number;
  property_rights?: "owned" | "mortgage" | "shared" | "other" | "public" | "commercial" | "military";
  heating?: "central" | "floor" | "radiator" | "ac" | "none";
  parking?: "yes" | "no" | "shared";
  /** @deprecated Use rent_price instead */
  property_no?: string;
  district?: string;
  building?: string;
  unit_num?: string;
  room_number?: string;
  usage_type?: string;
  kitchens?: number;
  balconies?: number;
  payment_method?: string;
  source?: string;
  manager?: string;
  follow_up_content?: string;
  follow_up?: string;
  last_follow_up_time?: string;
  viewing_method?: string;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
  room_layout: string | null;
  area: number | null;
  /** @deprecated Use bedrooms/living_rooms/bathrooms instead */
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


// Customer with full details (for detail page)
export interface CustomerWithDetails {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  wechat: string | null;
  id_card: string | null;
  notes: string | null;
  status: string;
  customer_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  target_city: string | null;
  target_district: string | null;
  target_community: string | null;
  property_type_pref: string | null;
  bedrooms_pref: number | null;
  area_min: number | null;
  area_max: number | null;
  source: string | null;
  manager: string | null;
  last_follow_up_time: string | null;
  property_count: number;
  created_at: string;
  matched_properties?: PropertyWithDetails[];
  follow_ups?: CustomerFollowUp[];
}

// Customer-Property junction
export interface CustomerProperty {
  id: string;
  customer_id: string;
  property_id: string;
  relation_type: "recommend" | "viewed" | "favorite" | "deal";
  status: string;
  notes: string | null;
  deal_price?: number | null;
  deal_date?: string | null;
  commission?: number | null;
  created_at: string;
}

// Customer follow-up record
export interface CustomerFollowUp {
  id: string;
  customer_id: string;
  content: string;
  follow_up_type: "call" | "wechat" | "visit" | "message" | "other";
  manager: string | null;
  scheduled_at?: string | null;
  result?: "pending" | "satisfied" | "thinking" | "rejected" | "deal" | null;
  property_id?: string | null;
  created_at: string;
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
  customer_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  target_city: string | null;
  target_district: string | null;
  target_community: string | null;
  property_type_pref: string | null;
  bedrooms_pref: number | null;
  area_min: number | null;
  area_max: number | null;
  source: string | null;
  manager: string | null;
  last_follow_up_time: string | null;
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
  /** @deprecated */
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
  property_no: string | null;
  district: string | null;
  building: string | null;
  unit_num: string | null;
  room_number: string | null;
  usage_type: string | null;
  kitchens: number | null;
  balconies: number | null;
  payment_method: string | null;
  source: string | null;
  manager: string | null;
  follow_up_content: string | null;
  follow_up: string | null;
  last_follow_up_time: string | null;
  viewing_method: string | null;
  primary_image_url: string | null;
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
