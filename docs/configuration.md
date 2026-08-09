# Configuration

เอกสารนี้อธิบาย configuration ที่ implementation ปัจจุบันอ่านจริง รวมถึงค่าของ Docker Compose, Prisma, Redis, email และ protected local storage ตัวอย่างตั้งต้นอยู่ที่ [`.env.example`](../.env.example)

## หลักการจัดการ environment

- ใช้ `.env` ที่ root เป็นไฟล์หลักของ topology นี้ เพราะ Next.js, Docker Compose และ cleanup job ต้องเห็นค่าเดียวกัน
- `.env` ถูก ignore โดย Git ส่วน `.env.example` เก็บเฉพาะ placeholder และ commit ได้
- Production ให้สิทธิ์ไฟล์ `.env` เฉพาะ deployment user เช่น mode `0600`
- ห้ามวาง secret ใน PM2 ecosystem file, Nginx config, command history หรือเอกสาร
- ค่า URL สาธารณะต้องใช้ origin เดียวกันและไม่มี `/` ปิดท้าย
- ถ้ารหัสผ่าน PostgreSQL มีอักขระพิเศษ ต้อง percent-encode เฉพาะส่วน password ใน `DATABASE_URL`/`DIRECT_URL` แต่ `POSTGRES_PASSWORD` ยังใช้ค่าจริงที่ไม่ encode
- การเปลี่ยน `NEXT_PUBLIC_APP_URL` ต้อง build ใหม่ เพราะตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` อาจถูกฝังลง build

ไม่แนะนำให้แยก secret ไปไว้เฉพาะ `.env.production` โดยไม่ปรับ deployment เพิ่ม เพราะ Docker Compose และ cron template ใน repo อ่าน `.env`

## Runtime และ public URL

| Variable | จำเป็นเมื่อ | ค่าที่แนะนำ/ผู้ใช้งาน |
| --- | --- | --- |
| `TZ` | ทุก environment | `Asia/Bangkok`; กำหนด timezone ให้ Node.js และ cleanup CLI สอดคล้องกับบริบทโรงเรียนไทย |
| `NEXTAUTH_URL` | Production และการสร้าง invite link | Canonical HTTPS origin เช่น `https://app.example.com`; แม้ชื่อเป็น legacy แต่ `school-admin-invite` และ `teacher-invite` ยังอ่านค่านี้โดยตรง |
| `NEXT_PUBLIC_APP_URL` | Password reset email | Canonical public origin สำหรับ reset link และ logo; local fallback ในโค้ดคือ `http://localhost:3000` ซึ่งห้ามพึ่งใน production |
| `NODE_ENV` | Runtime | `next dev`, `next build` และ `next start` จัดการให้ตาม mode; PM2 config กำหนด `production` ไว้แล้ว |

ระบบ authentication ปัจจุบันเป็น stateful session ที่เก็บ hash ของ token ใน PostgreSQL และใช้ Redis เป็น cache แบบ best effort ไม่ได้สร้าง session ผ่าน Auth.js runtime ดังนั้น `AUTH_SECRET`, `AUTH_URL` และ `AUTH_TRUST_HOST` ที่อาจอยู่ใน `.env` รุ่นเก่า **ไม่มี consumer ใน first-party runtime ปัจจุบัน** อย่าเพิ่มค่าเหล่านี้ใน deployment ใหม่โดยคิดว่าเป็น requirement ส่วน package `next-auth` ยังถูกใช้เป็น TypeScript type เท่านั้น

## PostgreSQL, Prisma และ PgBouncer

| Variable | Required | หน้าที่ |
| --- | --- | --- |
| `POSTGRES_USER` | ใช่ | สร้าง PostgreSQL user และเป็น credential ที่ PgBouncer ใช้ |
| `POSTGRES_PASSWORD` | ใช่ | รหัสผ่าน raw สำหรับ PostgreSQL/PgBouncer; ต้องตรงกับ password ที่ encode อยู่ใน connection URLs |
| `POSTGRES_DB` | ใช่ | ชื่อฐานข้อมูลที่ container สร้างและ PgBouncer proxy |
| `DATABASE_URL` | ใช่ | Runtime connection ของ app และ cleanup job ผ่าน `127.0.0.1:6432` |
| `DIRECT_URL` | ใช่ | Direct PostgreSQL connection ผ่าน `127.0.0.1:5434` สำหรับ Prisma CLI และ migration |

ตัวอย่าง topology บน host:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:6432/DATABASE?connection_limit=10&pool_timeout=30&connect_timeout=10"
DIRECT_URL="postgresql://USER:PASSWORD@127.0.0.1:5434/DATABASE?connect_timeout=10"
```

ข้อกำหนดที่ต้องรักษา:

- `docker-compose.yml` ใช้ PgBouncer `1.25.1`, `POOL_MODE=transaction` และ `MAX_PREPARED_STATEMENTS=100`
- PgBouncer 1.21 ขึ้นไปรองรับ protocol-level prepared statements เมื่อ `max_prepared_statements` มากกว่า `0`; configuration ปัจจุบันจึงไม่ใส่ `pgbouncer=true`
- ห้ามใช้ PgBouncer URL กับ migration; `prisma/schema.prisma` กำหนด `directUrl = env("DIRECT_URL")` ไว้แล้ว
- `connection_limit=10` เป็น limit ต่อ Prisma Client process ถ้าเพิ่ม PM2 instances ให้คำนวณผลรวมทุก process เทียบกับ `DEFAULT_POOL_SIZE=20`, `RESERVE_POOL_SIZE=5` และ PostgreSQL `max_connections=50` ก่อน
- Production ใช้ `npx prisma migrate deploy`; ห้ามใช้ `prisma migrate reset` หรือ `prisma db push` กับข้อมูลจริง

Repository ปัจจุบัน pin Prisma 6 และยังประกาศ seed command ผ่าน `package.json#prisma.seed` ซึ่งใช้งานได้ แต่ Prisma CLI แจ้งว่า form นี้จะถูกถอดใน Prisma 7 การอัปเกรด major version ต้องย้ายไป `prisma.config.ts` และทดสอบ `DIRECT_URL`, migrate และ seed ใหม่พร้อมกัน ห้ามลบ config เดิมก่อนทำ migration ดังกล่าว

แหล่งอ้างอิง: [Prisma with PgBouncer](https://docs.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/pgbouncer)

## Redis และ rate limiting

| Variable | Production | Behavior |
| --- | --- | --- |
| `RATE_LIMIT_DRIVER` | ตั้งเป็น `redis` | ค่าอื่นทั้งหมดใช้ in-memory limiter แยกต่อ process |
| `REDIS_URL` | `redis://127.0.0.1:6379` | ใช้กับ distributed rate limit, session/analytics cache, lock และ idempotency |

เมื่อ Redis ติดต่อไม่ได้:

- Rate limiter log error แล้ว fallback เป็น memory
- Session และ analytics cache จะ query แหล่งข้อมูลหลักแทน
- Redis lock/idempotency ที่เป็น best effort จะรายงาน unavailable และ flow ที่รองรับจะใช้ database constraints/transactions ต่อ

ข้อมูล authoritative ยังอยู่ใน PostgreSQL จึงไม่ต้อง restore Redis เพื่อกู้ข้อมูลหลัก แต่ production ควร monitor Redis เพราะ fallback แบบ per-process ลดความสม่ำเสมอของ rate limit และเพิ่ม database load

## Email

| Variable | จำเป็นเมื่อ | Behavior |
| --- | --- | --- |
| `RESEND_API_KEY` | เปิด password reset | ไม่มีค่าแล้วการส่ง reset email จะล้มเหลวอย่างปลอดภัย |
| `EMAIL_FROM` | Production email | Sender ที่ verify กับ Resend แล้ว; โค้ดมี fallback แต่ไม่ควรใช้ fallback domain ใน production |
| `NEXT_PUBLIC_APP_URL` | เปิด password reset | สร้าง reset URL และ absolute logo URL |

หลังตั้งค่าให้ทดสอบ password reset ด้วยบัญชีทดสอบและตรวจว่า sender, link origin, HTTPS และ logo ถูกต้อง โดยห้ามใช้บัญชีผู้ใช้จริงในการ smoke test

## Bootstrap seed

| Variable | ใช้เมื่อ | ข้อควรระวัง |
| --- | --- | --- |
| `ADMIN_EMAIL` | Seed system admin ครั้งแรก | Seed จะ normalize email, upsert user และ whitelist |
| `ADMIN_PASSWORD` | Seed system admin ครั้งแรก | Seed hash ด้วย bcrypt และ **เขียนรหัสผ่านใหม่ทุกครั้งที่รัน** |

`npx prisma db seed` ยัง upsert ปีการศึกษา/ภาคเรียนปัจจุบันด้วย หลัง bootstrap ให้ลบ `ADMIN_PASSWORD` ออกจาก `.env`; การ seed ครั้งถัดไปจะข้าม system admin แต่ยังปรับปีการศึกษา

## Test-only configuration

- `ALLOW_REAL_PRISMA_TESTS` เป็น safety switch ภายใน `vitest.integration.config.ts` ไม่ใช่ production setting
- ห้ามตั้ง `ALLOW_REAL_PRISMA_TESTS=true` ใน production `.env`
- `npm run test:integration` ต้องชี้ไปฐานข้อมูลทดสอบที่แยกและล้างได้เท่านั้น ตรวจ test setup ทุกครั้งก่อนรัน

## Ports และ network boundary

| Port | Owner | Exposure ที่ต้องการ |
| --- | --- | --- |
| `80`, `443` | Nginx | Public; production traffic ผ่าน Cloudflare |
| `3000` | Next.js/PM2 | `127.0.0.1` เท่านั้น |
| `5434` | PostgreSQL direct mapping | `127.0.0.1` เท่านั้น; Prisma CLI/migration |
| `6432` | PgBouncer | `127.0.0.1` เท่านั้น; app runtime |
| `6379` | Redis | `127.0.0.1` เท่านั้น |

Docker Compose bind database และ cache ports กับ loopback อยู่แล้ว PM2 config ใน repo bind Next.js กับ `127.0.0.1` เช่นกัน อย่าเปิด ports เหล่านี้เพิ่มใน firewall

## File storage และ request limits

- Worksheet และ home-visit images เก็บใต้ `.data/uploads/worksheets` และ `.data/uploads/home-visits`
- Directory ถูกสร้างเมื่อ upload ครั้งแรก แต่ deployment ควรสร้าง `.data` ล่วงหน้าและให้ app user เขียนได้
- ไฟล์ไม่อยู่ใน `public/`; การอ่านต้องผ่าน `/api/uploads/*` ซึ่งตรวจ session และ resource authorization
- Upload รองรับ `jpg`, `jpeg`, `png`; raw input และผลหลังประมวลผลจำกัด 15 MB
- Excel import จำกัด 2 MB
- Next.js Server Actions จำกัด request body 15 MB และ Nginx `client_max_body_size` ตั้ง 25 MB เพื่อไม่ให้ proxy เป็น limit ที่ต่ำกว่า
- Path อ้างอิง `process.cwd()` ดังนั้น PM2 และ cleanup job ต้องทำงานจาก root ของ repository
- `.data` ไม่อยู่ใน Docker volume และถูก ignore โดย Git ต้อง backup แยกจาก PostgreSQL

Architecture ปัจจุบันเหมาะกับ app process บนเครื่องเดียว หากเพิ่มหลาย host ต้องย้าย upload storage ไป shared/object storage ก่อน มิฉะนั้นแต่ละ host จะเห็นไฟล์ไม่ตรงกัน

## Preflight checklist

ก่อน start หรือ restart production:

1. `.env` มี permission จำกัดและไม่มี placeholder
2. URL ทั้งสามจุด (`NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, Nginx `server_name`) ตรงกัน
3. `DATABASE_URL` ใช้ port `6432`; `DIRECT_URL` ใช้ `5434`
4. `RATE_LIMIT_DRIVER=redis` และ Redis healthy
5. Resend sender ถูก verify ถ้าเปิด password reset
6. `.data` เขียนได้และรวมอยู่ใน backup policy
7. ไม่มี `AUTH_*`, `ADMIN_PASSWORD` หรือ `ALLOW_REAL_PRISMA_TESTS` ที่ถูกเข้าใจผิดว่าเป็น production requirement
