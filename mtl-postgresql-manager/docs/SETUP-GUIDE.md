# MTL PostgreSQL Manager - Hướng Dẫn Sử Dụng

## Mục Lục
- [Giới Thiệu](#giới-thiệu)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt Nhanh](#cài-đặt-nhanh)
- [Cấu Hình](#cấu-hình)
- [Đăng Nhập](#đăng-nhập)
- [Sử Dụng MTL Manager](#sử-dụng-mtl-manager)
- [Kết Nối pgAdmin4](#kết-nối-pgadmin4)
- [Khắc Phục Sự Cố](#khắc-phục-sự-cố)

---

## Giới Thiệu

MTL PostgreSQL Manager là công cụ quản lý PostgreSQL với giao diện web, bao gồm:
- **MTL Manager (port 7001)**: Quản lý databases, users, backups, restores
- **pgAdmin4 (port 7002)**: Công cụ quản lý PostgreSQL chuyên nghiệp

---

## Yêu Cầu Hệ Thống

- **Docker** phiên bản 20.10 trở lên
- **Docker Compose** phiên bản 2.0 trở lên
- **RAM**: Tối thiểu 2GB
- **Ổ cứng**: Tối thiểu 5GB trống

Kiểm tra phiên bản Docker:
```bash
docker --version
docker compose version
```

---

## Cài Đặt Nhanh

### 1. Tải project về máy

```bash
git clone <repository-url>
cd MTL-Manager-PostgreSQL/mtl-postgresql-manager
```

### 2. Tạo file cấu hình `.env`

```bash
cp .env.example .env
```

### 3. Khởi động Docker

```bash
docker-compose up -d
```

### 4. Kiểm tra trạng thái

```bash
docker-compose ps
```

Kết quả:
```
NAME                    STATUS          PORTS
mtl-postgresql          Up              0.0.0.0:7000->5432/tcp
mtl-manager-postgresql  Up              0.0.0.0:7001->3000/tcp
mtl-pgadmin            Up              0.0.0.0:7002->80/tcp
```

---

## Cấu Hình

### File `.env`

Mở file `.env` và chỉnh sửa các thông số:

```env
# =============================================================================
# POSTGRESQL CONNECTION
# =============================================================================
POSTGRES_HOST=mtl-postgresql
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=postgres

# =============================================================================
# SESSION
# =============================================================================
SESSION_SECRET=mtl_manager_secret_key_change_in_production

# =============================================================================
# APPLICATION
# =============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:7001

# =============================================================================
# ADMIN CREDENTIALS - MTL Manager App
# =============================================================================
ADMIN_USERNAME=your_email@example.com
ADMIN_PASSWORD=your_password

# =============================================================================
# ADMIN CREDENTIALS - pgAdmin4
# =============================================================================
PGADMIN_DEFAULT_EMAIL=your_email@example.com
PGADMIN_PASSWORD=your_password
```

### Thay đổi credentials

**Quan trọng:** Nếu thay đổi credentials trong `.env` sau khi đã chạy container, cần rebuild:

```bash
# Xóa pgAdmin database (nếu đổi PGADMIN credentials)
docker exec mtl-pgadmin rm -f /var/lib/pgadmin/pgadmin4.db

# Rebuild và restart
docker-compose build manager
docker-compose up -d
```

### Các ports mặc định

| Service | Port | Mô tả |
|---------|------|--------|
| PostgreSQL | 7000 | Cổng kết nối PostgreSQL |
| MTL Manager | 7001 | Giao diện quản lý |
| pgAdmin4 | 7002 | Công cụ quản lý PostgreSQL |

Để thay đổi ports, chỉnh sửa file `docker-compose.yml`:

```yaml
services:
  postgres:
    ports:
      - "5432:5432"  # Thay đổi port bên ngoài (5432) nếu cần
  manager:
    ports:
      - "8080:3000"  # MTL Manager chạy ở port 8080
  pgadmin:
    ports:
      - "8081:80"     # pgAdmin4 chạy ở port 8081
```

---

## Đăng Nhập

### MTL Manager (http://localhost:7001)

1. Mở trình duyệt: **http://localhost:7001**
2. Nhập credentials từ `.env`:
   - **Username/Email**: Giá trị của `ADMIN_USERNAME`
   - **Password**: Giá trị của `ADMIN_PASSWORD`

### pgAdmin4 (http://localhost:7002)

1. Mở trình duyệt: **http://localhost:7002**
2. Nhập credentials từ `.env`:
   - **Email**: Giá trị của `PGADMIN_DEFAULT_EMAIL`
   - **Password**: Giá trị của `PGADMIN_PASSWORD`

---

## Sử Dụng MTL Manager

### Dashboard
- Xem tổng quan: số databases, users, dung lượng
- Trạng thái kết nối PostgreSQL
- Danh sách backups gần đây

### Quản lý Databases
- **Tạo database mới**: Click "Tạo mới" → Nhập tên database
- **Xem chi tiết**: Click vào database để xem tables, thông tin
- **Xóa database**: Click menu → "Xóa" (yêu cầu xác nhận)

### Quản lý Users
- **Tạo user mới**: Click "Tạo mới" → Nhập username, password
- **Phân quyền**: Chọn user → Grant/Revoke permissions
- **Đổi mật khẩu**: Click menu → "Đổi mật khẩu"

### Backup & Restore
- **Tạo backup**: Chọn database → "Sao lưu" → Đặt tên file
- **Xem lịch sử**: Mục "Lịch sử sao lưu"
- **Restore**: Chọn file backup → "Phục hồi"

---

## Kết Nối pgAdmin4

pgAdmin4 là công cụ quản lý PostgreSQL mạnh mẽ. Sau khi đăng nhập:

### Thêm Server mới

1. Click chuột phải vào **"Servers"** (panel trái)
2. Chọn **"Register"** → **"Server..."**

3. **Tab General**:
   - Name: `MTL PostgreSQL` (hoặc tên tùy chọn)

4. **Tab Connection**:
   ```
   Host name/address: mtl-postgresql
   Port: 5432
   Maintenance database: postgres
   Username: postgres
   Password: postgres123
   ```

5. Click **"Save"**

### Các thao tác trong pgAdmin4

- **Xem databases**: Mở rộng Server → Databases
- **Xem tables**: Database → Schemas → public → Tables
- **Chạy SQL**: Tools → Query Tool
- **Xem dữ liệu**: Click chuột phải vào table → View/Edit Data

---

## Khắc Phục Sự Cố

### Container không khởi động được

```bash
# Kiểm tra logs
docker-compose logs manager
docker-compose logs postgres
```

### Không đăng nhập được MTL Manager

1. Kiểm tra container đang chạy:
   ```bash
   docker ps | grep mtl-manager
   ```

2. Xóa SQLite database và restart:
   ```bash
   docker exec mtl-manager-postgresql rm -f /data/mtl-manager.db
   docker-compose restart manager
   ```

3. Chờ container khởi động lại và tạo admin mới

### Không đăng nhập được pgAdmin4

```bash
# Xóa pgAdmin database
docker exec mtl-pgadmin rm -f /var/lib/pgadmin/pgadmin4.db
docker-compose restart pgadmin
```

### PostgreSQL connection failed

1. Kiểm tra PostgreSQL container:
   ```bash
   docker ps | grep postgres
   ```

2. Kiểm tra logs:
   ```bash
   docker logs mtl-postgresql
   ```

3. Đảm bảo PostgreSQL healthy:
   ```bash
   docker inspect mtl-postgresql --format '{{.State.Health.Status}}'
   ```

### Xem tất cả logs

```bash
# Logs tất cả containers
docker-compose logs -f

# Logs container cụ thể
docker-compose logs -f manager
docker-compose logs -f postgres
```

### Reset hoàn toàn

```bash
# Dừng và xóa tất cả containers, volumes
docker-compose down -v

# Xóa data folder (nếu muốn xóa hoàn toàn dữ liệu)
rm -rf data/

# Khởi động lại
docker-compose up -d
```

---

## Data Persistence

Dữ liệu được lưu trong thư mục `data/`:
- `data/postgres/`: Database PostgreSQL
- `data/sqlite/`: SQLite database cho MTL Manager
- `data/pgadmin/`: Cấu hình pgAdmin4
- `backups/`: Các file backup

**Quan trọng**: Xóa thư mục `data/` sẽ mất toàn bộ dữ liệu!

---

## Lệnh Hữu Ích

```bash
# Khởi động
docker-compose up -d

# Dừng
docker-compose stop

# Xem logs
docker-compose logs -f

# Rebuild sau khi thay đổi code
docker-compose build manager
docker-compose up -d

# Xem resource usage
docker stats

# Truy cập PostgreSQL từ terminal
docker exec -it mtl-postgresql psql -U postgres
```

---

## License

Copyright 2026 MTL Technology. All rights reserved.
