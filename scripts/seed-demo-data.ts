/**
 * HouseOS Demo Data Seed Script
 * Usage: npx tsx scripts/seed-demo-data.ts
 * Prerequisites: .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  const envVars: Record<string, string> = {};
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) envVars[match[1]] = match[2].trim();
  });
  process.env = { ...process.env, ...envVars };
} catch {
  console.warn("Warning: .env.local not found, using existing env vars");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// Demo Properties
// ============================================================
const properties = [
  {
    name: "阳光花园 3-2-1201", type: "apartment", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "阳光花园",
    address: "兰州市安宁区阳光花园3号楼2单元1201",
    building: "3", unit_num: "2", room_number: "1201",
    bedrooms: 3, living_rooms: 2, bathrooms: 1,
    area: 120, floor: 12, total_floors: 28,
    orientation: "南北通透", decoration: "furnished", has_elevator: true,
    rent_price: 8000, rent: 8000,
    property_rights: "owned", heating: "central",
    source: "门店", manager: "店长",
    follow_up: "房主急租，可随时看房",
    notes: "精装修三室两厅，家电齐全",
    property_no: "HS-2024-001",
  },
  {
    name: "立达青年郡 2-3-901", type: "apartment", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "立达青年郡",
    address: "兰州市安宁区立达青年郡2号楼3单元901",
    building: "2", unit_num: "3", room_number: "901",
    bedrooms: 2, living_rooms: 1, bathrooms: 1,
    area: 94, floor: 9, total_floors: 28,
    orientation: "南北", decoration: "furnished", has_elevator: true,
    rent_price: 1400, rent: 1400,
    property_rights: "owned", heating: "central",
    source: "微信", manager: "店长",
    follow_up: "有钥匙，随时看房",
    notes: "精装修两室一厅",
    property_no: "HS-2024-002",
  },
  {
    name: "十四佳园 1-3-301", type: "apartment", status: "occupied", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "十四佳园",
    address: "兰州市安宁区十四佳园1号楼3单元301",
    building: "1", unit_num: "3", room_number: "301",
    bedrooms: 2, living_rooms: 1, bathrooms: 1,
    area: 94, floor: 3, total_floors: 28,
    orientation: "南北", decoration: "furnished", has_elevator: true,
    rent_price: 1300, rent: 1300,
    property_rights: "owned", heating: "central",
    source: "门店", manager: "店长",
    follow_up: "租客已入住",
    notes: "钥匙在4S店",
    property_no: "HS-2024-003",
  },
  {
    name: "二十九佳园东区 8-1-404", type: "apartment", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "二十九佳园东区",
    address: "兰州市安宁区二十九佳园东区8号楼1单元404",
    building: "8", unit_num: "1", room_number: "404",
    bedrooms: 1, living_rooms: 1, bathrooms: 1,
    area: 55, floor: 4, total_floors: 24,
    orientation: "南", decoration: "furnished", has_elevator: true,
    rent_price: 900, rent: 900,
    property_rights: "owned", heating: "central",
    source: "微信", manager: "店长",
    follow_up: "密码0000，随时看房",
    notes: "精装修一室一厅",
    property_no: "HS-2024-004",
  },
  {
    name: "十四佳园 1-2-1601", type: "apartment", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "十四佳园",
    address: "兰州市安宁区十四佳园1号楼2单元1601",
    building: "1", unit_num: "2", room_number: "1601",
    bedrooms: 2, living_rooms: 2, bathrooms: 1,
    area: 94, floor: 16, total_floors: 28,
    orientation: "南北", decoration: "standard", has_elevator: true,
    rent_price: 1000, rent: 1000,
    property_rights: "owned", heating: "central",
    source: "门店", manager: "店长",
    follow_up: "有钥匙，随时看房",
    notes: "简单装修两室两厅",
    property_no: "HS-2024-005",
  },
  {
    name: "青年郡 2-2-2101", type: "apartment", status: "vacant", listing_type: "sale",
    city: "兰州", district: "安宁区", community: "青年郡",
    address: "兰州市安宁区青年郡2号楼2单元2101",
    building: "2", unit_num: "2", room_number: "2101",
    bedrooms: 2, living_rooms: 1, bathrooms: 1,
    area: 95, floor: 21, total_floors: 28,
    orientation: "南北", decoration: "standard", has_elevator: true,
    sale_price: 350000, rent: 0,
    property_rights: "owned", heating: "central",
    source: "门店", manager: "店长",
    follow_up: "房本满2年，租户9月1号到期",
    notes: "简装两室一厅，高层视野好",
    property_no: "HS-2024-006",
  },
  {
    name: "万柳书院 A-1201", type: "apartment", status: "vacant", listing_type: "sale",
    city: "兰州", district: "安宁区", community: "万柳书院",
    address: "兰州市安宁区万柳书院A号楼1单元1201",
    building: "A", unit_num: "1", room_number: "1201",
    bedrooms: 3, living_rooms: 2, bathrooms: 2,
    area: 140, floor: 12, total_floors: 18,
    orientation: "南北通透", decoration: "furnished", has_elevator: true,
    sale_price: 12000000, rent: 0,
    property_rights: "owned", heating: "central",
    source: "转介绍", manager: "店长",
    follow_up: "学区房，业主诚信出售",
    notes: "精装修三室两厅两卫，开发商自带装修",
    property_no: "HS-2024-007",
  },
  {
    name: "金隅国际 B-2201", type: "apartment", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "金隅国际",
    address: "兰州市安宁区金隅国际B号楼1单元2201",
    building: "B", unit_num: "1", room_number: "2201",
    bedrooms: 3, living_rooms: 2, bathrooms: 1,
    area: 120, floor: 22, total_floors: 30,
    orientation: "南北通透", decoration: "furnished", has_elevator: true,
    rent_price: 8000, rent: 8000,
    property_rights: "owned", heating: "central",
    source: "微信", manager: "店长",
    follow_up: "个人房源，可随时看房",
    notes: "精装修三室两厅",
    property_no: "HS-2024-008",
  },
  {
    name: "万达广场商铺 1F-108", type: "shop", status: "vacant", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "万达广场",
    address: "兰州市安宁区万达广场1号楼108",
    building: "1", unit_num: "", room_number: "108",
    bedrooms: 0, living_rooms: 0, bathrooms: 1,
    area: 80, floor: 1, total_floors: 5,
    orientation: "东", decoration: "standard", has_elevator: true,
    rent_price: 15000, rent: 15000,
    property_rights: "commercial", heating: "central",
    source: "门店", manager: "店长",
    follow_up: "人流量大，适合餐饮",
    notes: "一楼商铺，带装修",
    property_no: "HS-2024-009",
  },
  {
    name: "天通苑 4-1-501", type: "apartment", status: "occupied", listing_type: "rent",
    city: "兰州", district: "安宁区", community: "天通苑",
    address: "兰州市安宁区天通苑4号楼1单元501",
    building: "4", unit_num: "1", room_number: "501",
    bedrooms: 2, living_rooms: 1, bathrooms: 1,
    area: 90, floor: 5, total_floors: 18,
    orientation: "南", decoration: "standard", has_elevator: true,
    rent_price: 3500, rent: 3500,
    property_rights: "owned", heating: "radiator",
    source: "门店", manager: "经理助理",
    follow_up: "租客稳定，已续约",
    notes: "简装两室一厅，交通便利",
    property_no: "HS-2024-010",
  },
];// ============================================================
// Demo Customers
// ============================================================
const customers = [
  {
    name: "王女士", email: null, phone: "1380000001", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 3000, budget_max: 5000,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 2,
    area_min: 80, area_max: 100,
    source: "微信", manager: "店长", status: "viewing",
    notes: "在望京上班，需要通勤方便",
  },
  {
    name: "李先生", email: null, phone: "1380000002", wechat: null, id_card: null,
    customer_type: "buyer", budget_min: 300, budget_max: 500,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 3,
    area_min: 110, area_max: 150,
    source: "门店", manager: "店长", status: "contacting",
    notes: "为孩子上学购房，需要学区",
  },
  {
    name: "张先生", email: null, phone: "1380000003", wechat: null, id_card: null,
    customer_type: "buyer", budget_min: 800, budget_max: 1500,
    target_city: "北京", target_district: "海淀区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 3,
    area_min: 130, area_max: 180,
    source: "转介绍", manager: "店长", status: "deal",
    notes: "已成交，万柳书院购房",
  },
  {
    name: "赵女士", email: null, phone: "1380000004", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 800, budget_max: 1500,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 1,
    area_min: 40, area_max: 60,
    source: "电话", manager: "店长", status: "new",
    notes: "刚毕业，预算有限",
  },
  {
    name: "陈先生", email: null, phone: "1380000005", wechat: null, id_card: null,
    customer_type: "both", budget_min: 500, budget_max: 800,
    target_city: "北京", target_district: "朝阳区", target_community: "立达青年郡",
    property_type_pref: "apartment", bedrooms_pref: 2,
    area_min: 80, area_max: 100,
    source: "微信", manager: "店长", status: "viewing",
    notes: "买卖均可，先租后买也可以",
  },
  {
    name: "刘女士", email: null, phone: "1380000006", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 1000, budget_max: 2000,
    target_city: "北京", target_district: "昌平区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 2,
    area_min: 80, area_max: 100,
    source: "门店", manager: "经理助理", status: "contacting",
    notes: "想在天通苑附近租房",
  },
  {
    name: "周先生", email: null, phone: "1380000007", wechat: null, id_card: null,
    customer_type: "buyer", budget_min: 200, budget_max: 400,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 2,
    area_min: 80, area_max: 100,
    source: "电话", manager: "店长", status: "new",
    notes: "首次买房，需要多带看",
  },
  {
    name: "吴女士", email: null, phone: "1380000008", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 5000, budget_max: 10000,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "apartment", bedrooms_pref: 3,
    area_min: 100, area_max: 140,
    source: "微信", manager: "店长", status: "closed",
    notes: "已暂停寻找，家庭原因回老家",
  },
  {
    name: "郑先生", email: null, phone: "1380000009", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 12000, budget_max: 20000,
    target_city: "北京", target_district: "朝阳区", target_community: null,
    property_type_pref: "shop", bedrooms_pref: null,
    area_min: 50, area_max: 100,
    source: "门店", manager: "店长", status: "viewing",
    notes: "需要商铺开店，餐饮类",
  },
  {
    name: "孙女士", email: null, phone: "1380000010", wechat: null, id_card: null,
    customer_type: "renter", budget_min: 2000, budget_max: 4000,
    target_city: "北京", target_district: "朝阳区", target_community: "十四佳园",
    property_type_pref: "apartment", bedrooms_pref: 2,
    area_min: 80, area_max: 100,
    source: "转介绍", manager: "店长", status: "deal",
    notes: "已租到十四佳园两室",
  },
];

async function main() {
  console.log("=== HouseOS Demo Data Seed ===");
  console.log("");

  // Insert Properties
  console.log("Inserting " + properties.length + " properties...");
  for (const p of properties) {
    const { error } = await supabase.from("properties").insert(p as any);
    if (error) {
      console.error("  FAIL: " + p.name + " - " + error.message);
    } else {
      console.log("  OK: " + p.name + " (" + p.listing_type + " / " + p.community + ")");
    }
  }

  // Insert Customers
  console.log("");
  console.log("Inserting " + customers.length + " customers...");
  for (const c of customers) {
    const { error } = await supabase.from("customers").insert(c as any);
    if (error) {
      console.error("  FAIL: " + c.name + " - " + error.message);
    } else {
      console.log("  OK: " + c.name + " (" + c.customer_type + " / " + c.status + ")");
    }
  }

  console.log("");
  console.log("=== Done! ===");
  console.log("Visit http://localhost:3000/dashboard to see the demo data.");
}

main().catch(console.error);
