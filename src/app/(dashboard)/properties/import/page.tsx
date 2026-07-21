"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Check, Loader2, Upload, X, AlertTriangle } from "lucide-react";
import Link from "next/link";

const FIELD_ALIASES = { name:["名称","房源名称","楼盘名称","小区名称","项目名称","标题","name","title"], address:["地址","详细地址","楼盘地址","address","位置"], property_no:["房源编号","编号","房号","property_no","no","id"], listing_type:["交易类型","类型","租售类型","出租/出售"], community:["小区","社区","小区名","楼盘"], area:["面积","建筑面积","使用面积","㎡","m²","area","size"], bedrooms:["室","卧室","房间","几室","bedrooms"], living_rooms:["厅","客厅","几厅","living_rooms","halls"], bathrooms:["卫","卫生间","洗手间","几卫","bathrooms"], kitchens:["厨","厨房","几厨","kitchens"], balconies:["阳台","几阳台","balconies"], rent_price:["租金","月租","房租","月租金","rent","rent_price","月租(元)"], sale_price:["成交价","售价","总价","挂牌价","底价","底价万","出售价格","出售总价","报价","价格","房价","sale_price","售价(万)","售价（万）","总价(万)","总价（万元）","单价","price","sale"], floor:["楼层","所在楼层","floor","current_floor"], total_floors:["总楼层","总层数","total_floors","total"], orientation:["朝向","方向","orientation","direction"], decoration:["装修","装修情况","装修程度","decoration","装修标准"], usage_type:["用途","房屋用途","使用类型","usage_type"], status:["状态","房源状态","status"], payment_method:["付款方式","支付方式","payment_method","付款"], viewing_method:["看房方式","看房","viewing_method"], owner_name:["房东","业主","房东姓名","业主姓名","联系人","owner_name","房主"], owner_phone:["电话","房东电话","业主电话","联系方式","手机","owner_phone","手机号"], notes:["备注","说明","描述","notes","remark","note"], source:["来源","渠道","source"], manager:["负责人","经纪人","经理人","manager"], has_elevator:["电梯","是否有电梯","has_elevator"], furniture:["家具","家具家电","配置","furniture"], heating:["供暖","取暖","heating"], parking:["车位","停车","parking"], year_built:["建造年份","建成年份","建造时间","year_built"], property_rights:["产权","产权性质","property_rights"], building:["栋","楼栋","栋号","building"], unit_num:["单元","unit_num"], room_number:["门牌","房号","门牌号","room_number"], city:["城市","city"], district:["区域","区","行政区","district"], follow_up:["跟进","跟进内容","随访","备注跟进"] };
const HEADER_LOOKUP = (()=>{const m=new Map();for(const[k,v]of Object.entries(FIELD_ALIASES)){for(const a of v){const key=a.toLowerCase().trim();if(!m.has(key))m.set(key,k)}}return m})();
function extractNumber(v){if(v===null||v===undefined||v==="")return null;if(typeof v==="number")return Number.isNaN(v)?null:v;const s=String(v).trim();const n=Number(s);if(!Number.isNaN(n))return n;const m=s.match(/[\d.]+/);return m?Number(m[0]):null}
function mapStatus(v){const s=v.trim();if(/已出租|租出|已租/.test(s))return"occupied";if(/已售|售出|成交/.test(s))return"sold";if(/维护|修缮|装修中/.test(s))return"maintenance";if(/下架|失效|无效|暂停/.test(s))return"pending";if(/出租|在租|出租中|可租|有效|待租/.test(s))return"vacant";if(/出售|在售|待售|可售/.test(s))return"vacant";return"vacant"}
function mapDecoration(v){const s=v.trim();if(/毛坯|清水/.test(s))return"shell";if(/精装|精装修|精致|豪华|豪装/.test(s))return"furnished";if(/简装|简单装修|简单/.test(s))return"standard";if(/无装修|无/.test(s))return"unfurnished";return"standard"}
function mapPropertyType(v){const s=v.trim();if(/别墅|独栋/.test(s))return"villa";if(/复式|loft/i.test(s))return"loft";if(/洋房/.test(s))return"cottage";if(/商铺|店面|门面/.test(s))return"shop";if(/写字楼|办公/.test(s))return"office";if(/商业/.test(s))return"commercial";if(/住宅|公寓|普通住宅|商品房/.test(s))return"apartment";return"apartment"}
function mapFurniture(v){const s=v.trim();if(/全齐|齐全|家电齐全|拎包入住/.test(s))return"full";if(/部分|基本/.test(s))return"partial";if(/空房|无/.test(s))return"none";return"partial"}

function mapPropertyRights(v){const s=v.trim();if(/???|???|????|??/.test(s))return"owned";if(/??|??|??/.test(s))return"mortgage";if(/??|??/.test(s))return"shared";if(/??|???/.test(s))return"public";if(/??|??/.test(s))return"commercial";if(/??|??/.test(s))return"military";return"other"}

const VISIBLE = ["listing_type","community","area","bedrooms","living_rooms","bathrooms","rent_price","sale_price","floor","total_floors","orientation","decoration","status","payment_method","viewing_method","source","manager"];
const PREVIEW_LABELS = { name:"名称",address:"地址",area:"面积",rent_price:"月租",sale_price:"售价(万)",listing_type:"交易类型",floor:"楼层",total_floors:"总楼层",orientation:"朝向",decoration:"装修",usage_type:"用途",status:"状态",payment_method:"付款方式",viewing_method:"看房方式",owner_name:"房东",owner_phone:"电话",property_no:"编号",community:"小区",bedrooms:"卧室",living_rooms:"客厅",bathrooms:"卫生间",kitchens:"厨房",balconies:"阳台",source:"来源",manager:"负责人",furniture:"家具",has_elevator:"电梯",heating:"供暖",parking:"车位",year_built:"建造年份",property_rights:"产权",building:"栋",unit_num:"单元",room_number:"门牌",city:"城市",district:"区域",follow_up:"跟进" } as const;

export default function PropertyImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload"|"preview"|"saving"|"done">("upload");
  const [rows, setRows] = useState<Record<string,unknown>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<Record<string,unknown>[]>([]);
  const [extraColCount, setExtraColCount] = useState(0);
  const [result, setResult] = useState<{inserted:number;errors:string[]}|null>(null);
  const [fieldMapPreview, setFieldMapPreview] = useState<Record<string,unknown>[]>([]);
  const [sheetInfo, setSheetInfo] = useState<{name:string;rows:number}[]>([]);

  function parseExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result; if (!buf) return;
      const wb = XLSX.read(buf, { type: "array" });
      const allSheets: any[] = [];
      for (const shName of wb.SheetNames) {
        const ws = wb.Sheets[shName];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (data.length === 0) continue;
        let listingType: string | null = null;
        const sl = shName.toLowerCase();
        if (/租赁|lease|rent/.test(sl)) listingType = "rent";
        else if (/买卖|出售|二手房|sale/.test(sl)) listingType = "sale";
        allSheets.push({ name: shName, listingType, rows: data });
        console.log("Sheet \"" + shName + "\": " + data.length + " rows, listingType: " + listingType);
      }
      if (allSheets.length === 0) { setRows([]); setPreviewColumns([]); setStep("preview"); return; }

      // KEY FIX: collect all headers from ALL sheets, not just first
      const allHeadersSet = new Set<string>();
      for (const sh of allSheets) Object.keys(sh.rows[0] ?? {}).forEach(h => allHeadersSet.add(h));
      const headers = Array.from(allHeadersSet);
      console.warn("ALL headers:", JSON.stringify(headers));

      const pairs: any[] = [];
      for (const h of headers) { const f = HEADER_LOOKUP.get(h.toLowerCase().trim()); if (f) { pairs.push({ col: h, field: f }); console.log("Mapped: \"" + h + "\" -> " + f); } else console.log("UNMAPPED: \"" + h + "\""); }
      const fieldMap = new Map<string,string>();
      for (const p of pairs) fieldMap.set(p.col, p.field);
      console.warn("fieldMap size:", fieldMap.size, "keys:", JSON.stringify(Array.from(fieldMap.keys())));

      const parsedRows: any[] = [];
      for (const sh of allSheets) {
        const sheetListingType = sh.listingType || "rent";
        for (const row of sh.rows) {
          const r: any = { name: "", type: null, address: "", area: null, listing_type: null, community: null, bedrooms: null, living_rooms: null, bathrooms: null, kitchens: null, balconies: null, rent_price: null, sale_price: null, _sale_price_source: null, floor: null, total_floors: null, orientation: null, decoration: null, usage_type: null, status: null, payment_method: null, viewing_method: null, owner_name: null, owner_phone: null, notes: null, source: null, manager: null, has_elevator: null, furniture: null, heating: null, parking: null, year_built: null, property_rights: null, building: null, unit_num: null, room_number: null, city: null, district: null, follow_up: null, _errors: [] };
          for (const [col, field] of fieldMap) {
            const val = row[col];
            if (val === null || val === undefined || val === "") continue;
            switch (field) {
              case "name": r.name = String(val).trim(); break;
              case "type": r.type = String(val).trim(); break;
              case "address": r.address = String(val).trim(); break;
              case "property_no": r.property_no = String(val).trim(); break;
              case "community": r.community = String(val).trim(); break;
              case "area": r.area = extractNumber(val); break;
              case "bedrooms": r.bedrooms = extractNumber(val); break;
              case "living_rooms": r.living_rooms = extractNumber(val); break;
              case "bathrooms": r.bathrooms = extractNumber(val); break;
              case "kitchens": r.kitchens = extractNumber(val); break;
              case "balconies": r.balconies = extractNumber(val); break;
              case "rent_price": r.rent_price = extractNumber(val); r.listing_type = r.listing_type || "rent"; break;
              case "sale_price": {
                console.log("SALE col=\"" + col + "\" val=" + JSON.stringify(val) + " type=" + typeof val);
                const num = extractNumber(val);
                if (num !== null && num > 0) {
                  const isWan = /万/.test(col) || (typeof val === "string" && /万/.test(val));
                  r.sale_price = isWan ? num * 10000 : num;
                  r._sale_price_source = col;
                  console.log("SALE FINAL=" + r.sale_price + " isWan=" + isWan);
                } else { console.warn("SALE SKIP: num=" + num + " col=" + col); }
                r.listing_type = r.listing_type || "sale";
                break;
              }
              case "floor": r.floor = extractNumber(val); break;
              case "total_floors": r.total_floors = extractNumber(val); break;
              case "orientation": r.orientation = String(val).trim(); break;
              case "decoration": r.decoration = mapDecoration(String(val)); break;
              case "usage_type": r.usage_type = String(val).trim(); break;
              case "status": r.status = mapStatus(String(val)); break;
              case "payment_method": r.payment_method = String(val).trim(); break;
              case "viewing_method": r.viewing_method = String(val).trim(); break;
              case "owner_name": r.owner_name = String(val).trim() || null; break;
              case "owner_phone": r.owner_phone = String(val).trim() || null; break;
              case "notes": r.notes = String(val).trim() || null; break;
              case "source": r.source = String(val).trim(); break;
              case "manager": r.manager = String(val).trim(); break;
              case "has_elevator": { const sv = String(val).trim().toLowerCase(); r.has_elevator = /是|有|yes|true/.test(sv); break; }
              case "furniture": r.furniture = mapFurniture(String(val)); break;
              case "heating": r.heating = String(val).trim(); break;
              case "parking": r.parking = String(val).trim(); break;
              case "year_built": r.year_built = extractNumber(val); break;
              case "property_rights": r.property_rights = mapPropertyRights(String(val)); break;
              case "building": r.building = String(val).trim(); break;
              case "unit_num": r.unit_num = String(val).trim(); break;
              case "room_number": r.room_number = String(val).trim(); break;
              case "city": r.city = String(val).trim(); break;
              case "district": r.district = String(val).trim(); break;
              case "follow_up": r.follow_up = String(val).trim(); break;
              case "listing_type": r.listing_type = /售|sale|卖/.test(String(val)) ? "sale" : "rent"; break;
            }
          }
          if (sheetListingType) r.listing_type = r.listing_type || sheetListingType;
          if (!r.name) r.name = r.community || r.address || "";
          if (!r.name) r._errors.push("missing_name");
          if (!r.address) r.address = r.name;
          parsedRows.push(r);
        }
      }
      const pc: any[] = [];
      for (const p of pairs) { if (VISIBLE.includes(p.field)) pc.push({ ...p, label: (PREVIEW_LABELS as any)[p.field] ?? p.field }); }
      setRows(parsedRows); setPreviewColumns(pc); setExtraColCount(pairs.filter((p:any)=>!VISIBLE.includes(p.field)).length);
      setFieldMapPreview(pairs); setSheetInfo(allSheets.map(s => ({ name: s.name, rows: s.rows.length })));
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleConfirm() {
    setStep("saving");
    const toInsert = rows.filter((r:any) => r._errors.length === 0);
    const errors: string[] = []; let inserted = 0;
    const supabase = createClient();
    for (const r of toInsert) {
      const payload: any = {
        name: r.name, address: r.address,
        listing_type: r.listing_type || "rent",
        status: r.status || "vacant",
        type: r.type ? mapPropertyType(r.type) : "apartment",
        rent: r.listing_type === "sale" ? 0 : (r.rent_price || 0),
      };
      if (r.area != null) payload.area = r.area;
      if (r.rent_price != null) payload.rent_price = r.rent_price;
      if (r.sale_price != null) payload.sale_price = r.sale_price;
      if (r.bedrooms != null) payload.bedrooms = r.bedrooms;
      if (r.living_rooms != null) payload.living_rooms = r.living_rooms;
      if (r.bathrooms != null) payload.bathrooms = r.bathrooms;
      if (r.kitchens != null) payload.kitchens = r.kitchens;
      if (r.balconies != null) payload.balconies = r.balconies;
      if (r.floor != null) payload.floor = r.floor;
      if (r.total_floors != null) payload.total_floors = r.total_floors;
      if (r.orientation) payload.orientation = r.orientation;
      if (r.decoration) payload.decoration = r.decoration;
      if (r.usage_type) payload.usage_type = r.usage_type;
      if (r.payment_method) payload.payment_method = r.payment_method;
      if (r.viewing_method) payload.viewing_method = r.viewing_method;
      if (r.owner_name) payload.owner_name = r.owner_name;
      if (r.owner_phone) payload.owner_phone = r.owner_phone;
      if (r.notes) payload.notes = r.notes;
      if (r.source) payload.source = r.source;
      if (r.manager) payload.manager = r.manager;
      if (r.furniture) payload.furniture = r.furniture;
      if (r.has_elevator != null) payload.has_elevator = r.has_elevator;
      if (r.heating) payload.heating = r.heating;
      if (r.parking) payload.parking = r.parking;
      if (r.year_built) payload.year_built = r.year_built;
      if (r.property_rights) payload.property_rights = r.property_rights;
      if (r.building) payload.building = r.building;
      if (r.unit_num) payload.unit_num = r.unit_num;
      if (r.room_number) payload.room_number = r.room_number;
      if (r.city) payload.city = r.city; else payload.city = "兰州";
      if (r.district) payload.district = r.district;
      if (r.follow_up) payload.follow_up = r.follow_up;
      if (r.property_no) payload.property_no = r.property_no;
      if (r.community) payload.community = r.community;

      console.log("IMPORT PAYLOAD:", JSON.stringify({ name: payload.name, listing_type: payload.listing_type, type: payload.type, rent_price: payload.rent_price, sale_price: payload.sale_price, city: payload.city }));

      const { error } = await supabase.from("properties").insert(payload);
      if (error) errors.push(r.name + ": " + error.message);
      else inserted++;
    }
    setResult({ inserted, errors }); setStep("done");
  }

  function reset() { setStep("upload"); setRows([]); setPreviewColumns([]); setExtraColCount(0); setResult(null); setFieldMapPreview([]); setSheetInfo([]); if (fileInputRef.current) fileInputRef.current.value = ""; }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link href="/properties" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link><div><h2 className="text-2xl font-semibold tracking-tight">批量导入房源</h2><p className="text-sm text-muted-foreground">从 Excel (.xlsx / .xls) 文件批量导入房源数据</p></div></div>
      {step === "upload" && (<Card><CardHeader><CardTitle>选择 Excel 文件</CardTitle><CardDescription>支持 .xlsx 和 .xls 格式。可识别租赁/买卖房源 Sheet。</CardDescription></CardHeader><CardContent><div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fileInputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseExcel(f); }}><Upload className="size-8 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">拖拽 Excel 文件到此处，或点击选择</p><input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseExcel(f); }} /></div></CardContent></Card>)}
      {step === "preview" && (<><Card><CardHeader><CardTitle>Sheet 识别</CardTitle><CardDescription>{sheetInfo.map((s:any) => s.name + "(" + s.rows + "行)").join("，")}</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle>字段匹配</CardTitle></CardHeader><CardContent>{fieldMapPreview.length > 0 ? (<div className="flex flex-wrap gap-2">{fieldMapPreview.map((p:any,i:number) => <Badge key={i} variant="outline" className="text-xs">{p.col} → {(PREVIEW_LABELS as any)[p.field] ?? p.field}</Badge>)}</div>) : <div className="text-yellow-600 flex gap-2"><AlertTriangle className="size-4"/>未识别任何列名</div>}</CardContent></Card><Card><CardHeader><CardTitle>数据预览 ({rows.length}行)</CardTitle><CardDescription>{rows.filter((r:any)=>r._errors.length>0).length>0 && <span className="text-destructive"><AlertTriangle className="size-3.5 inline mr-1"/>{rows.filter((r:any)=>r._errors.length>0).length}行有误</span>}</CardDescription></CardHeader><CardContent><div className="max-h-[50vh] overflow-auto"><Table><TableHeader><TableRow><TableHead>名称</TableHead>{previewColumns.map((p:any)=><TableHead key={p.col}>{p.label}</TableHead>)}{extraColCount>0 && <TableHead>+{extraColCount}列</TableHead>}<TableHead className="w-16"></TableHead></TableRow></TableHeader><TableBody>{rows.map((r:any,i:number)=>(<TableRow key={i} className={r._errors.length>0?"bg-destructive/5":""}><TableCell className="font-medium max-w-[100px] truncate">{r.name||<span className="text-destructive">—</span>}</TableCell>{previewColumns.map((p:any)=>(<TableCell key={p.col} className="text-muted-foreground max-w-[100px] truncate text-sm">{(()=>{const v=r[p.field];if(v===null||v===undefined)return"—";if(p.field==="rent_price")return"¥"+v;if(p.field==="sale_price"){const n=Number(v);return n>=10000?((n/10000).toFixed(n%10000===0?0:1)+"万"):("¥"+n);}if(p.field==="area")return v+"㎡";return String(v);})()}</TableCell>))}{extraColCount>0&&<TableCell className="text-xs text-muted-foreground">+{extraColCount}</TableCell>}<TableCell>{r._errors.length>0&&<Badge variant="destructive" className="text-[10px]">{r._errors.join(", ")}</Badge>}</TableCell></TableRow>))}</TableBody></Table></div></CardContent></Card><div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>取消</Button><Button onClick={handleConfirm}><Check className="size-4"/>确认导入 {rows.filter((r:any)=>r._errors.length===0).length} 套</Button></div></>)}
      {step === "saving" && (<Card><CardContent className="flex flex-col items-center gap-3 py-12"><Loader2 className="size-8 animate-spin text-muted-foreground"/><p className="text-sm text-muted-foreground">正在导入...</p></CardContent></Card>)}
      {step === "done" && result && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><Check className="size-5 text-emerald-500"/>导入完成</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-sm">已导入 <strong>{result.inserted}</strong> 套。</p>{result.errors.length>0&&<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive max-h-[200px] overflow-y-auto">{result.errors.map((e:any,i:number)=><p key={i}>{e}</p>)}</div>}<div className="flex gap-2 pt-4"><Button variant="outline" onClick={reset}>继续导入</Button><Button variant="default" asChild><Link href="/properties">查看列表</Link></Button></div></CardContent></Card>)}
    </div>
  );
}
