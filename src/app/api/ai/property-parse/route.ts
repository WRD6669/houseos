import { NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const SYSTEM_PROMPT = `你是一个专业房地产数据录入助手。你的任务是把用户输入的房源描述转换成结构化 JSON。

规则：
1. 只返回 JSON，不要任何解释、Markdown 或代码块标记
2. 不确定的信息填写空字符串 ""
3. 数字字段只返回数字，不要带单位
4. 电话保持完整数字
5. 中文地址不要丢失任何信息
6. type 字段从以下选择：apartment（公寓）、villa（别墅）、loft（Loft）、cottage（平房）、commercial（商铺）、shop（门店）、office（写字楼）
7. 户型格式如：三室两厅、2-1-1
8. listing_type 字段：出租填"rent"，出售填"sale"
9. 出租时 rent_price 填租金数字，sale_price 填 null；出售时 rent_price 填 null，sale_price 填售价数字（单位：元）
10. decoration 字段从以下选择：furnished（精装）、standard（简装）、unfurnished（毛坯）、shell（清水房）
11. orientation 字段示例：南、北、南北、东南
12. floor 和 total_floors 填数字，has_elevator 填 true 或 false
13. furniture 字段从以下选择：full（拎包入住）、partial（部分家具）、none（空房）
14. community 填小区名称

返回 JSON 格式：
{
  "name": "小区或楼盘名称",
  "address": "楼栋号、单元、门牌",
  "type": "apartment",
  "listing_type": "rent",
  "rent_price": 数字或null,
  "sale_price": 数字或null,
  "area": 数字或null,
  "rooms": "户型描述",
  "community": "小区名称",
  "decoration": "furnished",
  "orientation": "南",
  "floor": 数字或null,
  "total_floors": 数字或null,
  "has_elevator": true,
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

    const property = {
      name: String(parsed.name ?? ""),
      address: String(parsed.address ?? ""),
      type: ["apartment", "villa", "loft", "cottage", "commercial", "shop", "office"].includes(parsed.type)
        ? parsed.type
        : "apartment",
      rent_price: typeof parsed.rent_price === "number" ? parsed.rent_price : null,
      area: typeof parsed.area === "number" ? parsed.area : null,
      rooms: String(parsed.rooms ?? ""),
      owner_name: String(parsed.owner_name ?? ""),
      owner_phone: String(parsed.owner_phone ?? "").replace(/[^0-9+\-]/g, ""),
      notes: String(parsed.notes ?? ""),
    };

    return NextResponse.json(property);
  } catch (error) {
    console.error("Property parse error:", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}