# Google Sans subset (Latin + Thai)

`app/layout.tsx` โหลด `public/fonts/GoogleSans-LatinThai-VariableFont.woff2` ผ่าน `next/font/local`
ไฟล์นี้เป็น subset ของ `assets/fonts/source/GoogleSans-VariableFont.woff2` (ต้นฉบับ 1,499,124 bytes, 3,281 codepoints)
ต้นฉบับเก็บไว้นอก `public/` เพื่อไม่ให้ถูกเสิร์ฟ แต่ยังใช้สร้าง subset ใหม่ได้

## License

ฟอนต์ใช้ SIL Open Font License 1.1 (name ID 0/13/14: "Copyright 2025 The Google Sans Project Authors (github.com/googlefonts/googlesans)")
ไม่ได้ประกาศ Reserved Font Name จึงทำ subset และใช้ชื่อเดิมได้ ไฟล์ subset ยังเก็บ name ID 0, 13 และ 14 ไว้
ถ้าแก้คำสั่งด้านล่าง ต้องตรวจว่าข้อมูล license ยังอยู่ในไฟล์ที่ได้

## สร้างใหม่

ต้องติดตั้ง `fonttools` และ `brotli` ในเครื่องเท่านั้น ห้ามเพิ่มลง `package.json`
ไฟล์ปัจจุบันสร้างด้วย fontTools 4.69.1 ได้ขนาด 113,248 bytes

```sh
python3 -m pip install fonttools brotli

pyftsubset assets/fonts/source/GoogleSans-VariableFont.woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0E00-0E7F,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features='*' --flavor=woff2 \
  --output-file=public/fonts/GoogleSans-LatinThai-VariableFont.woff2
```

### Unicode ranges ที่เก็บไว้

| Range | เหตุผล |
|---|---|
| `U+0000-00FF` | Basic Latin + Latin-1 (ASCII, ตัวเลข, เครื่องหมาย) |
| `U+0131`, `U+0152-0153`, `U+02BB-02BC`, `U+02C6`, `U+02DA`, `U+02DC` | ตัวอักษร/เครื่องหมายที่ Latin glyph ใช้ร่วมกัน |
| `U+0E00-0E7F` | ภาษาไทยทั้งบล็อก (ฟอนต์มีครบ 87 codepoints) |
| `U+2000-206F` | General Punctuation (dash, quotes, ellipsis, spaces) |
| `U+20AC`, `U+2122`, `U+2190-2193`, `U+2212`, `U+2215` | €, ™, ลูกศร, minus sign, division slash |
| `U+FEFF`, `U+FFFD` | BOM / replacement character |

## ข้อตัดสินใจ

- **เก็บทุกแกน (`opsz`, `wght`, `GRAD`)** ห้ามทำ instancing หรือตัด `opsz`/`GRAD` ทิ้ง วิธีนั้นได้ประมาณ 58 KB แต่ทำให้การเรนเดอร์เปลี่ยน
- **ไม่ใส่ Lao และ Khmer** (จะใหญ่ขึ้นเป็นประมาณ 191 KB) ชื่อที่ใช้อักษรเหล่านี้พบน้อย จึงให้ fallback เป็นฟอนต์ของระบบและยังอ่านได้
- ฟอนต์ต้นฉบับไม่มี Myanmar glyph อยู่แล้ว
- emoji และสัญลักษณ์ที่ใช้ในโค้ด (เช่น 🔴 ✅ ⚠ ▼ ─) ไม่มีในฟอนต์ต้นฉบับ จึงแสดงด้วย fallback ของระบบเหมือนเดิม

## ตรวจหลังสร้างใหม่

1. `fvar` ยังมีแกน `opsz`, `wght` และ `GRAD` ครบ
2. มี codepoint ภาษาไทยครบทุกตัวใน `U+0E00-0E7F` ที่ฟอนต์ต้นฉบับมี
3. สแกน codepoint ทุกตัวใน `app/`, `components/` และ `lib/` ต้องไม่มีตัวที่ฟอนต์ต้นฉบับรองรับแต่ subset ไม่มี
