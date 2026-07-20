/**
 * Parse Chinese room descriptions like "三室两厅一卫" into structured integers.
 * Supports formats:
 *   - "三室两厅一卫" → { bedrooms: 3, livingRooms: 2, bathrooms: 1 }
 *   - "3-2-1"         → { bedrooms: 3, livingRooms: 2, bathrooms: 1 }
 *   - "3室2厅1卫"     → { bedrooms: 3, livingRooms: 2, bathrooms: 1 }
 *   - "3"             → { bedrooms: 3, livingRooms: 0, bathrooms: 0 }
 */

export interface ParsedRooms {
  bedrooms: number | null;
  livingRooms: number | null;
  bathrooms: number | null;
  /** Original text if parsing failed */
  raw: string | null;
}

const CN_NUM: Record<string, number> = {
  一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

function cnToNum(s: string): number | null {
  if (CN_NUM[s]) return CN_NUM[s];
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parse a room layout string into integer counts.
 * Returns null fields for unparseable values, with raw preserved.
 */
export function parseRoomLayout(input: string | null | undefined): ParsedRooms {
  const empty: ParsedRooms = { bedrooms: null, livingRooms: null, bathrooms: null, raw: null };

  if (!input || !input.trim()) return empty;

  const s = input.trim();

  // Pattern: "X室Y厅Z卫" or "X室Y厅" (Chinese chars)
  const chineseMatch = s.match(
    /(\d|[一二两三四五六七八九十]+)\s*室\s*(\d|[一二两三四五六七八九十]+)?\s*[厅堂]?\s*(\d|[一二两三四五六七八九十]+)?\s*[卫浴]?/
  );
  if (chineseMatch) {
    return {
      bedrooms: cnToNum(chineseMatch[1]),
      livingRooms: chineseMatch[2] ? cnToNum(chineseMatch[2]) : null,
      bathrooms: chineseMatch[3] ? cnToNum(chineseMatch[3]) : null,
      raw: null,
    };
  }

  // Pattern: "X-Y-Z" or "X/Y/Z" or "X Y Z"
  const dashMatch = s.match(/^(\d+)\s*[-/]\s*(\d+)\s*[-/]?\s*(\d*)$/);
  if (dashMatch) {
    return {
      bedrooms: parseInt(dashMatch[1], 10),
      livingRooms: parseInt(dashMatch[2], 10),
      bathrooms: dashMatch[3] ? parseInt(dashMatch[3], 10) : null,
      raw: null,
    };
  }

  // Pattern: bare integer "3"
  if (/^\d+$/.test(s)) {
    return { bedrooms: parseInt(s, 10), livingRooms: null, bathrooms: null, raw: null };
  }

  // Unparseable — preserve original text
  return { bedrooms: null, livingRooms: null, bathrooms: null, raw: s };
}