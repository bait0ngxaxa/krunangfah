# Production deployment runbook

Runbook นี้รองรับ topology ที่ repository เตรียมไว้: Next.js หนึ่ง process บน Linux VPS, PM2 ดูแล process, PostgreSQL/PgBouncer/Redis อยู่ใน Docker Compose, Nginx เป็น reverse proxy และ Cloudflare อยู่หน้า origin

ค่าตัวอย่างใช้ app directory `/srv/krunangfah` และ deployment user ที่ไม่ใช่ root ให้เปลี่ยน path, user, domain และ certificate ให้ตรง environment จริง

## Topology และ boundary

```text
Internet -> Cloudflare -> Nginx :443 -> Next.js/PM2 127.0.0.1:3000
                                      |-> PgBouncer 127.0.0.1:6432 -> PostgreSQL
                                      |-> Redis 127.0.0.1:6379
                                      `-> .data/uploads (local persistent disk)

Prisma CLI ---------------------------> PostgreSQL 127.0.0.1:5434
cron cleanup -> PostgreSQL + .data/uploads
```

ข้อจำกัดที่ยืนยันจาก implementation:

- App ไม่ได้อยู่ใน `docker-compose.yml`; Compose ดูแลเฉพาะ data services
- Upload storage เป็น local disk และผูกกับ `process.cwd()`
- ไม่มี dedicated health endpoint; smoke check ใช้ `/signin` และตรวจ service แยก
- Redis ไม่ใช่แหล่งข้อมูลหลัก แต่ production rate limit ต้องใช้ Redis เพื่อให้สม่ำเสมอ

## 1. Prerequisites

ติดตั้งและกำหนดค่าต่อไปนี้ก่อน deploy:

- Node.js 20.9 ขึ้นไปและ npm
- Docker Engine พร้อม `docker compose`
- Nginx
- PM2
- cron, `flock` และ `logger`
- Cloudflare proxied DNS record และ Origin CA certificate หรือ certificate ที่ origin เชื่อถือได้
- Firewall เปิดเฉพาะ SSH, `80` และ `443`; ไม่เปิด `3000`, `5434`, `6432`, `6379`
- Deployment user เป็นเจ้าของ repository และ `.data`; ใช้ root เฉพาะงานติดตั้ง service/Nginx

ให้ตั้ง timezone ของ host เป็น `Asia/Bangkok` และตั้ง `TZ=Asia/Bangkok` ใน `.env` เพื่อให้ app, seed และ cron ใช้ฐานเวลาเดียวกัน

## 2. เตรียม application และ configuration

จาก root ของ repository:

```bash
cp .env.example .env
chmod 600 .env
npm ci
docker compose config --quiet
```

แก้ `.env` ตาม [Configuration](configuration.md) ก่อนทำขั้นตอนต่อไป ห้ามใช้ placeholder ใน production

สร้าง persistent directory ด้วย deployment user:

```bash
install -d -m 0750 .data .data/uploads
```

`deploy/pm2/ecosystem.config.js` คำนวณ working directory จากตำแหน่ง repository และ bind Next.js กับ `127.0.0.1:3000` จึงย้ายไฟล์ config ออกจาก repository ไม่ได้โดยไม่แก้ `cwd`

## 3. เปิด data services

```bash
docker compose up -d db pgbouncer redis
docker compose ps
```

ต้องเห็นทั้งสาม service เป็น healthy ก่อน migration ถ้าไม่ healthy ให้ดู log เฉพาะ service:

```bash
docker compose logs --tail 200 db
docker compose logs --tail 200 pgbouncer
docker compose logs --tail 200 redis
```

อย่าใช้ `docker compose down -v` ใน production เพราะ `-v` ลบ named volumes ของ PostgreSQL และ Redis

ค่าปรับ PostgreSQL ใน Compose ใช้ baseline ที่คาดว่า host มี memory เพียงพอสำหรับ `shared_buffers=512MB` และ `effective_cache_size=1536MB` ถ้า VPS มี memory ต่ำกว่านี้ให้ capacity-test และปรับก่อน start แทนการปล่อยให้ OOM

## 4. Prisma และ first deployment

```bash
npx prisma generate
npx prisma validate
npx prisma migrate deploy
npm run build
```

`migrate deploy` ต้องต่อผ่าน `DIRECT_URL` port `5434`; runtime ใช้ `DATABASE_URL` port `6432`

Seed เฉพาะตอน bootstrap หรือเมื่อผู้ดูแลตั้งใจปรับปีการศึกษาปัจจุบัน:

```bash
npx prisma db seed
```

หลัง seed system admin สำเร็จให้ลบ `ADMIN_PASSWORD` ออกจาก `.env` ทันที เพราะการรันซ้ำพร้อมค่านี้จะเปลี่ยนรหัสผ่านของบัญชีเดิม

## 5. Start Next.js ด้วย PM2

PM2 config ใช้ fork mode หนึ่ง instance เพื่อให้ตรงกับ single-host topology และ local upload storage:

```bash
pm2 start deploy/pm2/ecosystem.config.js
pm2 status
pm2 logs krunangfah --lines 100
```

ตั้งให้กลับมาทำงานหลัง reboot:

```bash
pm2 startup
```

รันคำสั่ง `sudo ...` ที่ PM2 แสดงให้ตรง user/path จริง แล้วบันทึก process list:

```bash
pm2 save
```

เมื่ออัปเกรด Node.js ให้สร้าง PM2 startup hook ใหม่ตามคำแนะนำของ PM2 เพื่อไม่ให้ systemd ชี้ไป Node binary รุ่นเก่า

ตรวจ origin app ก่อนเปิด Nginx:

```bash
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/signin
```

## 6. Nginx และ Cloudflare

แก้ `deploy/nginx/krunangfah.conf` ก่อนติดตั้ง:

1. เปลี่ยน `server_name` ทั้ง HTTP/HTTPS เป็น production hostname
2. เปลี่ยน `ssl_certificate` และ `ssl_certificate_key` ให้ตรง Origin CA certificate
3. รักษา upstream `127.0.0.1:3000`, upload limit และ forwarded headers ไว้ เว้นแต่ architecture เปลี่ยน

ติดตั้ง config:

```bash
sudo install -m 0644 deploy/nginx/cloudflare-real-ip.conf /etc/nginx/snippets/cloudflare-real-ip.conf
sudo install -m 0644 deploy/nginx/krunangfah.conf /etc/nginx/sites-available/krunangfah.conf
sudo ln -s /etc/nginx/sites-available/krunangfah.conf /etc/nginx/sites-enabled/krunangfah.conf
sudo nginx -t
sudo systemctl reload nginx
```

ตั้ง Cloudflare SSL/TLS mode เป็น **Full (strict)** และเก็บ Origin CA private key ด้วย permission ที่จำกัด Cloudflare ไม่แจ้งเตือนวันหมดอายุ Origin CA โดยอัตโนมัติ จึงต้องมี certificate-expiry monitoring เอง

`deploy/nginx/cloudflare-real-ip.conf` ต้องเทียบกับรายการทางการเป็นระยะ:

- <https://www.cloudflare.com/ips-v4>
- <https://www.cloudflare.com/ips-v6>

รายการใน repo ตรงกับรายการทางการ ณ วันที่ตรวจเอกสารนี้ (2026-08-09) แต่ต้องตรวจใหม่ก่อน deploy และหลัง Cloudflare ประกาศเปลี่ยนแปลง จากนั้นรัน `sudo nginx -t` ก่อน reload ทุกครั้ง

ตรวจเส้นทาง public:

```bash
curl --fail --silent --show-error --output /dev/null https://YOUR_DOMAIN/signin
```

## Scheduled file cleanup

การลบถาวรบาง workflow จะ enqueue `FileDeletionOutbox` ใน transaction แล้วให้ CLI ลบไฟล์จริงภายหลัง Job ปัจจุบัน:

- ดึงสูงสุด 50 รายการที่ถึงเวลาในแต่ละรอบ
- ประมวลผลเรียงตามเวลาสร้าง
- ถือว่าไฟล์ที่ไม่มีอยู่แล้วสำเร็จ
- retry ด้วย exponential backoff เริ่มประมาณ 2 นาทีและ cap ที่ 24 ชั่วโมง
- exit code เป็น non-zero เมื่อมีรายการล้มเหลวในรอบนั้น
- รองรับเฉพาะ `/api/uploads/home-visits/` และ `/api/uploads/worksheets/`

CLI อยู่นอก Next.js จึงต้องโหลด `.env` เอง และต้อง `cd` เข้า root เพื่อชี้ `.data` ถูกตำแหน่ง ทดสอบด้วย deployment user:

```bash
./node_modules/.bin/tsx --env-file=.env scripts/process-file-deletion-outbox.ts
```

ผลปกติจะ log `File deletion cleanup completed` พร้อม `{ processed, failed }`

ติดตั้ง cron ทุก 5 นาที:

1. หา Node binary directory ด้วย `dirname "$(command -v node)"`
2. เปิด `deploy/cron/krunangfah-file-cleanup.crontab.example`
3. แทน `__NODE_BIN_DIR__` และ `__APP_DIR__` ด้วย absolute paths จริง
4. ใช้ `crontab -e` ของ user เดียวกับ PM2 แล้ว merge บรรทัดจาก template; อย่าเขียนทับ cron jobs เดิมทั้งไฟล์

Template ใช้ `flock -n` กันรอบซ้อน ใช้ `bash -o pipefail` เพื่อรักษา failure exit code และส่ง output เข้า system logger ตรวจ log ได้ด้วย:

```bash
journalctl -t krunangfah-file-cleanup --since "1 hour ago"
```

ตรวจหลังติดตั้งโดย enqueue/delete ข้อมูลทดสอบผ่าน workflow ที่อนุญาต แล้วดูว่า outbox ถูกประมวลผลและไฟล์หายตามสิทธิ์ ห้ามทดสอบกับข้อมูลจริง

ถ้า queue โตต่อเนื่องเกิน 50 รายการต่อรอบ ให้ตรวจ error และ disk/database health ก่อนเพิ่มความถี่ ห้ามรันหลาย job พร้อมกันเพื่อเร่ง queue เพราะ worker ปัจจุบันไม่มี row-claim protocol สำหรับ concurrent workers

## Routine release

ลำดับนี้สมมติว่า migration ของ release ใหม่ backward-compatible กับ process เดิมระหว่างช่วงสั้น ๆ ที่ apply migration ถ้า migration แตก compatibility ให้ประกาศ maintenance window และหยุด app ก่อนตามแผนของ release นั้น

```bash
git pull --ff-only
npm ci
npx prisma generate
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

จากนั้นทำ coordinated backup ตามหัวข้อถัดไป แล้ว apply migration และ restart:

```bash
npx prisma migrate deploy
pm2 restart deploy/pm2/ecosystem.config.js --only krunangfah
pm2 status
curl --fail --silent --show-error --output /dev/null http://127.0.0.1:3000/signin
curl --fail --silent --show-error --output /dev/null https://YOUR_DOMAIN/signin
```

ตรวจ sign-in, password reset, invite link และ upload/download ด้วยบัญชีทดสอบตามความเสี่ยงของ release

อย่า `docker compose pull` อัตโนมัติในทุก release เพราะ tags `postgres:16-alpine` และ `redis:7-alpine` สามารถเปลี่ยน image digest ได้ ให้ upgrade data services เป็นงานแยกที่มี backup และ rollback plan

## Backup

ข้อมูลที่ต้อง backup:

1. PostgreSQL เป็น authoritative metadata/business data
2. `.data/uploads` เป็นไฟล์จริงที่อ้างอิงจาก PostgreSQL
3. `.env` และ certificate/private key ผ่าน secret backup ที่เข้ารหัสและแยกสิทธิ์

Redis เป็น cache/coordination layer ไม่ใช่ authoritative backup target

ตัวอย่าง backup จาก root โดยกำหนด path เฉพาะงาน ห้ามใช้ path กว้าง เช่น `/` หรือ home directory:

```bash
APP_DIR=/srv/krunangfah
BACKUP_DIR=/srv/backups/krunangfah/$(date +%Y%m%d-%H%M%S)
install -d -m 0700 "$BACKUP_DIR"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$BACKUP_DIR/postgres.dump"
tar -C "$APP_DIR" -czf "$BACKUP_DIR/uploads.tgz" .data/uploads
```

เพื่อให้ database metadata และไฟล์ตรงกัน ให้หยุด mutation ชั่วคราวหรือใช้ maintenance window ระหว่าง backup ทั้งสองส่วน กำหนด retention, off-host copy, encryption และ restore drill ตาม RPO/RTO ขององค์กร ห้ามถือว่า backup ใช้งานได้จนกว่าจะ restore ทดสอบใน environment แยกสำเร็จ

## Rollback และ recovery

- Code rollback: checkout/redeploy release ที่รู้ว่าใช้งานได้, `npm ci`, `npx prisma generate`, `npm run build`, แล้ว restart PM2
- Database migration เป็น forward-only โดย default ห้ามใช้ `prisma migrate reset` ใน production
- ถ้า schema ใหม่ไม่ backward-compatible การ rollback code อย่างเดียวอาจไม่พอ ต้องใช้ migration แก้ไปข้างหน้าหรือ restore coordinated backup หลังประเมินข้อมูลที่เกิดหลัง backup
- File restore ต้องจับคู่กับ database snapshot เดียวกันเพื่อไม่ให้ metadata ชี้ไฟล์ผิดชุด
- `docker compose down` ไม่ลบ volume แต่ `docker compose down -v` ลบข้อมูลและห้ามใช้ใน runbook ปกติ

## Monitoring checklist

- `pm2 status` และ PM2 error logs
- HTTP status/latency ของ `/signin` ผ่าน origin และ public URL
- Docker health ของ `db`, `pgbouncer`, `redis`
- PostgreSQL connection count, disk, backup age และ migration status
- Redis availability และ memory
- Free disk/inode ของ `.data`, Docker volumes และ PM2 logs
- Cron last-success time, `failed` count และ file-deletion outbox backlog
- Nginx access/error logs, TLS expiry และ Cloudflare origin connectivity

## Open operational decisions

Repository ไม่สามารถยืนยันค่าต่อไปนี้จาก source และต้องกำหนดใน production ownership/runbook ขององค์กร:

- deployment hostname, Linux user/group และ absolute app path
- backup retention, off-site destination, RPO/RTO และผู้ทดสอบ restore
- alerting/monitoring platform และ threshold
- maintenance window สำหรับ breaking migration
- Resend verified domain และผู้รับผิดชอบ certificate renewal

หากเปลี่ยนจาก single VPS, เพิ่ม PM2 instances หรือเพิ่มหลาย host ให้ทบทวน connection budget, shared upload storage, scheduler concurrency และ cache consistency ก่อน deploy

## Official references

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Prisma production migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [PM2 ecosystem file](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 startup hook](https://pm2.keymetrics.io/docs/usage/startup/)
- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
