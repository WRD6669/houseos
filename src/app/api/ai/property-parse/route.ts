import { NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `你是一个专业房地产数据录入助手。你的任务是把用户输入的房源描述转换成结构化 JSON。

规则：
1. 只返回 JSON，不要任何解释、Markdown 或代码块标记
2. 不确定的信息填写空字符串 ""，数字填 null
3. 数字字段只返回数字，不要带单位
4. 电话保持完整数字
5. 中文地址不要丢失任何信息
6. type 字段从以下选择：apartment（公寓）、villa（别墅）、loft（Loft）、cottage（平房）、commercial（商铺）、shop（门店）、office（写字楼）
7. 户型格式如：三室两厅、2-1-1。注意分离室/厅/卫数量
8. listing_type 字段：出租填"rent"，出售填"sale"。如果第一行是"房屋出租"或提到"出租"则填"rent"，如果是"出售""卖房"则填"sale"
9. 出租时 rent_price 填租金数字(元)，sale_price 填 null；出售时 rent_price 填 null，sale_price 填售价数字(元)。注意："附36万""售价36万"→sale_price=360000，自动万元乘10000
10. decoration 字段从以下选择：furnished（精装）、standard（简装）、unfurnished（毛坯）、shell（清水房）
11. orientation 字段示例：南、北、南北、东南
12. floor 和 total_floors 填数字。如果输入"9/28"→floor=9,total_floors=28。has_elevator 填 true 或 false
13. furniture 字段从以下选择：full（拎包入住）、partial（部分家具）、none（空房）
14. community 填小区名称。"小区名称:XXX"的XXX填community，不要把小区名填到name里
15. name 填房源标题/楼盘名，不要填小区名
16. address。楼号"2-3-901"→address="2-3-901",building=2,unit_num=3,room_number=901
17. building填栋号,unit_num填单元号,room_number填门牌号
18. viewing_method："随时看房"→"anytime","预约看房"→"appointment","有钥匙"/"密码锁"→"key"
19. 租房"附36万"→放notes,出售房"附XX万"→sale_price=XX*10000
16. address 填详细地址(楼栋号单元门牌)

返回 JSON 格式：
{
  "name": "楼盘名称或标题",
  "address": "楼栋号、单元、门牌",
  "type": "apartment",
  "listing_type": "rent",
  "rent_price": 数字或null,
  "sale_price": 数字或null,
  "area": 数字或null,
  "rooms": "户型描述如三室两厅或2-1-1",
  "community": "小区名称",
  "decoration": "furnished",
  "orientation": "南",
  "floor": 数字或null,
  "total_floors": 数字或null,
  "has_elevator": true或false,
  "furniture": "full",
  "owner_name": "房东姓名",
  "owner_phone": "电话号码",
  "notes": "其他备注信息"
}`;

export async function POST(request: Request) {
  try {
    // Trim to remove any accidental whitespace/newlines from .env
    const apiKey = (process.env.DEEPSEEK_API_KEY ?? "").trim();

    if (!apiKey || apiKey === "sk-your-key-here") {
      return NextResponse.json(
        { error: "DEEPSEEK_API_KEY 未配置或仍为占位符，请在 .env.local 中设置真实 API Key" },
        { status: 500 }
      );
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "请输入房源描述文字" }, { status: 400 });
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepSeek API error:", response.status, errText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: "DeepSeek API Key 无效 (401)。请检查 .env.local 中的 DEEPSEEK_API_KEY 是否正确，是否已充值。" },
          { status: 502 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "DeepSeek API 请求过于频繁 (429)，请稍后重试" },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: `DeepSeek API 错误 (${response.status})：${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI 未返回有效内容，请尝试更换描述文字" },
        { status: 500 }
      );
    }

    // Parse JSON from response (handle markdown wrapping)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI 返回格式异常，请重试。原始内容：" + content.slice(0, 300) },
        { status: 500 }
      );
    }

    let building = "";
    let unitNum = "";
    let roomNum = "";
    let viewMethod = "";
    if (parsed.building != null) building = String(parsed.building);
    if (parsed.unit_num != null) unitNum = String(parsed.unit_num);
    if (parsed.room_number != null) roomNum = String(parsed.room_number);
    if (parsed.viewing_method != null) viewMethod = String(parsed.viewing_method);
    // Fallback: extract viewing_method from text/notes when AI does not set it
    if (!viewMethod) {
      const textToCheck = String(parsed.notes ?? "") + " " + text;
      if (/有钥匙|钥匙在|密码锁|密码\d/.test(textToCheck)) viewMethod = "key";
      else if (/随时看房|随时/.test(textToCheck)) viewMethod = "anytime";
      else if (/预约看房|预约/.test(textToCheck)) viewMethod = "appointment";
    }
    if (!building) {
      const addrStr = String(parsed.address ?? "");
      const dashAddr = addrStr.match(/^(\d+)\\s*[-]\\s*(\d+)\\s*[-]\\s*(\d+[A-Za-z]*)$/);
      if (dashAddr) { building = dashAddr[1]; unitNum = dashAddr[2]; roomNum = dashAddr[3]; }
    }

    // Parse rooms string into bedrooms/living_rooms/bathrooms
    const roomsStr = String(parsed.rooms ?? "");
    let bedrooms = null;
    let livingRooms = null;
    let bathrooms = null;
    if (roomsStr) {
      const dashMatch = roomsStr.match(/^(\d+)\s*[-\/]\s*(\d+)\s*[-\/]?\s*(\d*)$/);
      if (dashMatch) {
        bedrooms = parseInt(dashMatch[1], 10);
        livingRooms = parseInt(dashMatch[2], 10);
        bathrooms = dashMatch[3] ? parseInt(dashMatch[3], 10) : null;
      } else {
        const cnNums: Record<string, number> = { "一":1, "二":2, "两":2, "三":3, "四":4, "五":5, "六":6, "七":7, "八":8, "九":9, "十":10 };
        const cnMatch = roomsStr.match(/((\d|[一二两三四五六七八九十])+)\s*室\s*((\d|[一二两三四五六七八九十])+)?\s*[厅堂]?\s*((\d|[一二两三四五六七八九十])+)?\s*[卫浴]?/);
        if (cnMatch) {
          const b = cnMatch[1]; bedrooms = cnNums[b] ?? parseInt(b, 10) ?? null;
          const l = cnMatch[3]; livingRooms = l ? (cnNums[l] ?? parseInt(l, 10) ?? null) : null;
          const w = cnMatch[5]; bathrooms = w ? (cnNums[w] ?? parseInt(w, 10) ?? null) : null;
        }
      }
    }
    let floor = typeof parsed.floor === "number" ? parsed.floor : null;
    let totalFloors = typeof parsed.total_floors === "number" ? parsed.total_floors : null;
    if (floor == null && typeof parsed.floor === "string" && parsed.floor.includes("/")) {
      const parts = parsed.floor.split("/").map(Number);
      floor = parts[0] || null;
      totalFloors = parts[1] || null;
    }
    const property = {
      name: String(parsed.name ?? ""),
      address: String(parsed.address ?? ""),
      type: ["apartment", "villa", "loft", "cottage", "commercial", "shop", "office"].includes(parsed.type)
        ? parsed.type
        : "apartment",
      listing_type: ["rent", "sale"].includes(parsed.listing_type) ? parsed.listing_type : 
        // rent_price > 0 always means rent; sale_price > 0 only means sale when no rent_price
        (typeof parsed.rent_price === "number" && parsed.rent_price > 0 ? "rent" : 
         (typeof parsed.sale_price === "number" && parsed.sale_price > 0 && 
          (typeof parsed.rent_price !== "number" || parsed.rent_price <= 0) ? "sale" : "rent")),
      rent_price: typeof parsed.rent_price === "number" ? parsed.rent_price : null,
      sale_price: typeof parsed.sale_price === "number" ? parsed.sale_price : null,
      area: typeof parsed.area === "number" ? parsed.area : null,
      rooms: roomsStr,
      bedrooms: bedrooms,
      living_rooms: livingRooms,
      bathrooms: bathrooms,
      community: String(parsed.community ?? ""),
      decoration: ["furnished", "standard", "unfurnished", "shell"].includes(parsed.decoration) ? parsed.decoration : "",
      orientation: String(parsed.orientation ?? ""),
      floor: floor,
      total_floors: totalFloors,
      has_elevator: typeof parsed.has_elevator === "boolean" ? parsed.has_elevator : null,
      furniture: ["full", "partial", "none"].includes(parsed.furniture) ? parsed.furniture : "",
      building: building,
      unit_num: unitNum,
      room_number: roomNum,
      viewing_method: viewMethod,
      kitchens: 1,
      balconies: 0,
      status: "vacant",
      owner_name: String(parsed.owner_name ?? ""),
      owner_phone: String(parsed.owner_phone ?? "").replace(/[^0-9+\-]/g, ""),
      notes: String(parsed.notes ?? ""),
    };

    // Safety: if listing_type is rent, force sale_price to null
    // (prevents "?36" in rental listings from being misinterpreted as sale price)
    if (property.listing_type === "rent" && property.sale_price != null) {
      // Move the would-be sale price info to notes if not already there
      const saleNote = "?" + (property.sale_price >= 10000 ? (property.sale_price / 10000) + "?" : property.sale_price);
      if (!property.notes.includes(saleNote) && !property.notes.includes("?")) {
        property.notes = property.notes ? property.notes + " " + saleNote : saleNote;
      }
      property.sale_price = null;
    }

    // Fallback: generate name from community + building/unit_num/room_number
    if (!property.name) {
      let generated = property.community || "";
      const bld = building || property.building || "";
      const un = unitNum || property.unit_num || "";
      const rn = roomNum || property.room_number || "";
      if (bld && un && rn) {
        generated += (generated ? " " : "") + bld + "-" + un + "-" + rn;
      } else if (bld) {
        generated += (generated ? " " : "") + bld;
      }
      if (!generated && property.address) generated = property.address;
      property.name = generated || text.trim() || "?????";
    }

    return NextResponse.json(property);
  } catch (error) {
    console.error("Property parse error:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}