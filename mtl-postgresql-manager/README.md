# MTL PostgreSQL Manager

Hệ thống quản lý PostgreSQL bằng Docker, bao gồm ứng dụng web Next.js và pgAdmin4.

## 1. Giới thiệu dự án

MTL PostgreSQL Manager là một bộ công cụ quản lý PostgreSQL hoàn chỉnh, chạy hoàn toàn trong Docker:

- **mtl-postgresql**: PostgreSQL 18 server - lưu trữ dữ liệu
- **mtl-manager-postgresql**: Ứng dụng quản lý viết bằng Next.js 14 - giao diện web để quản lý databases, users, backups
- **mtl-pgadmin**: pgAdmin4 - công cụ quản trị PostgreSQL chuyên nghiệp

### Tính năng chính

- Quản lý databases (tạo, xóa, đổi tên)
- Quản lý users và phân quyền
- Backup và restore databases
- Audit logs theo dõi hoạt động
- Giao diện responsive, tốc độ nhanh

## 2. Cấu trúc thư mục

```
mtl-postgresql-manager/
├── src/                          # Source code Next.js
│   ├── app/                      # App router
│   │   ├── (admin)/             # Admin pages (dashboard, databases, users, etc.)
│   │   ├── (auth)/              # Auth pages (login)
│   │   └── api/                 # API routes
│   ├── components/               # React components (UI, layout)
│   │   ├── ui/                  # shadcn/ui components
│   │   └── layout/              # Layout components (sidebar, header)
│   ├── lib/                     # Utilities
│   │   ├── auth.ts              # Authentication logic
│   │   ├── postgres.ts          # PostgreSQL operations
│   │   ├── prisma.ts            # Prisma client
│   │   ├── audit.ts             # Audit logging
│   │   └── utils.ts             # Helper functions
│   └── types/                   # TypeScript types
├── prisma/                      # Prisma ORM
│   ├── schema.prisma            # Database schema (SQLite)
│   └── seed.ts                  # Database seeder
├── scripts/                     # Scripts
│   └── seed.js                  # Seed script for Docker
├── docs/                        # Documentation
│   ├── SETUP-GUIDE.md           # Hướng dẫn sử dụng chi tiết
│   └── DOCKER-HUB-GUIDE.md      # Hướng dẫn push Docker Hub
├── data/                        # Data volumes (tạo tự động)
│   ├── postgres/                # PostgreSQL data
│   ├── sqlite/                  # SQLite database (MTL Manager)
│   └── pgadmin/                 # pgAdmin4 config
├── backups/                     # Backup files
├── Dockerfile                   # Docker image build (dùng cho dev)
├── docker-compose.yml           # Development - build local
├── docker-compose.prod.yml      # Production - pull từ Docker Hub
├── package.json                 # Node.js dependencies
├── next.config.js               # Next.js config
├── tailwind.config.ts           # Tailwind CSS config
├── components.json              # shadcn/ui config
└── .env.example                 # Template biến môi trường

```

## 3. Kiến trúc Docker

### Các Container

| Container | Image | Mô tả |
|-----------|-------|--------|
| `mtl-postgresql` | postgres:18-alpine | PostgreSQL 18 server |
| `mtl-manager-postgresql` | Build từ Dockerfile | Ứng dụng Next.js |
| `mtl-pgadmin` | dpage/pgadmin4:latest | pgAdmin4 web |

### Ports

| Service | External Port | Internal Port | Container |
|---------|--------------|---------------|-----------|
| PostgreSQL | 7000 | 5432 | mtl-postgresql |
| MTL Manager | 7001 | 3000 | mtl-manager-postgresql |
| pgAdmin4 | 7002 | 80 | mtl-pgadmin |

### Networks

- **mtl-network**: Bridge network kết nối tất cả các container

### Volumes

| Host Path | Container Path | Mô tả |
|-----------|--------------|--------|
| `./data/postgres` | `/var/lib/postgresql/data` | PostgreSQL data files |
| `./data/sqlite` | `/data` | SQLite database (MTL Manager) |
| `./data/pgadmin` | `/var/lib/pgadmin` | pgAdmin4 session/config |
| `./backups` | `/backups` | Backup files |

## 4. Cách chạy từ source khi phát triển

### Yêu cầu

- Node.js 20+
- npm hoặc yarn
- Docker Desktop (cho PostgreSQL)

### Các bước

#### 1. Cài đặt dependencies

```bash
cd mtl-postgresql-manager
npm install
```

#### 2. Tạo file `.env`

```bash
cp .env.example .env
```

Chỉnh sửa `.env` theo nhu cầu:

```env
DATABASE_URL="file:./data/mtl-manager.db"
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=postgres
SESSION_SECRET=your_secret_key_here
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=admin123
```

#### 3. Khởi tạo Prisma (SQLite)

```bash
npm run db:push
```

#### 4. Chạy seed để tạo admin user

```bash
npm run db:seed
```

#### 5. Chạy dev server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: **http://localhost:3000**

#### 6. (Tùy chọn) Chạy PostgreSQL bằng Docker

```bash
docker run -d \
  --name mtl-postgresql-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=postgres \
  -p 7000:5432 \
  postgres:18-alpine
```

## 5. Cách chạy bằng Docker Compose

### 5.1 Development - `docker-compose.yml`

Dùng khi **phát triển** (có source code, muốn build local):

```bash
# Khởi động (build image từ local Dockerfile)
docker-compose up -d

# Build lại image sau khi thay đổi code
docker-compose up -d --build

# Xem logs
docker-compose logs -f

# Dừng
docker-compose down
```

**Đặc điểm:**
- Manager image được **build từ local Dockerfile**
- Phù hợp để develop và test thay đổi
- Image chưa được push lên Docker Hub

### 5.2 Production - `docker-compose.prod.yml`

Dùng khi **deploy** trên server hoặc máy khác (không có source code):

```bash
# 1. Pull image từ Docker Hub (trên máy đã push trước đó)
docker-compose -f docker-compose.prod.yml build manager
docker tag mtl-postgresql-manager-manager:latest quangthai87/mtl-postgresql-manager:latest
docker push quangthai87/mtl-postgresql-manager:latest

# 2. Trên máy Linux/Server:
# Tạo .env với password bảo mật
cp .env.example .env
nano .env  # Chỉnh sửa password

# 3. Khởi động (pull images từ Docker Hub)
docker-compose -f docker-compose.prod.yml up -d

# 4. Kiểm tra
docker-compose -f docker-compose.prod.yml ps

# 5. Xem logs
docker-compose -f docker-compose.prod.yml logs -f
```

**Đặc điểm:**
- Manager image được **pull từ Docker Hub**
- postgres và pgadmin dùng images public
- Không cần source code, chỉ cần `docker-compose.prod.yml` và `.env`
- Phù hợp để deploy trên Linux server

### So sánh Development vs Production

| | `docker-compose.yml` | `docker-compose.prod.yml` |
|--|--|--|
| Mục đích | Phát triển (Development) | Deploy (Production) |
| Manager image | Build từ local Dockerfile | Pull từ Docker Hub |
| postgres | postgres:18-alpine | postgres:18-alpine |
| pgadmin | dpage/pgadmin4 | dpage/pgadmin4 |
| Cần source code | ✅ Có | ❌ Không |

### Các lệnh Docker Compose chung

```bash
# Xem trạng thái containers
docker-compose ps

# Stop containers
docker-compose stop

# Stop và xóa containers
docker-compose down

# Stop và xóa containers cùng volumes (XÓA HẾT DỮ LIỆU)
docker-compose down -v

# Restart
docker-compose restart

# Xem logs container cụ thể
docker-compose logs -f manager
docker-compose logs -f postgres
```

## 6. Tài khoản mặc định

### PostgreSQL

| Field | Giá trị từ .env |
|-------|-----------------|
| Host | `mtl-postgresql` |
| Port | `5432` |
| User | `postgres` |
| Password | `POSTGRES_PASSWORD` |
| Database | `postgres` |

### pgAdmin4

| Field | Giá trị từ .env |
|-------|-----------------|
| URL | http://localhost:7002 |
| Email | `PGADMIN_DEFAULT_EMAIL` |
| Password | `PGADMIN_PASSWORD` |

### MTL Manager (Admin App)

| Field | Giá trị từ .env |
|-------|-----------------|
| URL | http://localhost:7001 |
| Username | `ADMIN_USERNAME` |
| Password | `ADMIN_PASSWORD` |

**Lưu ý:** Admin user được tạo tự động bởi seed script khi container khởi động lần đầu. Nếu thay đổi credentials trong `.env` sau khi đã tạo user, cần xóa SQLite database để tạo lại:

```bash
docker exec mtl-manager-postgresql rm -f /data/mtl-manager.db
docker-compose restart manager
```

## 7. Backup và Restore

### Backup bằng MTL Manager App

1. Truy cập **http://localhost:7001**
2. Đăng nhập với tài khoản admin
3. Vào mục **Databases** → Chọn database
4. Click **Sao lưu** → Nhập tên file backup

Backup sẽ được lưu trong thư mục `./backups/`

### Backup bằng pg_dump trong Docker

```bash
# Backup một database
docker exec mtl-postgresql pg_dump -U postgres -Fc mydatabase > backup.dump

# Backup tất cả databases
docker exec mtl-postgresql pg_dumpall -U postgres > all_databases.sql
```

### Restore bằng pg_restore

```bash
# Restore vào database mới
docker exec -i mtl-postgresql pg_restore -U postgres -d mydatabase < backup.dump

# Restore overwrite (xóa dữ liệu cũ)
docker exec -i mtl-postgresql pg_restore -U postgres -d mydatabase --clean < backup.dump
```

### Restore bằng psql (plain SQL)

```bash
docker exec -i mtl-postgresql psql -U postgres mydatabase < backup.sql
```

### Vị trí thư mục backups

```
mtl-postgresql-manager/
├── backups/                    # File backups ở đây
│   ├── mydb_20240101.dump
│   └── mydb_20240102.dump
└── ...
```

## 8. Kết nối pgAdmin vào PostgreSQL

**Quan trọng:** Khi thêm server trong pgAdmin4, phải dùng container name `mtl-postgresql`, KHÔNG dùng `localhost` hoặc `127.0.0.1`.

### Các bước thêm server

1. Truy cập **http://localhost:7002**
2. Đăng nhập với `PGADMIN_DEFAULT_EMAIL` và `PGADMIN_PASSWORD`
3. Trong panel trái, click chuột phải vào **Servers** → **Register** → **Server...**
4. Tab **General**:
   - Name: `MTL PostgreSQL` (hoặc tên tùy ý)
5. Tab **Connection**:
   ```
   Host name/address: mtl-postgresql
   Port: 5432
   Maintenance database: postgres
   Username: postgres
   Password: postgres123
   ```
6. Tab **Advanced** (tùy chọn):
   - SSH tunnel: None
7. Click **Save**

### Lỗi thường gặp khi kết nối

- **"Could not connect to server"**: Dùng `localhost` thay vì `mtl-postgresql`
- **"Connection refused"**: PostgreSQL chưa khởi động xong, đợi vài giây rồi thử lại
- **"Password authentication failed"**: Sai password, kiểm tra `POSTGRES_PASSWORD` trong `.env`

## 9. Docker Hub - Push và Pull Images

### 9.1 Push image lên Docker Hub (Development Machine)

Chỉ cần push **1 image duy nhất** - `manager`:

```bash
# 1. Build image manager
docker-compose build manager

# 2. Tag image cho Docker Hub
docker tag mtl-postgresql-manager-manager:latest quangthai87/mtl-postgresql-manager:latest

# 3. Login Docker Hub
docker login

# 4. Push lên Docker Hub
docker push quangthai87/mtl-postgresql-manager:latest
```

**Giải thích:**
| Container | Image | Nguồn | Cần push? |
|-----------|-------|--------|----------|
| `postgres` | postgres:18-alpine | Docker Hub chính thức | ❌ Không |
| `pgadmin` | dpage/pgadmin4:latest | Docker Hub chính thức | ❌ Không |
| `manager` | Build từ Dockerfile | Image tự tạo | ✅ **Có** |

### 9.2 Pull và chạy trên Linux/Server (Production)

```bash
# 1. Cài đặt Docker
sudo apt update && sudo apt install docker.io docker-compose -y

# 2. Tạo thư mục
mkdir -p ~/mtl-postgresql-manager
cd ~/mtl-postgresql-manager

# 3. Tải docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/quangthai87/MTL-Manager-PostgreSQL/main/mtl-postgresql-manager/docker-compose.prod.yml

# 4. Tạo file .env với password bảo mật
cat > .env << 'EOF'
POSTGRES_PASSWORD=your_secure_password
SESSION_SECRET=your_secure_session_secret
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=your_secure_password
PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_PASSWORD=your_secure_password
NEXT_PUBLIC_APP_URL=http://localhost:7001
DOCKERHUB_IMAGE=quangthai87/mtl-postgresql-manager
IMAGE_TAG=latest
EOF

# 5. Khởi động
docker-compose -f docker-compose.prod.yml up -d

# 6. Kiểm tra
docker-compose -f docker-compose.prod.yml ps
```

### 9.3 Truy cập các dịch vụ

| Service | URL |
|---------|-----|
| MTL Manager | http://localhost:7001 |
| pgAdmin4 | http://localhost:7002 |
| PostgreSQL | localhost:7000 |

## 11. Quy trình update source

### Khi có thay đổi code

```bash
# 1. Pull code mới
git pull

# 2. Dừng containers hiện tại
docker-compose down

# 3. Build lại image với code mới
docker-compose up -d --build

# 4. Kiểm tra logs
docker-compose logs -f manager

# 5. Kiểm tra trạng thái
docker-compose ps
```

### Khi chỉ thay đổi .env

```bash
# Restart containers để áp dụng .env mới
docker-compose restart
```

### Quan trọng - Giữ lại dữ liệu

**KHÔNG xóa thư mục `data/`** nếu muốn giữ database PostgreSQL và cấu hình pgAdmin.

**KHÔNG dùng** `docker-compose down -v` vì sẽ xóa volumes chứa dữ liệu.

### Full reset (xóa hết dữ liệu)

```bash
# Cảnh báo: Xóa toàn bộ dữ liệu!
docker-compose down -v
rm -rf data/
docker-compose up -d --build
```

## 12. Quy trình commit Git

### Kiểm tra thay đổi

```bash
git status
```

### Xem chi tiết thay đổi

```bash
git diff
```

### Tạo nhánh mới cho tính năng

```bash
git checkout -b feat/add-new-feature
```

### Commit với message rõ ràng

```bash
# Format: <type>: <description>
git add .
git commit -m "feat: add pgAdmin container and project documentation"
```

### Các loại commit phổ biến

| Type | Mô tả |
|------|-------|
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `docs` | Thay đổi tài liệu |
| `refactor` | Refactor code |
| `style` | Thay đổi style (không ảnh hưởng logic) |
| `perf` | Cải thiện performance |
| `test` | Thêm/sửa tests |
| `chore` | Công việc bảo trì |

### Push lên remote

```bash
git push origin feat/add-new-feature
```

### Merge vào main

```bash
git checkout main
git merge feat/add-new-feature
git push origin main
```

## 13. Các lỗi thường gặp

### pgAdmin không kết nối PostgreSQL

**Nguyên nhân:** Nhập `localhost` hoặc `127.0.0.1` thay vì `mtl-postgresql`

**Giải pháp:**
1. Trong pgAdmin, khi thêm server phải nhập:
   - Host: `mtl-postgresql`
   - Port: `5432`
2. Đảm bảo tất cả containers đều trong cùng network `mtl-network`

### Port 7000/7001/7002 bị trùng

**Nguyên nhân:** Port đã được container khác hoặc ứng dụng khác sử dụng.

**Giải pháp:**
```bash
# Kiểm tra port đang sử dụng
netstat -an | findstr "7000"
netstat -an | findstr "7001"
netstat -an | findstr "7002"

# Đổi port trong docker-compose.yml
ports:
  - "8080:5432"  # Thay đổi external port
```

### Mất dữ liệu do xóa volume/thư mục data

**Nguyên nhân:** Sử dụng `docker-compose down -v` hoặc xóa thư mục `data/`

**Giải pháp:**
- Backup thường xuyên bằng pg_dump
- Không bao giờ chạy `docker-compose down -v` trừ khi muốn xóa toàn bộ dữ liệu
- Thư mục `data/` nên được commit vào Git (thêm vào `.gitignore` nếu chứa dữ liệu nhạy cảm)

### Prisma chưa sync database SQLite

**Nguyên nhân:** Schema Prisma thay đổi nhưng SQLite chưa được update.

**Giải pháp:**
```bash
# Trong container
docker exec mtl-manager-postgresql npx prisma db push

# Hoặc local
npm run db:push
```

### Docker container unhealthy

**Nguyên nhân:** PostgreSQL chưa sẵn sàng khi manager cố kết nối.

**Giải pháp:**
```bash
# Kiểm tra health status
docker inspect mtl-postgresql --format '{{.State.Health.Status}}'

# Xem logs
docker logs mtl-postgresql

# Restart PostgreSQL
docker-compose restart postgres
```

### Không đăng nhập được MTL Manager

**Nguyên nhân:** Sai credentials hoặc session conflict.

**Giải pháp:**
```bash
# Xóa SQLite database để reset admin user
docker exec mtl-manager-postgresql rm -f /data/mtl-manager.db
docker-compose restart manager
```

### Không đăng nhập được pgAdmin

**Nguyên nhân:** Credentials cũ conflict.

**Giải pháp:**
```bash
# Xóa pgAdmin database
docker exec mtl-pgadmin rm -f /var/lib/pgadmin/pgadmin4.db
docker-compose restart pgadmin
```

## Công nghệ sử dụng

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Database (App)**: SQLite + Prisma ORM
- **Database (Data)**: PostgreSQL 18
- **Container**: Docker, Docker Compose
- **Authentication**: JWT sessions với bcrypt

## License

Copyright 2026 MTL Technology. All rights reserved.
