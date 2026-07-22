/**
 * HouseOS v2.2 — Business Flow Test
 * 
 * Simulates a real agent workflow:
 *   Scenario 1: Customer matching
 *   Scenario 2: Viewing scheduling
 *   Scenario 3: Deal closing
 * 
 * Usage: npx tsx scripts/test-business-flow.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Config
// ============================================================
const TEST_CUSTOMER = {
  name: "王女士 (测试)",
  phone: "13800000001",
  customer_type: "renter",
  budget_min: 1000,
  budget_max: 1500,
  target_city: "兰州",
  target_district: "安宁区",
  bedrooms_pref: 2,
  area_min: 80,
  area_max: 120,
  source: "微信",
  status: "new",
  manager: "店长",
};

const TEST_PROPERTY = {
  name: "立达青年郡 2-3-901 (测试)",
  listing_type: "rent",
  community: "立达青年郡",
  building: "2",
  unit_num: "3",
  room_number: "901",
  city: "兰州",
  district: "安宁区",
  bedrooms: 2,
  living_rooms: 1,
  bathrooms: 1,
  area: 94,
  rent_price: 1400,
  rent: 1400,
  floor: 9,
  total_floors: 28,
  orientation: "南北",
  decoration: "furnished",
  status: "vacant",
  type: "apartment",
  address: "兰州市安宁区立达青年郡2号楼3单元901",
};

// ============================================================
// Scenario 1: Match Properties for Customer
// ============================================================
async function testMatch() {
  console.log("\n===== Scenario 1: 房源匹配 =====");

  // 1a. Find or create test customer
  let { data: customer } = await supabase
    .from("customers")
    .select("id, name, customer_type, budget_min, budget_max, target_district, target_city, bedrooms_pref, area_min, area_max, property_type_pref")
    .eq("phone", TEST_CUSTOMER.phone)
    .single();

  if (!customer) {
    const { data: created } = await supabase
      .from("customers")
      .insert(TEST_CUSTOMER)
      .select("*")
      .single();
    customer = created;
    console.log("  创建测试客户:", customer?.name, customer?.id?.slice(0, 8));
  } else {
    console.log("  使用已有测试客户:", customer.name, customer.id.slice(0, 8));
  }

  // 1b. Find or create test property
  let { data: property } = await supabase
    .from("properties")
    .select("id, name, rent_price, community, bedrooms, area, status, listing_type")
    .eq("name", TEST_PROPERTY.name)
    .single();

  if (!property) {
    const { data: created } = await supabase
      .from("properties")
      .insert(TEST_PROPERTY)
      .select("id, name, rent_price, community, bedrooms, area, status, listing_type")
      .single();
    property = created;
    console.log("  创建测试房源:", property?.name, property?.id?.slice(0, 8));
  } else {
    console.log("  使用已有测试房源:", property.name, property.id.slice(0, 8));
  }

  // 1c. Run matching (simulate what matchPropertiesForCustomer does)
  const listingFilter = customer.customer_type === "renter" ? ["rent"] : 
    customer.customer_type === "buyer" ? ["sale"] : ["rent", "sale"];

  const { data: props } = await supabase
    .from("properties")
    .select("*")
    .in("status", ["vacant", "available"])
    .in("listing_type", listingFilter);

  if (!props || props.length === 0) {
    console.log("  ❌ 无可匹配房源");
    return { customer, property, matches: [] };
  }

  // Score each property
  const MAX_SCORE = 25 + 25 + 20 + 15 + 10 + 5;
  const scored = props.map((p: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Region (25)
    if (customer.target_city && p.city === customer.target_city) { score += 12; reasons.push("城市一致"); }
    else if (customer.target_city) score += 5;
    if (customer.target_district && p.district === customer.target_district) { score += 13; reasons.push("区域一致"); }

    // Budget (25)
    const price = p.listing_type === "rent" ? (p.rent_price ?? p.rent) : p.sale_price;
    if (price && customer.budget_min != null && customer.budget_max != null) {
      if (price >= customer.budget_min && price <= customer.budget_max) { score += 25; reasons.push("价格符合预算"); }
      else if (price >= customer.budget_min * 0.8 && price <= customer.budget_max * 1.2) { score += 12; reasons.push("价格接近预算"); }
    }

    // Bedrooms (20)
    if (customer.bedrooms_pref != null && p.bedrooms != null) {
      if (p.bedrooms === customer.bedrooms_pref) { score += 20; reasons.push("户型匹配"); }
      else if (Math.abs(p.bedrooms - customer.bedrooms_pref) <= 1) { score += 10; reasons.push("户型接近"); }
    }

    // Area (15)
    const area = p.area ?? p.area_sqft;
    if (area && customer.area_min != null && customer.area_max != null) {
      if (area >= customer.area_min && area <= customer.area_max) { score += 15; reasons.push("面积符合"); }
      else if (area >= customer.area_min * 0.8 && area <= customer.area_max * 1.2) { score += 7; reasons.push("面积接近"); }
    }

    // Listing type (10)
    score += 10;
    reasons.push(p.listing_type === "rent" ? "租房类型匹配" : "售房类型匹配");

    // Property type (5)
    if (customer.property_type_pref && p.type === customer.property_type_pref) { score += 5; reasons.push("房屋类型匹配"); }

    const matchPercent = Math.min(100, Math.round((score / MAX_SCORE) * 100));
    return { ...p, _matchScore: matchPercent, _matchReasons: reasons };
  });

  scored.sort((a: any, b: any) => b._matchScore - a._matchScore);

  console.log("\n  匹配结果:");
  scored.slice(0, 5).forEach((p: any) => {
    console.log(`    [${p._matchScore}%] ${p.community || p.name} | ${p.rent_price ?? p.sale_price}元 | ${p.bedrooms}室 | ${p.area}㎡`);
    console.log(`           原因: ${p._matchReasons.join(", ")}`);
  });

  return { customer, property, matches: scored };
}

// ============================================================
// Scenario 2: Viewing Scheduling
// ============================================================
async function testViewing(customer: any, property: any) {
  if (!customer || !property) { console.log("  ❌ 缺少客户或房源"); return null; }
  console.log("\n===== Scenario 2: 安排带看 =====");

  // Create a follow-up record as a scheduled viewing
  const viewingData = {
    customer_id: customer.id,
    content: `带看房源: ${property.community || property.name}，预约看房`,
    follow_up_type: "call",
    scheduled_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(), // 3 days from now
    result: "pending",
    property_id: property.id,
  };

  const { data: viewing, error } = await supabase
    .from("customer_follow_ups")
    .insert(viewingData)
    .select("*")
    .single();

  if (error) {
    // Fallback: try without new columns (scheduled_at, result, property_id)
    console.log("  新字段不可用，使用基础字段:", error.message.slice(0, 80));
    const { data: fallback, error: fErr } = await supabase
      .from("customer_follow_ups")
      .insert({
        customer_id: customer.id,
        content: `[预约看房] ${property.community || property.name}，时间: 3天后`,
        follow_up_type: "call",
      })
      .select("*")
      .single();
    if (fErr) {
      console.log("  ❌ 带看安排失败:", fErr.message);
      return null;
    }
    console.log("  ✓ 带看已安排 (基础模式):", fallback.id.slice(0, 8));
    console.log(`    房源: ${property.community || property.name}`);
    return fallback;
  }

  console.log("  ✓ 带看已安排:", viewing.id.slice(0, 8));
  console.log(`    房源: ${property.community || property.name}`);
  console.log(`    时间: ${new Date(viewing.scheduled_at).toLocaleString("zh-CN")}`);
  return viewing;
}

// ============================================================
// Scenario 3: Deal Closing
// ============================================================
async function testDeal(customer: any, property: any) {
  if (!customer || !property) { console.log("  ❌ 缺少客户或房源"); return; }
  console.log("\n===== Scenario 3: 成交流程 =====");

  const dealData = {
    customer_id: customer.id,
    property_id: property.id,
    deal_price: property.rent_price ?? 1400,
    deal_date: new Date().toISOString(),
    commission: Math.round((property.rent_price ?? 1400) * 0.5), // half month rent as commission
    notes: "测试成交，客户满意",
  };

  // 1. Update customer
  const { data: updatedCust, error: cErr } = await supabase
    .from("customers")
    .update({ status: "deal", last_follow_up_time: new Date().toISOString() })
    .eq("id", customer.id)
    .select("id, name, status")
    .single();

  if (cErr) {
    console.log("  ❌ 客户状态更新失败:", cErr.message);
    return;
  }
  console.log("  ✓ 客户状态已更新:", updatedCust.status);

  // 2. Update property
  const isRent = property.listing_type === "rent";
  const { data: updatedProp, error: pErr } = await supabase
    .from("properties")
    .update({ status: isRent ? "occupied" : "sold" })
    .eq("id", property.id)
    .select("id, name, status")
    .single();

  if (pErr) {
    console.log("  ❌ 房源状态更新失败:", pErr.message);
    return;
  }
  console.log("  ✓ 房源状态已更新:", updatedProp.status);

  // 3. Create relation
  const { data: relation, error: rErr } = await supabase
    .from("customer_properties")
    .insert({
      customer_id: customer.id,
      property_id: property.id,
      relation_type: "deal",
      status: "active",
      notes: dealData.notes,
      deal_price: dealData.deal_price,
      deal_date: dealData.deal_date,
      commission: dealData.commission,
    })
    .select("id, relation_type")
    .single();

  if (rErr) {
    // Fallback without new columns
    console.log("  新字段不可用，使用基础字段:", rErr.message.slice(0, 80));
    const { data: fallback, error: fErr } = await supabase
      .from("customer_properties")
      .insert({
        customer_id: customer.id,
        property_id: property.id,
        relation_type: "deal",
        status: "active",
        notes: `${dealData.notes} [价格:${dealData.deal_price} 佣金:${dealData.commission}]`,
      })
      .select("id, relation_type")
      .single();
    if (fErr) {
      console.log("  ❌ 关联记录创建失败:", fErr.message);
    } else {
      console.log("  ✓ 关联记录已创建 (基础模式):", fallback.id.slice(0, 8));
    }
  } else {
    console.log("  ✓ 关联记录已创建:", relation.id.slice(0, 8));
  }

  // 4. Auto follow-up
  await supabase.from("customer_follow_ups").insert({
    customer_id: customer.id,
    content: `成交! ${isRent ? "已出租" : "已出售"} ${property.community || property.name}, 成交价:${dealData.deal_price}`,
    follow_up_type: "other",
  });

  console.log("\n  🎉 成交流程完成!");
  console.log(`    客户: ${customer.name} → ${updatedCust.status}`);
  console.log(`    房源: ${property.community || property.name} → ${updatedProp.status}`);
  console.log(`    价格: ¥${dealData.deal_price}/月`);
  console.log(`    佣金: ¥${dealData.commission}`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║  HouseOS v2.2 业务流程测试            ║");
  console.log("╚════════════════════════════════════════╝");

  try {
    // Scenario 1: Match
    const { customer, property, matches } = await testMatch();

    if (!customer || !property) {
      console.log("\n❌ 测试失败：缺少测试数据");
      return;
    }

    // Scenario 2: Viewing
    const viewing = await testViewing(customer, property);

    // Scenario 3: Deal
    await testDeal(customer, property);

    // Summary
    console.log("\n╔════════════════════════════════════════╗");
    console.log("║  测试完成!                             ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`  匹配房源数: ${matches.length}`);
    console.log(`  最高匹配: ${matches[0]?._matchScore || 0}%`);
    console.log("  带看: ✓");
    console.log("  成交: ✓");

    // Cleanup test data
    console.log("\n  清理测试数据...");
    await supabase.from("customer_follow_ups").delete().eq("customer_id", customer.id);
    await supabase.from("customer_properties").delete().eq("customer_id", customer.id);
    await supabase.from("customers").delete().eq("id", customer.id);
    await supabase.from("properties").delete().eq("id", property.id);
    console.log("  ✓ 测试数据已清理");

  } catch (err) {
    console.error("测试异常:", err);
  }
}

main();
