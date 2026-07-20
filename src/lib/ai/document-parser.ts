export interface ParsedDocument {
  name: string | null;
  phone: string | null;
  community: string | null;
  address: string | null;
  area: string | null;
  price: string | null;
  room: string | null;
  floor: string | null;
  remark: string | null;
}

interface Rule {
  field: keyof ParsedDocument;
  patterns: RegExp[];
  transform?: (m: string) => string;
}

const trim = (s: string) => s.replace(/^[\s:：]+|[\s:：]+$/g, "").trim();

const RULES: Rule[] = [
  {
    field: "name",
    patterns: [
      /姓名[:：\s]+(.+)/i,
      /客户[:：\s]+(.+)/i,
      /租客[:：\s]+(.+)/i,
      /联系人[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "phone",
    patterns: [
      /电话[:：\s]*([\d\-+()（）\s]{7,20})/i,
      /手机[:：\s]*([\d\-+()（）\s]{7,20})/i,
      /联系方式[:：\s]*([\d\-+()（）\s]{7,20})/i,
      /\b1[3-9]\d{9}\b/,
    ],
    transform: (s) => s.replace(/[()（）\s\-]/g, ""),
  },
  {
    field: "community",
    patterns: [
      /小区名称[:：\s]+(.+)/i,
      /小区名[:：\s]+(.+)/i,
      /小区[:：\s]+(.+)/i,
      /楼盘[:：\s]+(.+)/i,
      /项目[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "address",
    patterns: [
      /地址[:：\s]+(.+)/i,
      /楼号[:：\s]+(.+)/i,
      /栋号[:：\s]+(.+)/i,
      /门牌[:：\s]+(.+)/i,
      /房号[:：\s]+(.+)/i,
      /坐落[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "area",
    patterns: [
      /面积[:：\s]*(\d+\.?\d*)\s*(?:[㎡平米m²M²平方])?/i,
      /(\d+\.?\d*)\s*(?:[㎡平米m²M²平方])/i,
    ],
  },
  {
    field: "price",
    patterns: [
      /价格[:：\s]*(\d+\.?\d*)\s*(?:[万元/月])?/i,
      /租金[:：\s]*(\d+\.?\d*)\s*(?:[元/月])?/i,
      /月租[:：\s]*(\d+\.?\d*)/i,
      /预算[:：\s]*(\d+\.?\d*)/i,
    ],
  },
  {
    field: "room",
    patterns: [
      /户型[:：\s]+(.+)/i,
      /格局[:：\s]+(.+)/i,
      /房型[:：\s]+(.+)/i,
      /居室[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "floor",
    patterns: [
      /楼层[:：\s]+(.+)/i,
      /层数[:：\s]+(.+)/i,
      /所在楼层[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
];

/**
 * Parse OCR-extracted text from a customer document/image
 * into structured fields using regex rules.
 */
export function parseDocumentText(text: string): ParsedDocument {
  const result: ParsedDocument = {
    name: null, phone: null, community: null, address: null,
    area: null, price: null, room: null, floor: null, remark: null,
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const rule of RULES) {
    if (result[rule.field] !== null && result[rule.field] !== undefined) continue;
    for (const pattern of rule.patterns) {
      for (const line of lines) {
        const m = line.match(pattern);
        if (m) {
          (result as unknown as Record<string, unknown>)[rule.field] = rule.transform ? rule.transform(m[1]) : m[1];
          break;
        }
      }
      if (result[rule.field] !== null) break;
    }
  }

  // Fallback: try full raw text
  for (const rule of RULES) {
    if (result[rule.field] !== null && result[rule.field] !== undefined) continue;
    for (const pattern of rule.patterns) {
      const m = text.match(pattern);
      if (m) {
        (result as unknown as Record<string, unknown>)[rule.field] = rule.transform ? rule.transform(m[1]) : m[1];
        break;
      }
    }
  }

  // Collect unmatched lines as remark
  const matchedLines = new Set<number>();
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) matchedLines.add(i);
      }
    }
  }

  const NOISE = [/房屋[出]*租/, /中介/, /微信/, /昵称/, /看房/, /随时/, /^[\d\sA-Za-z\-_@.]+$/];
  const USED_KW = ["姓名", "电话", "手机", "小区", "地址", "面积", "租金", "户型", "楼层", "价格", "预算"];

  const unmatched = lines
    .filter((_, i) => !matchedLines.has(i))
    .filter((l) => l.length > 2)
    .filter((l) => !NOISE.some((p) => p.test(l)))
    .filter((l) => !USED_KW.some((kw) => l.includes(kw)));

  if (unmatched.length > 0) {
    result.remark = unmatched.join("; ");
  }

  return result;
}
