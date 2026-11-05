# Test-sim-TIMETABLE-SYSTEM

## รันด้วย Docker

โปรเจกต์นี้มี React frontend และ mock algorithm สำหรับทดสอบการเชื่อมต่อ:

```bash
docker compose up --build
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วกดสร้างตารางเรียนได้ทันที
Frontend เรียก `POST /api/schedule` โดย Nginx จะ proxy ไปยัง service `algorithm`
ที่ port 8000 หากนำ algorithm จริงมาใช้ ให้แทนที่ service ใน `docker-compose.yml`
โดยคง endpoint และ response รูปแบบเดียวกัน

## รัน frontend แบบ development

```bash
cd frontend
npm install
npm run dev
```

ในโหมด development Vite จะ proxy `/api` ไปที่ `http://localhost:8000`