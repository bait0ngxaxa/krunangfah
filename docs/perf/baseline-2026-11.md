# UI performance baseline — 2026-11

Baseline ของงาน UI performance part 1 (item 0–3) วัดที่ commit `6452bf0` บน Windows 11, Node 24.22.1, Next.js 16.4.5 (Turbopack), Chrome stable (headless)
แต่ละ PR ต่อท้ายผลวัดของตัวเองในส่วน [ผลหลังแต่ละ PR](#ผลหลังแต่ละ-pr)

## ข้อจำกัดของการวัด

- **DB ในเครื่องว่าง** ไม่มีบัญชีหรือนักเรียน จึง login ไม่ได้ ทุก route ที่ต้อง login (`/dashboard`, `/students`, `/students/import`, `/students/[id]`, `/students/[id]/help/start`, `/students/[id]/help/conversation`, `/analytics`) วัด Lighthouse และ screenshot ไม่ได้: **NOT VERIFIED**
- วัด Lighthouse และ screenshot จริงเฉพาะหน้า public (`/`, `/signin`, `/forgot-password`) หน้าเหล่านี้โหลดฟอนต์ใน root layout ชุดเดียวกับทุก route
- First Load JS วัดได้ทุก route เพราะคำนวณจาก build output ไม่ต้องใช้ DB

## วิธีวัด

### First Load JS

Next.js 16 (Turbopack) ไม่แสดงคอลัมน์ First Load JS ใน `next build` แล้ว จึงคำนวณจาก manifest ของ build:
ผลรวมของ `rootMainFiles` ใน `.next/server/app/<route>/page/build-manifest.json` กับทุกไฟล์ใน `entryJSFiles` ของ `page_client-reference-manifest.js` ของ route นั้น (ไม่รวม polyfill แบบ `nomodule`) gzip ด้วย level 9
ตัวเลขนี้ใช้เทียบก่อน/หลังได้ แต่ไม่ได้ตรงกับตัวเลขที่ Next.js รุ่นเก่าเคยแสดง

### Lighthouse

Lighthouse 13.6.0 ผ่าน `npx` (ไม่ได้เพิ่มใน `package.json`), preset mobile (Moto G Power, simulated slow 4G), วัด `next start` ในเครื่อง
รัน 3 ครั้งต่อ route แล้วรายงานค่ามัธยฐานของแต่ละ metric

```sh
npm run build && npx next start -p 3000
npx -y lighthouse@13.6.0 http://localhost:3000/signin \
  --chrome-flags="--headless=new" --only-categories=performance \
  --output=json --output-path=./signin-1.json
```

### Screenshots

Full-page PNG ที่ 390×844 และ 1440×900 ผ่าน Chrome DevTools Protocol บน Chrome ที่ติดตั้งในเครื่อง (ไม่ได้เพิ่ม Playwright หรือ E2E framework) โดยหยุด animation และ transition ไว้ที่เฟรมแรก แล้วเทียบ pixel ต่อ pixel
จับภาพซ้ำจาก build เดียวกันได้ผลต่าง 0 pixel วิธีนี้จึง deterministic

### วัด route ที่ต้อง login (สำหรับคนที่มีข้อมูลทดสอบ)

1. Seed DB ให้มีครูที่มีนักเรียนและผลคัดกรองอย่างน้อย 1 คน แล้ว login ใน Chrome
2. เปิด DevTools → Lighthouse → Mode: Navigation, Device: Mobile, Categories: Performance แล้วรันแต่ละ URL 3 ครั้ง:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/students`
   - `http://localhost:3000/students/import`
   - `http://localhost:3000/students/<id>`
   - `http://localhost:3000/students/<id>/help/start`
   - `http://localhost:3000/students/<id>/help/conversation`
   - `http://localhost:3000/analytics`
3. หรือใช้ CLI โดยส่ง session cookie: `npx -y lighthouse@13.6.0 <url> --extra-headers='{"Cookie":"<session cookie>"}' --only-categories=performance`
4. จับภาพ full-page ที่ 390×844 และ 1440×900 (DevTools → Device toolbar → "Capture full size screenshot") ทั้งก่อนและหลังแต่ละ PR แล้วเทียบกัน

## Baseline (`6452bf0`)

### First Load JS

| Route | Chunks | Raw (KB) | Gzip (KB) |
|---|---:|---:|---:|
| `/` | 11 | 525.8 | 159.3 |
| `/signin` | 14 | 665.5 | 202.0 |
| `/dashboard` | 14 | 579.7 | 177.8 |
| `/students` | 14 | 575.7 | 174.0 |
| `/students/import` | 14 | 613.1 | 186.7 |
| `/students/[id]` | 17 | 1034.0 | 304.5 |
| `/students/[id]/help/start` | 13 | 594.3 | 179.0 |
| `/students/[id]/help/conversation` | 13 | 542.0 | 164.9 |
| `/analytics` | 17 | 968.1 | 290.9 |

### Lighthouse (mobile, มัธยฐาน 3 ครั้ง)

| Route | Score | LCP (ms) | TBT (ms) | CLS | Transfer (KB) | Font (KB) |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 74 | 10746 | 120 | 0.000 | 2017.5 | 1464.9 |
| `/signin` | 72 | 10144 | 190 | 0.000 | 1732.4 | 1464.9 |
| route ที่ต้อง login | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |

LCP element ของ `/` คือรูปใน hero (`hero.webp` หรือโลโก้ แล้วแต่รอบ) ไม่ใช่พื้นหลัง `rainbow.webp`

### Screenshots

เก็บ baseline ของ `/`, `/signin` และ `/forgot-password` ที่ 390 และ 1440 px ไว้เทียบ route ที่ต้อง login: NOT VERIFIED

## ผลหลังแต่ละ PR

### PR 1 — `perf/font-subset`

ฟอนต์ที่โหลด: `GoogleSans-VariableFont.woff2` 1,499,124 bytes → `GoogleSans-LatinThai-VariableFont.woff2` 113,248 bytes (−92.4%)

| Route | Score | LCP (ms) | TBT (ms) | CLS | Transfer (KB) | Font (KB) |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 74 → 82 | 10746 → 4603 | 120 → 127 | 0.000 → 0.000 | 2017.5 → 664.2 | 1464.9 → 111.5 |
| `/signin` | 72 → 91 | 10144 → 3320 | 190 → 128 | 0.000 → 0.000 | 1732.4 → 379.0 | 1464.9 → 111.5 |

- First Load JS: ไม่เปลี่ยนทุก route (ตรงกับ baseline ทุกไบต์)
- Screenshots `/`, `/signin`, `/forgot-password` ที่ 390 และ 1440 px: ต่าง 0 pixel (**PASS**)
- Specimen ภาษาไทย + Latin ที่ weight 400/500/600/700, ขนาด 12–30 px, `GRAD` −50/200 และ `opsz` 17/18 เทียบฟอนต์ต้นฉบับกับ subset: ต่าง 0 pixel (**PASS**)
- route ที่ต้อง login: NOT VERIFIED (ฟอนต์ชุดเดียวกันมาจาก root layout)
