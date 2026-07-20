export interface ParsedProperty {
  name: string | null;
  address: string | null;
  rent: number | null;
  area: number | null;
  rooms: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  notes: string | null;
}

interface Rule {
  field: keyof ParsedProperty;
  patterns: RegExp[];
  transform?: (match: string) => string | number | null;
}

const toNum = (s: string) => { const n = parseFloat(s); return Number.isNaN(n) ? null : n; };
const trim = (s: string) => s.replace(/^[\s:：]+|[\s:：]+$/g, "").trim();

const RULES: Rule[] = [
  {
    field: "name",
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
      /楼号[:：\s]+(.+)/i,
      /地址[:：\s]+(.+)/i,
      /栋号[:：\s]+(.+)/i,
      /门牌[:：\s]+(.+)/i,
      /房号[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "rooms",
    patterns: [
      /户型[:：\s]+(.+)/i,
      /格局[:：\s]+(.+)/i,
      /房型[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "area",
    patterns: [
      /面积[:：\s]*(\d+\.?\d*)\s*(?:[㎡平米m²M²])?/i,
      /面积[:：\s]*(\d+\.?\d*)/i,
    ],
    transform: toNum,
  },
  {
    field: "rent",
    patterns: [
      /租金[:：\s]*(\d+\.?\d*)\s*(?:[元/月])?/i,
      /月租[:：\s]*(\d+\.?\d*)/i,
      /价格[:：\s]*(\d+\.?\d*)/i,
    ],
    transform: toNum,
  },
  {
    field: "owner_name",
    patterns: [
      /房东[:：\s]+(.+)/i,
      /联系人[:：\s]+(.+)/i,
      /业主[:：\s]+(.+)/i,
    ],
    transform: trim,
  },
  {
    field: "owner_phone",
    patterns: [
      /电话[:：\s]*([\d\-+()（）\s]{7,20})/i,
      /手机[:：\s]*([\d\-+()（）\s]{7,20})/i,
      /\b[\d]{11}\b/,
    ],
    transform: (s) => s.replace(/[()（）\s\-]/g, ""),
  },
];

/**
 * Parse free-text property information into structured fields.
 * Uses regex rules to extract name, address, rent, area, rooms, etc.
 */
export function parsePropertyText(text: string): ParsedProperty {
  const result: ParsedProperty = {
    name: null, address: null, rent: null, area: null,
    rooms: null, owner_name: null, owner_phone: null, notes: null,
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Apply rules in priority order — try each line against each pattern
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

  // Fallback: try matching against the full raw text
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

  // Collect unmatched lines as notes (with noise filtering)
  const matchedLines = new Set<number>();
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) matchedLines.add(i);
      }
    }
  }

  const NOISE = [
    /房屋[出]*租/,
    /中介/,
    /微信/,
    /昵称/,
    /看房/,
    /随时/,
    /押[金\d]/,
    /付款/,
    /^[\d\sA-Za-z\-_@.]+$/,
  ];

  const USED_KW = [
    "小区名称", "小区", "楼盘", "项目",
    "楼号", "地址", "栋号", "门牌", "房号",
    "户型", "格局", "房型",
    "面积", "租金", "月租", "价格",
    "房东", "联系人", "业主",
    "电话", "手机",
  ];

  const unmatched = lines
    .filter((_, i) => !matchedLines.has(i))
    .filter((l) => l.length > 2)
    .filter((l) => !NOISE.some((p) => p.test(l)))
    .filter((l) => !USED_KW.some((kw) => l.includes(kw)));

  if (unmatched.length > 0) {
    result.notes = unmatched.join("; ");
  }

  return result;
}
