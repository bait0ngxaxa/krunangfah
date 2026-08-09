# ครูนางฟ้า (Krunangfah)

ระบบดูแลช่วยเหลือนักเรียนสำหรับครู ผู้ดูแลโรงเรียน และผู้ดูแลระบบ ครอบคลุมการคัดกรองสุขภาพจิต กิจกรรมช่วยเหลือ การให้คำปรึกษา การเยี่ยมบ้าน การส่งต่อ และการจัดการข้อมูลในบริบทโรงเรียน

## Technology stack

- Next.js 16, React 19 และ TypeScript
- PostgreSQL 16 ผ่าน Prisma ORM 6
- PgBouncer สำหรับ runtime connection pooling
- Redis สำหรับ distributed rate limit, session/analytics cache, lock และ idempotency แบบ best effort
- Local protected storage ที่ `.data/uploads`
- Nginx หลัง Cloudflare และ PM2 สำหรับ topology แบบ single VPS

รายละเอียดค่าระบบอยู่ที่ [Configuration](docs/configuration.md) และขั้นตอน production อยู่ที่ [Deployment runbook](docs/deployment.md)

## Requirements

- Node.js 20.9 ขึ้นไป
- npm และ package lock ของ repository
- Docker Engine พร้อม Docker Compose plugin

สำหรับ production ต้องมี Nginx, PM2, cron, `flock` และบัญชี Cloudflare เพิ่มเติมตาม deployment runbook

## เริ่มใช้งานบนเครื่องพัฒนา

1. คัดลอก `.env.example` เป็น `.env` แล้วเปลี่ยน placeholder โดยเฉพาะรหัสผ่านฐานข้อมูลและบัญชี bootstrap

```powershell
Copy-Item .env.example .env
```

2. ติดตั้ง dependency และเปิด PostgreSQL, PgBouncer และ Redis ซึ่ง bind เฉพาะ loopback

```powershell
npm ci
docker compose up -d db pgbouncer redis
docker compose ps
```

3. สร้าง Prisma Client และ apply migration ที่มีอยู่

```powershell
npx prisma generate
npx prisma migrate deploy
```

4. ตั้ง `ADMIN_EMAIL` และ `ADMIN_PASSWORD` แล้ว seed ครั้งแรก จากนั้นลบ `ADMIN_PASSWORD` ออกจาก `.env`

```powershell
npx prisma db seed
```

> `prisma db seed` จะ upsert system admin และเขียนรหัสผ่านใหม่ทุกครั้งที่มี `ADMIN_EMAIL`/`ADMIN_PASSWORD` รวมถึงปรับปีการศึกษาปัจจุบัน จึงไม่ควรรันเป็นขั้นตอนอัตโนมัติทุก deployment

5. เปิด development server ที่ <http://localhost:3000>

```powershell
npm run dev
```

## คำสั่งหลัก

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | เปิด Next.js development server |
| `npm run build` | สร้าง optimized production build |
| `npm run start` | เปิด production server หลัง build แล้ว |
| `npm run lint` | ตรวจ ESLint ทั้ง repository |
| `npx tsc --noEmit` | ตรวจ TypeScript โดยไม่สร้างไฟล์ |
| `npm test -- --run` | รัน unit tests หนึ่งรอบ |
| `npm run test:integration` | รัน integration tests; ใช้ได้เฉพาะฐานข้อมูลทดสอบที่แยกจากข้อมูลจริง |
| `npm run test:coverage` | รัน tests พร้อม coverage |
| `npm run cleanup:files` | ประมวลผล file-deletion outbox เมื่อ environment ถูก export ไว้แล้ว |

Scheduler ใน production ไม่เรียก `npm run cleanup:files` ตรง ๆ เพราะ CLI นี้ไม่ได้โหลด `.env` ผ่าน Next.js ให้ใช้คำสั่งและ cron template ใน [Deployment runbook](docs/deployment.md#scheduled-file-cleanup) แทน

## โครงสร้างที่เกี่ยวกับการดูแลระบบ

| Path | ความรับผิดชอบ |
| --- | --- |
| `app/` | App Router pages, layouts และ API route handlers |
| `lib/` | auth, services, actions, validation, cache และ data access |
| `prisma/` | schema, migrations และ seed |
| `scripts/` | operational one-shot jobs |
| `deploy/nginx/` | Nginx และ Cloudflare real-IP configuration |
| `deploy/pm2/` | PM2 process declaration สำหรับ Next.js |
| `deploy/cron/` | cron template สำหรับ background cleanup |
| `.data/uploads/` | ไฟล์อัปโหลดจริงที่ต้อง persist และ backup; ไม่อยู่ใน Git/Docker volume |

## ข้อควรระวัง

- ห้าม commit `.env`, credential, certificate private key หรือไฟล์ใน `.data`
- `DATABASE_URL` ต้องผ่าน PgBouncer port `6432`; `DIRECT_URL` ต้องตรงเข้า PostgreSQL port `5434`
- Port `3000`, `5434`, `6432` และ `6379` ต้องไม่เปิดสู่ public internet
- Process ของ Next.js และ cleanup job ต้องมี working directory เป็น root ของ repository เพราะ upload path อ้างอิง `process.cwd()`
- ก่อน migration หรือเปลี่ยน release ให้ backup PostgreSQL และ `.data/uploads` แบบสอดคล้องกัน

## เอกสารเพิ่มเติม

- [Configuration และ environment variables](docs/configuration.md)
- [Production deployment, backup, rollback และ cron](docs/deployment.md)
- [Product context](PRODUCT.md)
- [Domain language](CONTEXT.md)
- [Architectural decisions](docs/adr/)
