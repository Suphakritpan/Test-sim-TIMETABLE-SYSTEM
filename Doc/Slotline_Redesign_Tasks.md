# Slotline · ใบงานแก้ไขหน้าเว็บให้เป็นระดับ enterprise (สำหรับ AI โมเดลเล็ก)

ไฟล์นี้ใช้คู่กับ `Slotline_Design_System.md` (ต่อไปเรียกว่า DS) และ `AI_RULES.md` ข้อ NEVER ของทั้งสามไฟล์มีผลพร้อมกัน ถ้าขัดกัน ให้ยึด DS ก่อน แล้ว STOP ถามคน
คำว่า **MUST** = ต้องทำ · **NEVER** = ห้ามทำเด็ดขาด · **STOP** = หยุดแล้วถามคน

## 0. คำสั่งถึง AI (อ่านก่อนทุกครั้ง)

0.1 ทำทีละใบงาน (T1, T2, …) ตามลำดับในหัวข้อ 9 ห้ามข้าม ห้ามทำสองใบงานพร้อมกัน
0.2 ทุกใบงานต้องจบด้วยการรันคำสั่งตรวจ และแปะผลจริงในรายงาน ห้ามเขียนว่า "เสร็จแล้ว" ก่อนมีผลตรวจ
0.3 ห้ามแก้ token, ห้ามแก้ `tokens.css`, ห้ามคิดคลาสใหม่นอกหัวข้อ 3 ถ้าขาดอะไร ให้ STOP
0.4 ตัวเลขทุกตัวบนหน้าจอต้องมาจาก API ห้ามเขียนตัวเลขตายตัวในโค้ดหน้าเว็บ (N27)
0.5 ถ้าไม่มีเครื่องมือถ่ายภาพหน้าจอ ให้บอกตรง ๆ ว่าตรวจภาพไม่ได้ ห้ามอ้างว่าตรวจแล้ว

## 1. วินิจฉัย: สิ่งที่เห็นในภาพผลลัพธ์ 6 หน้า

ทุกหน้า (ยกเว้นหน้า 1) มีหน้าตาเดียวกัน คือ หัวเรื่อง + การ์ดหนึ่งใบ + กล่องเส้นประว่าง ๆ มีไอคอนและปุ่มหนึ่งปุ่ม ผู้ชมเปิดมาแล้วไม่เห็นว่าระบบทำอะไรได้เลย นี่คือสาเหตุที่ดูเหมือนงาน AI ทั่วไป

| รหัส | สิ่งที่เห็น | ผิดข้อไหน | แก้ด้วย |
|---|---|---|---|
| P-1 | ทุกหน้าเปิดมาเป็นหน้าว่าง ไม่มีข้อมูลให้ดู | หน้า 3–6 ของโจทย์ต้อง "ให้กรรมการเห็นผล" | G1, T1 |
| P-2 | กล่องเส้นประกว้างราว 65% ของการ์ด เหลือที่ว่างขวามือ | ผังหน้า 3.3 | G4, T3–T8 |
| P-3 | ไม่มีส่วนที่โชว์ว่าระบบทำงานอย่างไร (ไม่มี pipeline, stepper, log) | ข้อกำหนดเรื่อง "โชว์การทำงาน" | G3, T2, T5 |
| P-4 | ไม่มีเมทริกซ์ ไม่มีตารางเปรียบเทียบ ไม่มี heatmap | ข้อกำหนดเรื่อง "โชว์ตาราง matrix" | หัวข้อ 4 และ T3–T8 |
| P-5 | ไม่มี motion นอกจากสีเปลี่ยนตอน hover | ข้อกำหนดเรื่อง "โชว์ motion graphic" | หัวข้อ 3, 4, 7 |
| P-6 | ไม่มีตัวเลขสรุป (KPI) ไม่มีแถบบน ไม่มีบรรทัด audit (run id, seed, เวอร์ชัน) | ขาดความรู้สึกระบบองค์กร | G2, G7 |
| P-7 | การ์ดซ้อนการ์ด และหัวการ์ดซ้ำกับหัวหน้า ("จัดตารางเรียน" สองครั้ง) | N10 | G4 |
| P-8 | ไอคอนในกล่องว่างของหน้า 3–6 (เฟือง, ปฏิทิน, หุ่นยนต์, กราฟ) ยังเป็นอีโมจิสี | N29 | G6 |
| P-9 | หน้าคำขอพิเศษ: ปุ่มหลักสีเทาจางไม่มีเหตุผล และการ์ด "รายการคำขอทั้งหมด" ว่างเปล่าไม่มีข้อความ | 5.1, 5.8 | T4 |
| P-10 | สถานะ hover ของเมนูหน้าตาเหมือนสถานะที่เลือกอยู่ (ภาพหน้า 5 เห็นสองรายการไฮไลต์พร้อมกัน) | 8.2 | G8 |
| P-11 | คำอธิบายใต้หัวหน้ากับข้อความในกล่องว่างซ้ำกัน ("รัน Solver เพื่อสร้างตารางเรียนอัตโนมัติ") | 4.9 | T5 |

## 2. ข้อกำหนดกลาง (ต้องทำทุกหน้า)

**G1 ข้อมูลตัวอย่างพร้อมใช้ตั้งแต่เปิดเว็บ** ถ้ายังไม่มีชุดข้อมูลที่ยืนยันแล้ว ให้โหลดชุดตัวอย่าง 4 กลุ่มผ่าน API นำเข้าตัวเดียวกับที่ผู้ใช้ใช้ แล้วรัน Solver ด้วย seed ตายตัว (`1`) เพื่อให้ทุกหน้ามีของให้ดู ต้องแสดงชิป "ตัวอย่างข้อมูล" ที่แถบบนตลอดเวลา และมีปุ่ม "ล้างข้อมูลตัวอย่าง" NEVER แต่งตัวเลขเอง ตัวเลขมาจากผลที่ API ตอบเท่านั้น ถ้าโหลดช้า ให้แสดงโครงกระดูก (skeleton) ไม่ใช่หน้าว่าง

**G2 แถบบน (Topbar)** ติดหัวหน้าจอ สูง 56px ซ้าย: ทางนำ "ขั้นที่ N จาก 6 · ชื่อหน้า" ขวา: ชิปชุดข้อมูล, ชิปสถานะ run ล่าสุด (ใช้ StatusBadge), ชิป seed, ปุ่มสลับธีม (ไอคอนอย่างเดียว มี `aria-label`) โครงอยู่ในหัวข้อ 4.1

**G3 แถบขั้นตอน (PipelineStrip)** ใต้หัวเรื่องของทุกหน้า แสดงทั้ง 6 ขั้น ขั้นที่ทำเสร็จมีไอคอนถูก ขั้นปัจจุบันมีขอบหนาและพื้นเขียวอ่อน ขั้นที่ยังไม่ถึงเป็นสีจาง กดไปหน้านั้นได้ สถานะ "เสร็จ" ต้องมาจากข้อมูลจริง (นำเข้ายืนยันแล้ว, มี run ที่ verified ฯลฯ) โครงอยู่ในหัวข้อ 4.2

**G4 โครงหน้าเดียวกันทุกหน้า**

```
Topbar (sticky)
┌ PageHeader: h1 + คำอธิบาย 1 บรรทัด ─────────────── [ปุ่มหลัก 1 ปุ่ม] ┐
│ PipelineStrip (6 ขั้น)                                                │
│ KPI row (3–4 ช่อง)                                                    │
│ พื้นที่หลัก: grid 2fr/1fr หรือ 1fr/1fr (ตามใบงานของหน้านั้น)           │
│ ตารางหรือเมทริกซ์ของหน้า                                              │
│ บรรทัด audit                                                          │
└───────────────────────────────────────────────────────────────────────┘
```

- MUST ใช้ `sl-page` ห่อทั้งหน้า (ช่องไฟ `space-4`) NEVER ใส่การ์ดในการ์ด
- NEVER ใช้กล่องเส้นประเป็นเนื้อหาหลัก กล่องเส้นประใช้ได้เฉพาะ dropzone ของหน้า 1 และต้องกว้างเต็มคอลัมน์ของมัน
- เมื่อไม่มีข้อมูลจริงในส่วนหนึ่ง ใช้ `sl-empty sl-empty--compact` (แถวเดียว ไอคอน + ข้อความ + ปุ่ม) ไม่ใช่กล่องใหญ่
- ลบข้อความ "SLOTLINE" ตัวเล็กเหนือหัวเรื่อง (ซ้ำกับโลโก้) หัวการ์ดห้ามซ้ำกับหัวหน้า

**G5 ตารางและเมทริกซ์แบบ enterprise** แถวสูง 40px หัวตารางติดบน (`position: sticky`) ตัวเลขชิดขวาและใช้ `sl-num` คอลัมน์ที่เรียงได้มีไอคอน `arrow-up-down` และ `aria-sort` มีช่องค้นหา (กด `/` เพื่อโฟกัส) ทุกเมทริกซ์ต้องมีหัวแถว หัวคอลัมน์ หน่วย และคำอธิบายระดับ

**G6 ไอคอน** ไอคอนทุกที่รวมกล่องว่างต้องเป็น SVG จาก `lucide-react` ตามตาราง 4.10 ใน DS ใช้ครบทั้งเมนู ปุ่ม ป้าย และกล่องว่าง (หน้า 3–6 ยังเป็นอีโมจิ ต้องเปลี่ยน)

**G7 บรรทัด audit** ท้ายทุกหน้า (`sl-audit`) แสดง: run id · seed · เวอร์ชัน solver · เวลา · สถานะ (เช่น `verified`) ฟอนต์ mono ค่ามาจาก API ถ้ายังไม่มี run ให้แสดง "ยังไม่มี run"

**G8 เมนูข้าง** รายการที่เลือกอยู่: `aria-current="page"` + พื้น `side-hi` เต็ม + น้ำหนัก 600 รายการ hover: พื้นอ่อนกว่า (`color-mix(in srgb, var(--side-hi) 45%, transparent)`) น้ำหนักปกติ ทั้งสองต้องมองต่างกันออกในพริบตา กล่องไอคอนกว้าง 24px เท่ากันทุกรายการ ปุ่มออกจากระบบใช้ `--side-ink-2` ขึ้นไป (ในภาพล่าสุดอ่านได้แล้ว ห้ามถอยกลับ)

## 3. CSS เพิ่ม (วางต่อท้าย `components.css` ห้ามแก้ส่วนอื่น)

```css
/* ===== Slotline redesign add-on ===== */
.sl-page{display:flex;flex-direction:column;gap:var(--space-4)}
.sl-grid-2{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:var(--space-4)}
.sl-grid-eq{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--space-4)}
@media (max-width:1023px){.sl-grid-2,.sl-grid-eq{grid-template-columns:minmax(0,1fr)}}

/* แถบบน */
.sl-topbar{position:sticky;top:0;z-index:var(--z-sticky);display:flex;align-items:center;gap:var(--space-3);min-height:56px;padding:0 var(--space-4);background:var(--glass-strong);border-bottom:var(--border-std) solid var(--line);backdrop-filter:blur(12px)}
.sl-topbar__crumb{display:flex;align-items:center;gap:var(--space-2);font-size:13.5px;color:var(--ink-2)}
.sl-topbar__crumb b{color:var(--ink);font-weight:600}
.sl-topbar__end{margin-left:auto;display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap}
.sl-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 var(--space-2);border-radius:var(--radius-pill);border:var(--border-std) solid var(--line);background:var(--glass);font-size:12.5px;color:var(--ink-2);white-space:nowrap}
.sl-chip .sl-mono{color:var(--ink)}

/* แถบขั้นตอน: ตั้งจำนวนขั้นด้วย style="--n:6" */
.sl-steps{display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:var(--space-2);margin:0;padding:0;list-style:none}
.sl-step{display:flex;align-items:center;gap:var(--space-2);min-width:0;padding:var(--space-2) var(--space-3);border-radius:var(--radius-lg);border:var(--border-std) solid var(--line);background:var(--glass);color:var(--ink-2);font-size:13px;line-height:20px;transition:background var(--dur-fast) var(--ease-out),border-color var(--dur-fast) var(--ease-out)}
.sl-step__ic{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius-pill);background:var(--accent-soft);color:var(--accent)}
.sl-step__t{min-width:0;display:flex;flex-direction:column}
.sl-step__t small{font-size:12px;color:var(--ink-3)}
.sl-step.is-done{border-color:var(--accent)}
.sl-step.is-current{border:var(--border-bold) solid var(--accent);background:var(--accent-soft);color:var(--ink);font-weight:600}
.sl-step.is-todo .sl-step__ic{background:transparent;border:var(--border-std) solid var(--line-strong);color:var(--ink-3)}
.sl-step.is-running .sl-step__ic{animation:sl-pulse 1.6s var(--ease-in-out) infinite}
@keyframes sl-pulse{50%{transform:scale(1.12)}}
@media (max-width:767px){.sl-steps{display:flex;overflow-x:auto;padding-bottom:var(--space-1)}.sl-step{flex:0 0 auto}}

/* ช่องตัวเลขสรุป */
.sl-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-3)}
.sl-kpi{display:flex;flex-direction:column;gap:var(--space-1);padding:var(--space-3);border-radius:var(--radius-xl);background:var(--glass-strong);border:var(--border-std) solid var(--line);min-width:0}
.sl-kpi__l{display:flex;align-items:center;gap:6px;font-size:12px;line-height:18px;letter-spacing:.02em;color:var(--ink-3)}
.sl-kpi__v{font-size:28px;line-height:36px;font-weight:600;font-variant-numeric:tabular-nums}
.sl-kpi__h{font-size:12.5px;line-height:18px;color:var(--ink-2)}
.sl-kpi--ok .sl-kpi__v{color:var(--accent)}
.sl-kpi--warn .sl-kpi__v{color:var(--amber-text)}
.sl-kpi--bad .sl-kpi__v{color:var(--danger)}

/* กล่องว่างแบบกะทัดรัด และ dropzone */
.sl-empty--compact{flex-direction:row;text-align:left;align-items:center;gap:var(--space-3);padding:var(--space-3)}
.sl-drop{display:flex;align-items:center;gap:var(--space-3);min-height:160px;padding:var(--space-4);border:var(--border-std) dashed var(--line-strong);border-radius:var(--radius-xl);background:var(--glass)}
.sl-drop.is-over{border-color:var(--accent);background:var(--accent-soft)}

/* รายการตรวจ (ใช้กับ 7 แผ่นงาน) */
.sl-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--space-1)}
.sl-checks li{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);border-radius:var(--radius-lg);background:var(--glass);border:var(--border-std) solid var(--line)}
.sl-checks .grow{flex:1;min-width:0}

/* heatmap เมทริกซ์ตัวเลข: ตั้ง --cols (จำนวนคอลัมน์) และ --v (0 ถึง 100) ต่อช่อง */
.sl-heat{display:grid;grid-template-columns:minmax(96px,auto) repeat(var(--cols,5),minmax(64px,1fr));gap:2px;font-size:13px}
.sl-heat>*{display:flex;align-items:center;justify-content:center;gap:4px;min-height:36px;padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm)}
.sl-heat__h{color:var(--ink-3);font-size:12px;font-weight:500}
.sl-heat__r{justify-content:flex-start;font-weight:500}
.sl-heat__c{background:color-mix(in srgb,var(--accent) calc(var(--v) * .4%),transparent);font-variant-numeric:tabular-nums}
.sl-heat__c.is-hot{outline:var(--border-bold) solid var(--amber)}

/* บันทึกการทำงานสด */
.sl-log{margin:0;padding:var(--space-2) var(--space-3);list-style:none;max-height:240px;overflow:auto;font-family:var(--font-mono);font-size:12.5px;line-height:20px;background:var(--glass-strong);border:var(--border-std) solid var(--line);border-radius:var(--radius-lg)}
.sl-log__i{display:flex;gap:var(--space-2);align-items:center;animation:sl-log-in var(--dur-fast) var(--ease-out) both}
.sl-log__i time{color:var(--ink-3)}
@keyframes sl-log-in{from{opacity:0;transform:translateY(6px)}}

/* แท่งเปรียบเทียบ (ใช้ transform เท่านั้น) */
.sl-bars{display:flex;flex-direction:column;gap:var(--space-2)}
.sl-bar{display:grid;grid-template-columns:minmax(72px,120px) 1fr 64px;align-items:center;gap:var(--space-2);font-size:13px}
.sl-bar__t{height:10px;border-radius:var(--radius-pill);background:var(--line);overflow:hidden}
.sl-bar__t i{display:block;height:100%;width:var(--w);border-radius:inherit;background:var(--accent);transform-origin:left;animation:sl-grow var(--dur-slow) var(--ease-out) both}
.sl-bar--base .sl-bar__t i{background:var(--ink-3)}
@keyframes sl-grow{from{transform:scaleX(0)}}

/* บรรทัด audit */
.sl-audit{display:flex;flex-wrap:wrap;gap:var(--space-3);padding-top:var(--space-3);border-top:var(--border-std) solid var(--line);font-size:12px;color:var(--ink-3)}
.sl-audit .sl-mono{color:var(--ink-2)}
```

Preset ใหม่ 4 ตัวที่เพิ่มลงตารางหัวข้อ 7.1 ของ DS ด้วยไฟล์นี้: `sl-log__i` (บรรทัดใหม่เลื่อนขึ้น 6px · `dur-fast`), `sl-bar` (แท่งโตจากซ้าย · `dur-slow`), `sl-step.is-running` (ไอคอนขยาย 1.12 วนระหว่าง solving เท่านั้น), และตัวเลขนับขึ้น (หัวข้อ 7.3) ห้ามใช้ preset อื่นนอกตาราง 7.1 กับตารางนี้

## 4. โครง HTML ของคอมโพเนนต์ใหม่

### 4.1 Topbar

```html
<header class="sl-topbar">
  <nav class="sl-topbar__crumb" aria-label="ตำแหน่งปัจจุบัน"><span>ขั้นที่ 3 จาก 6</span><svg aria-hidden="true" …chevron-right/><b>จัดตาราง</b></nav>
  <div class="sl-topbar__end">
    <span class="sl-chip"><svg aria-hidden="true" …flask-conical/>ตัวอย่างข้อมูล · 4 กลุ่ม</span>
    <span class="sl-badge sl-badge--ok"><svg aria-hidden="true" …shield-check/>verified</span>
    <span class="sl-chip"><svg aria-hidden="true" …hash/>seed <span class="sl-mono">1</span></span>
    <button class="sl-btn sl-btn--ghost sl-btn--sm" aria-label="สลับธีม"><svg …sun-moon/></button>
  </div>
</header>
```

### 4.2 PipelineStrip

```html
<ol class="sl-steps" style="--n:6" aria-label="ขั้นตอนการทำงาน">
  <li><a class="sl-step is-done"    href="/import"><span class="sl-step__ic"><svg …check/></span><span class="sl-step__t">นำเข้า<small>เสร็จ · 7 แผ่นงาน</small></span></a></li>
  <li><a class="sl-step is-done"    href="/requests">…คำขอพิเศษ<small>เสร็จ</small></a></li>
  <li><a class="sl-step is-current" href="/solve" aria-current="step"><span class="sl-step__ic"><svg …calendar-cog/></span><span class="sl-step__t">จัดตาราง<small>กำลังดำเนินการ</small></span></a></li>
  <li><a class="sl-step is-todo"    href="/timetable">…ดูตาราง<small>รอ</small></a></li>
  <li><a class="sl-step is-todo"    href="/ai">…ผลการใช้ AI<small>รอ</small></a></li>
  <li><a class="sl-step is-todo"    href="/export">…สรุปและส่งออก<small>รอ</small></a></li>
</ol>
```

ข้อความย่อยในแต่ละขั้น (small) ต้องมีคำเสมอ ห้ามบอกสถานะด้วยสีอย่างเดียว

### 4.3 KPI

```html
<div class="sl-kpis">
  <div class="sl-kpi sl-kpi--ok"><span class="sl-kpi__l"><svg aria-hidden="true" …check-circle-2/>จัดครบ</span><span class="sl-kpi__v" data-count="612">0</span><span class="sl-kpi__h">จาก 612 รายการสอน</span></div>
</div>
```

### 4.4 Heatmap

```html
<div class="sl-tablewrap">
  <div class="sl-heat" style="--cols:5" role="table" aria-label="การใช้ห้องต่อวัน (เปอร์เซ็นต์)">
    <span class="sl-heat__h" role="columnheader">ห้อง</span><span class="sl-heat__h" role="columnheader">จ.</span> … <span class="sl-heat__h" role="columnheader">ศ.</span>
    <span class="sl-heat__r" role="rowheader">COM-02</span>
    <span class="sl-heat__c" style="--v:72" role="cell">72%</span>
    <span class="sl-heat__c is-hot" style="--v:96" role="cell"><svg aria-hidden="true" …alert-triangle/>96%</span>
  </div>
</div>
```

ช่องที่ `--v` ≥ 90 ใส่ `is-hot` และต้องมีไอคอน `alert-triangle` กับตัวเลขกำกับ ค่า `--v` ต้องคำนวณจากข้อมูลที่ API ส่งมา ต้องตรวจ contrast ทั้งธีมสว่างและมืด

### 4.5 Log และแท่งเปรียบเทียบ

```html
<ul class="sl-log" aria-live="polite" aria-label="บันทึกการทำงาน">
  <li class="sl-log__i"><time>10:21:04</time><span class="sl-badge sl-badge--info">solving</span>iteration 1200 · penalty 34</li>
</ul>

<div class="sl-bars">
  <div class="sl-bar sl-bar--base"><span>พื้นฐาน</span><span class="sl-bar__t"><i style="--w:82%"></i></span><span class="sl-num">412</span></div>
  <div class="sl-bar"><span>วิธีของทีม</span><span class="sl-bar__t"><i style="--w:34%"></i></span><span class="sl-num">171</span></div>
</div>
```

แท่งทั้งสองใช้สเกลเดียวกัน (ค่ามากสุด = 100%) ต้องมีป้ายชื่อและตัวเลขกำกับ ห้ามต่างกันแค่สี

### 4.6 ตัวเลขนับขึ้น (โค้ดสำเร็จรูป)

```ts
// apps/web/src/lib/useCountUp.ts
import { useEffect, useState } from 'react';
export function useCountUp(target: number, ms = 420) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
```

## 5. ใบงานรายหน้า

ทุกหน้าใช้โครง G4 (Topbar → PageHeader → PipelineStrip → KPI → พื้นที่หลัก → ตาราง → audit) ข้างล่างบอกเฉพาะสิ่งที่ต่างกัน

### T3 หน้า 1 นำเข้าข้อมูล

KPI: แผ่นงานที่พบ (x/7) · แถวข้อมูลทั้งหมด · ข้อผิดพลาด · คำเตือน

```
┌─ sl-grid-2 ──────────────────────────────────────┬───────────────────────┐
│ sl-drop (เต็มคอลัมน์ ไม่เกิน 160px สูง)            │ sl-checks: 7 แผ่นงาน    │
│ ─ เริ่มจากไฟล์ตัวอย่าง ──────────────────────      │  ครู ········ พบ · 18 แถว│
│ [download แม่แบบ] [4 กลุ่ม] [8 กลุ่ม] [12 กลุ่ม]   │  ไม่สะดวก ···· พบ        │
│                                                  │  … (ไอคอน + คำ + จำนวนแถว)│
└──────────────────────────────────────────────────┴───────────────────────┘
DataTable "ผลตรวจ": แผ่นงาน | แถว | สิ่งที่ผิด | วิธีแก้ | ระดับ(StatusBadge)
เมทริกซ์ "แผ่นงาน × การตรวจ": แถว 7 แผ่นงาน × คอลัมน์ (ครบคอลัมน์ · ชนิดข้อมูล · รหัสซ้ำ · อ้างอิงถูกต้อง) ช่องเป็นไอคอน + คำ
ปุ่ม "ยืนยันใช้ข้อมูลนี้" (ปิดไว้พร้อม sl-hint บอกเหตุผล จนกว่าข้อผิดพลาด = 0)
```

- MUST แยกปุ่มสองกลุ่ม: ปุ่มอัปโหลดอยู่ใน dropzone เท่านั้น (ลบปุ่ม "อัปโหลดไฟล์" แถวล่าง) ส่วนไฟล์ตัวอย่างอยู่ใต้หัวเล็ก "เริ่มจากไฟล์ตัวอย่าง" มีไอคอน `download`
- Motion: ระหว่างอ่านไฟล์ใช้ `sl-meter` ค่าจาก SSE จากนั้นรายการ 7 แผ่นงานเข้าด้วย `sl-stagger` KPI นับขึ้นด้วย `useCountUp` แถวผลตรวจเข้าด้วย `sl-enter`
- ตรวจ: ไม่มีปุ่มซ้ำ, dropzone กว้างเท่าคอลัมน์, ผลตรวจมีที่ไหน/ผิดอะไร/แก้อย่างไรครบ 3 อย่าง

### T4 หน้า 2 คำขอพิเศษ

KPI: คำขอทั้งหมด · ยืนยันแล้ว · รอยืนยัน · อ่านไม่ออก

```
┌─ sl-grid-eq ─────────────────────────────────────────────────────────┐
│ การ์ด "เพิ่มคำขอ"                      │ การ์ด "ระบบเข้าใจว่า" (SplitCompare)   │
│  textarea สูง 3 บรรทัด                  │  ต้นฉบับ | เงื่อนไขที่ระบบอ่านได้          │
│  ชิปตัวอย่างคำขอ (กดเพื่อเติมลงช่อง)      │  ป้ายระดับ: ทำแน่ ๆ / ทำถ้าทำได้           │
│  [อ่านคำขอด้วยระบบ] [กรอกฟอร์มเอง]      │  [แก้] [ยืนยัน]                        │
└────────────────────────────────────────┴────────────────────────────────┘
mini-flow 5 ขั้น (sl-steps --n:5): ข้อความ → ตัวอ่านตามกฎ → (AI ถ้าเปิด) → เงื่อนไข → ยืนยัน
DataTable "รายการคำขอ": ต้นฉบับ | ระบบเข้าใจว่า | ประเภท | สถานะ | การกระทำ
เมทริกซ์ "ประเภทคำขอ × สถานะ": แถว (ครู · ห้อง · วัน · ล็อกช่อง) × คอลัมน์ (ยืนยัน · รอ · ปฏิเสธ) เป็นตัวเลข
```

- MUST ปุ่ม "อ่านคำขอด้วยระบบ" เป็นสีหลักเต็ม เมื่อช่องข้อความว่างให้ปิดปุ่ม และใส่ `sl-hint` ว่า "พิมพ์คำขอก่อน" (แก้ P-9)
- MUST ตารางรายการคำขอมีกล่องว่างแบบกะทัดรัดเมื่อไม่มีรายการ ("ยังไม่มีคำขอ" + ชิปตัวอย่าง) ห้ามปล่อยการ์ดว่าง
- NEVER แสดงเปอร์เซ็นต์ความมั่นใจของการอ่านคำขอ ใช้คำ "อ่านได้" / "ต้องยืนยัน" / "อ่านไม่ออก" ตามที่ API ตอบ (N27)
- Motion: ตอนกดอ่านคำขอ ขั้นใน mini-flow ไฮไลต์ไล่ทีละขั้นตามเหตุการณ์จริงจาก API แล้วแถวใหม่เข้าตารางด้วย `sl-enter`

### T5 หน้า 3 จัดตาราง (หน้านี้มีคะแนนสูงสุด 25 ต้องโชว์การทำงานมากที่สุด)

KPI: จัดแล้ว (x/ทั้งหมด) · ผิดกฎ hard · คะแนนโทษ soft · เวลารัน

```
┌─ sl-grid-2 ──────────────────────────────────────┬───────────────────────┐
│ การ์ด "รัน Solver"                                │ การ์ด "ค่าสด" (mono)    │
│  [seed ช่องกรอก] [play จัดตาราง] [square ยกเลิก]   │  iteration  1,200       │
│  sl-steps --n:5: queued→planning→solving→         │  penalty    34          │
│                  verifying→verified               │  hard       0           │
│  sl-ring (ความคืบหน้า) + sl-meter                  │  sl-log (บรรทัดสด)       │
└──────────────────────────────────────────────────┴───────────────────────┘
FlowDiagram: ไฟล์โจทย์ → นำเข้า → Solver → Verifier → ตารางที่ verified (โหนดปัจจุบันขอบเหลือง)
DataTable "ประวัติ run": run id | seed | สถานะ(StatusBadge) | penalty | เวลา | [ดู] [เทียบ]
เมทริกซ์ "seed × ผล": แถว run ที่ seed เดียวกัน × คอลัมน์ (hash ผลลัพธ์ · penalty · ตรงกัน?) เพื่อพิสูจน์ว่าซ้ำได้
```

- MUST ใช้การ์ดใบเดียวต่อกลุ่ม ลบการ์ดหัว "จัดตารางเรียน" ที่ซ้ำกับหัวหน้า
- MUST ปุ่ม "ยกเลิก" ใช้ได้ระหว่างรัน และต้องหยุดภายในเวลาที่ AI_RULES.md กำหนด (ตรวจใน `/api/runs/:id/cancel`) ห้ามให้หน้าค้าง
- MUST ถ้ายังไม่มี run ให้แสดง run ตัวอย่างจาก G1 พร้อมป้าย "ตัวอย่างข้อมูล" ไม่ใช่กล่องว่าง
- MUST ค่า progress, iteration, penalty มาจาก SSE เท่านั้น (ห้ามวิ่งหลอก) ถ้ายังไม่ทราบให้ใช้ `sl-spin` + ข้อความ
- Motion: ขั้นที่กำลังรันใส่ `is-running` (หมุนเฉพาะช่วง solving) บรรทัด log ใหม่เข้าด้วย `sl-log__i` วงแหวนและแท่งเลื่อนตามค่าจริงด้วย `dur-slow` โหนดใน FlowDiagram ไฮไลต์ตามสถานะจริง เมื่อ verified ให้ป้าย `verified` เข้าด้วย `sl-toast--in` หนึ่งครั้ง
- ตรวจ: กดจัดตาราง → เห็น stepper เดิน → เห็น log → ได้ป้าย verified ยกเลิกกลางทางแล้วได้สถานะ `cancelled`

### T6 หน้า 4 ดูตาราง

ทำตาม DS หัวข้อ 3.2 และ 6 ทุกข้อ (MetaStrip, legend ระดับช่อง, TimetableGrid วันเป็นคอลัมน์ คาบเป็นแถว, ช่องค้นหา, จำนวนคาบรวมต่อสัปดาห์, ลากย้ายแล้วตรวจกับ API) เพิ่มเฉพาะ:

- KPI: คาบรวมต่อสัปดาห์ของกลุ่มที่เลือก · ช่องควรดู · ช่องต้องแก้ · ช่องที่ย้ายเอง
- ตัวเลือกมุมมอง: กลุ่ม / ครู / ห้อง (ปุ่มแบบแท็บ `role="tablist"`) และปุ่มสลับทิศตาราง
- ตัวเลือกวิชาที่ซ้อนกัน แสดงทั้งสองวิชาในช่องเดียว
- Motion: ตารางเข้าด้วย `sl-enter` ช่องเข้าด้วย `sl-stagger` (ไม่เกิน 8 ช่องแรก) สลับมุมมองใช้ fade 160ms ลากย้ายตามหัวข้อ 6.3
- เมื่อไม่มี run ที่ verified ให้ใช้กล่องว่างแบบกะทัดรัดพร้อมปุ่ม "ไปหน้าจัดตาราง" ไม่ใช่กล่องเส้นประกว้างครึ่งหน้า

### T7 หน้า 5 ผลการใช้ AI

KPI: ปรับปรุงเทียบพื้นฐาน (%) · คะแนนโทษพื้นฐาน · คะแนนโทษของทีม · ผิดกฎ hard (พื้นฐาน/ทีม)

```
┌─ sl-grid-eq ─────────────────────────────────────────────────────────┐
│ การ์ด "เทียบวิธีพื้นฐานกับวิธีของทีม"       │ การ์ด "AI ถูกใช้ตรงไหน"                  │
│  sl-bars (พื้นฐาน เทียบ ทีม ต่อตัวชี้วัด)    │  DataTable: จุดที่ใช้ | จำนวนครั้ง | หน่วงเวลา | ถอยกลับกฎ │
└────────────────────────────────────────┴────────────────────────────────┘
เมทริกซ์เปรียบเทียบ: แถวตัวชี้วัด (hard · soft · ครูสอนติดกัน · คาบว่างของกลุ่ม · เวลา · iteration)
                    × คอลัมน์ (พื้นฐาน · ทีม · ผลต่าง + ป้ายดีขึ้น/แย่ลง/เท่าเดิม)
เงื่อนไข: ข้อมูลเดียวกัน seed เดียวกัน (แสดงชิปยืนยันไว้บนการ์ด)
```

- NEVER แสดงตัวเลขเปรียบเทียบถ้าสองฝั่งไม่ได้ข้อมูลและ seed เดียวกัน ให้แสดงข้อความ "ข้อมูลหรือ seed ไม่ตรงกัน เทียบไม่ได้" แทน
- NEVER ใส่คะแนนหรือ % ที่ไม่ได้มาจาก `/api/compare`
- Motion: แท่งโตจากซ้ายด้วย `sl-bar` ตัวเลข KPI นับขึ้น

### T8 หน้า 6 สรุปและส่งออก

KPI: อัตราใช้ห้อง (%) · ภาระครูสูงสุด (คาบ/สัปดาห์) · คาบว่างเฉลี่ยของกลุ่ม · คำขอพิเศษที่ทำได้ (x/y)

```
┌─ sl-grid-eq ─────────────────────────────────────────────────────────┐
│ heatmap "ห้อง × วัน" (% การใช้)           │ heatmap "ครู × วัน" (คาบที่สอน)           │
└────────────────────────────────────────┴────────────────────────────────┘
DataTable "คาบว่างของกลุ่ม": กลุ่ม | คาบว่าง/สัปดาห์ | ช่วงว่างยาวสุด
DataTable "ผลคำขอพิเศษ": คำขอ | ประเภท | ผล (ทำได้ / ทำไม่ได้ + เหตุผล)
การ์ด "ส่งออก": sl-checks ตรวจก่อนส่ง (ครบทุกรายการสอน · hard = 0 · verified)
                ตัวอย่าง 5 แถวแรกของแผ่น "ตารางสอน" 6 คอลัมน์ตามโจทย์
                [download ดาวน์โหลด Excel] (ปิดไว้พร้อม sl-hint จนกว่า verified)
```

- MUST ตัวอย่างแถวก่อนส่งออกใช้หัวคอลัมน์ตรงตามโจทย์ทุกตัวอักษร: รหัสรายการสอน · ประเภท · วัน · คาบเริ่ม · จำนวนคาบ · รหัสห้อง
- MUST ปุ่มดาวน์โหลดใช้ได้เฉพาะ run ที่ verified และให้ผลตามมาตรฐานของ AI_RULES.md
- Motion: heatmap ช่องเข้าด้วย `sl-enter` (ทั้งตารางครั้งเดียว ไม่ stagger รายช่อง) KPI นับขึ้น ช่องเช็กก่อนส่งออกเข้า `sl-stagger`

## 6. ข้อห้ามเพิ่มสำหรับใบงานนี้

R1 NEVER ปล่อยหน้าใดโชว์แค่กล่องว่างและปุ่มเดียวเมื่อ G1 มีข้อมูลให้แสดง
R2 NEVER เขียนตัวเลข ชื่อครู ชื่อห้อง รหัสวิชา ตายตัวในโค้ดหน้าเว็บ ทุกอย่างมาจาก API
R3 NEVER ใส่ motion ที่วนไม่จบในหน้าที่มีตาราง ยกเว้น `is-running` ระหว่างรัน (หายเมื่อเสร็จ)
R4 NEVER ทำเมทริกซ์ที่แยกระดับด้วยสีอย่างเดียว ต้องมีตัวเลขหรือคำ และไอคอนสำหรับระดับเตือน
R5 NEVER ทำ heatmap ที่ไม่มีหัวแถว หัวคอลัมน์ หน่วย และ `aria-label`
R6 NEVER ซ่อนชิป "ตัวอย่างข้อมูล" ขณะแสดงข้อมูลตัวอย่าง
R7 NEVER ลบกติกาเดิมของ DS (N1–N31) เพื่อให้ใบงานนี้ผ่าน

## 7. สรุปที่ต้องเห็นของ "โชว์การทำงาน · motion · เมทริกซ์"

| สิ่งที่ผู้ชมต้องเห็น | อยู่ที่ไหน |
|---|---|
| โชว์การทำงาน | PipelineStrip ทุกหน้า · stepper + log + FlowDiagram ในหน้า 3 · mini-flow ในหน้า 2 · แถวตรวจ 7 แผ่นงานในหน้า 1 |
| Motion graphic | นับตัวเลขขึ้น · วงแหวน/แถบความคืบหน้า · stagger ของรายการ · แท่งโตจากซ้าย · log เลื่อนเข้า · ไอคอนขั้นกำลังรันขยาย · ลากย้ายช่องตาราง |
| ตารางเมทริกซ์ | แผ่นงาน × การตรวจ (หน้า 1) · ประเภทคำขอ × สถานะ (หน้า 2) · seed × ผล (หน้า 3) · ระดับช่อง (หน้า 4) · ตัวชี้วัด × วิธี (หน้า 5) · ห้อง × วัน และครู × วัน (หน้า 6) |
| ความรู้สึก enterprise | Topbar ติดบน · KPI ทุกหน้า · ตารางหัวติด แถวสูง 40px · ตัวเลข mono/tabular · บรรทัด audit · ป้ายสถานะมีคำและไอคอน |

## 8. ตรวจก่อนส่งงาน (แปะผลจริงทุกคำสั่ง)

```bash
# 1 ไม่มีอีโมจิ
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}]" apps/web/src
# 2 ไม่มี hex ในโค้ดหน้าเว็บ (ยกเว้น tokens.css)
grep -rnE "#[0-9a-fA-F]{3,8}\b" apps/web/src --include=*.tsx --include=*.css --exclude=tokens.css
# 3 ไม่มีเวลา/easing ตายตัว
grep -rnE "(transition|animation)[^;]*[0-9]+ms|cubic-bezier" apps/web/src --include=*.css --include=*.tsx --exclude=tokens.css
# 4 ไม่มีการ animate คุณสมบัติต้องห้าม
grep -rnE "transition:[^;]*(top|left|height|margin)" apps/web/src
# 5 ไม่มีตัวเลขตายตัวของข้อมูล เช่น รหัสครู/ห้อง
grep -rnE "TIT[0-9]+|COM-[0-9]+|693190[0-9]+" apps/web/src --include=*.tsx
# 6 build ผ่าน
npm run typecheck && npm run build
```

ผลลัพธ์ของคำสั่ง 1–5 ต้องว่างทั้งหมด (ยกเว้นบรรทัดที่เป็นข้อความตัวอย่างใน placeholder ซึ่งต้องบอกเหตุผลในรายงาน) และคำสั่ง 6 ต้องผ่าน

เช็กลิสต์ด้วยตา (ถ้าถ่ายภาพไม่ได้ ให้เขียนว่า "ตรวจภาพไม่ได้"):
- ทั้ง 6 หน้ามี Topbar, PipelineStrip, KPI, อย่างน้อยหนึ่งตารางหรือเมทริกซ์ และบรรทัด audit
- ไม่มีกล่องเส้นประกว้างไม่เต็มคอลัมน์ ไม่มีการ์ดซ้อนการ์ด ไม่มีหัวการ์ดซ้ำหัวหน้า
- ที่ 1440px และ 390px ทั้งธีมสว่างและมืด หน้าไม่เลื่อนแนวนอน ตารางเลื่อนในกรอบ
- เมนู hover กับเมนูที่เลือกอยู่ดูต่างกันชัดเจน
- ตั้ง `prefers-reduced-motion: reduce` แล้วไม่มีอะไรเคลื่อนไหวและยังอ่านครบ

## 9. ลำดับทำงาน

| ลำดับ | ใบงาน | ทำอะไร | ไฟล์ที่แตะไม่เกิน |
|---|---|---|---|
| T1 | G1 + G2 + G8 | โหลดข้อมูลตัวอย่าง, Topbar, แก้เมนู | 3 |
| T2 | หัวข้อ 3 และ 4 | วาง CSS เพิ่ม, สร้าง Topbar, PipelineStrip, KPI, Heatmap, Log, Bars, useCountUp | 3 |
| T3 | หน้า 1 | ตามหัวข้อ 5 T3 | 3 |
| T4 | หน้า 2 | ตามหัวข้อ 5 T4 | 3 |
| T5 | หน้า 3 | ตามหัวข้อ 5 T5 | 3 |
| T6 | หน้า 4 | ตามหัวข้อ 5 T6 และ DS หัวข้อ 6 | 3 |
| T7 | หน้า 5 | ตามหัวข้อ 5 T7 | 3 |
| T8 | หน้า 6 | ตามหัวข้อ 5 T8 | 3 |
| T9 | ตรวจรวม | รันหัวข้อ 8 ทั้งหมด แล้วรายงาน | 0 |

ใบงาน T1 และ T2 ต้องเสร็จก่อนเสมอ เพราะทุกหน้าใช้ร่วมกัน

## 10. รูปแบบรายงาน (ห้ามเปลี่ยนหัวข้อ)

```
ใบงาน: T? ชื่อ
ไฟล์ที่แก้: (รายชื่อ ไม่เกิน 3)
สิ่งที่ทำ: (1–3 บรรทัด)
ผลคำสั่งตรวจ: (แปะผลจริงของคำสั่งในหัวข้อ 8)
ข้อที่ยังไม่แน่ใจ / ที่ STOP: (ถ้าไม่มี ให้เขียน "ไม่มี")
```