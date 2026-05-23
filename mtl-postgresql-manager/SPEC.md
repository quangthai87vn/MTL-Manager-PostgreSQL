# SPEC: MTL PostgreSQL Manager

## 1. Overview

**Project:** mtl-postgresql-manager  
**Type:** PostgreSQL administration web application  
**Summary:** Quản lý PostgreSQL server qua giao diện web với Docker containers  
**Target:** Sysadmin, developer cần quản lý PostgreSQL không cần CLI

## 2. Architecture

### Containers

| Container | Name | Image | Port |
|-----------|------|-------|------|
| PostgreSQL Server | `mtl-postgresql` | postgres:18-alpine | 5432 (internal) |
| Manager App | `mtl-manager-postgresql` | Next.js custom | 3000 (internal) |

### Host Ports

| Service | Host Port |
|---------|-----------|
| PostgreSQL | 7000 |
| Manager App | 7001 |

### Volumes

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./data/postgres` | `/var/lib/postgresql/data` | PostgreSQL data |
| `./backups` | `/backups` | Backup files |
| `./data/sqlite` | `/data` | SQLite database |

### Internal Network

Docker network `mtl-network` để 2 containers giao tiếp nội bộ.

## 3. Database Schema (SQLite + Prisma)

### Tables

**AdminUser**
- `id`: String (UUID, PK)
- `username`: String (unique)
- `passwordHash`: String (bcrypt)
- `createdAt`: DateTime
- `updatedAt`: DateTime

**Session**
- `id`: String (UUID, PK)
- `userId`: String (FK → AdminUser)
- `expiresAt`: DateTime
- `createdAt`: DateTime

**AuditLog**
- `id`: String (UUID, PK)
- `action`: String (CREATE_DB, DELETE_DB, RENAME_DB, CREATE_USER, DELETE_USER, CHANGE_PASSWORD, GRANT_PERMISSION, RESTORE_DB, BACKUP_DB, DELETE_BACKUP, LOGIN, LOGOUT)
- `target`: String (database name or user name)
- `details`: String (JSON - extra info)
- `ipAddress`: String
- `userId`: String (FK → AdminUser)
- `createdAt`: DateTime

**BackupLog**
- `id`: String (UUID, PK)
- `filename`: String
- `databaseName`: String
- `fileSize`: BigInt (bytes)
- `status`: String (SUCCESS, FAILED)
- `errorMessage`: String (nullable)
- `userId`: String (FK → AdminUser)
- `createdAt`: DateTime

**RestoreLog**
- `id`: String (UUID, PK)
- `filename`: String
- `sourceDatabase`: String
- `targetDatabase`: String
- `mode`: String (NEW_DB, OVERWRITE)
- `status`: String (SUCCESS, FAILED)
- `errorMessage`: String (nullable)
- `userId`: String (FK → AdminUser)
- `createdAt`: DateTime

**AppSetting**
- `key`: String (PK)
- `value`: String (JSON)
- `updatedAt`: DateTime

## 4. API Routes

### Auth

- `POST /api/auth/login` — Đăng nhập
- `POST /api/auth/logout` — Đăng xuất
- `GET /api/auth/me` — Lấy thông tin user hiện tại

### Dashboard

- `GET /api/dashboard/stats` — Thống kê PostgreSQL

### Database Management

- `GET /api/databases` — List databases
- `POST /api/databases` — Create database
- `PATCH /api/databases/[name]` — Rename database
- `DELETE /api/databases/[name]` — Delete database

### User Management

- `GET /api/users` — List PostgreSQL users
- `POST /api/users` — Create user
- `PATCH /api/users/[username]` — Change password
- `DELETE /api/users/[username]` — Delete user

### Permission Management

- `POST /api/permissions/grant` — Grant permission
- `POST /api/permissions/revoke` — Revoke permission
- `GET /api/permissions/[database]` — List permissions

### Backup Management

- `GET /api/backups` — List backup files
- `POST /api/backups` — Create backup (pg_dump)
- `GET /api/backups/[filename]/download` — Download backup
- `DELETE /api/backups/[filename]` — Delete backup

### Restore Management

- `POST /api/restores/upload` — Upload backup file
- `POST /api/restores/restore` — Restore database
- `GET /api/restores/history` — Restore history

### Audit Log

- `GET /api/audit-logs` — List audit logs (paginated, filterable)

## 5. Page Routes

| Route | Description |
|-------|-------------|
| `/login` | Login page |
| `/` | Redirect to /dashboard |
| `/dashboard` | Dashboard với stats |
| `/databases` | Database management |
| `/users` | User management |
| `/permissions` | Permission management |
| `/backups` | Backup management |
| `/restores` | Restore management |
| `/audit-logs` | Audit log viewer |
| `/settings` | App settings |

## 6. UI Components

### Layout
- Sidebar navigation (collapsible)
- Header với user menu
- Main content area

### Pages
- Dashboard: Stats cards, charts, recent activity
- Database list: Table với search/filter/pagination
- User list: Table với search/filter
- Permission matrix: Grid view
- Backup list: Table + upload button
- Restore: Upload form + history table
- Audit logs: Table với filter theo action/date

### Components
- DataTable với search/filter/sort/pagination
- ConfirmationModal cho destructive actions
- StatusBadge (connected/disconnected/error)
- StatCard với icon
- EmptyState
- LoadingSkeleton
- Toast notifications

## 7. Security

### Password
- bcrypt với cost factor 12
- Password hash lưu trong SQLite, không bao giờ expose

### Session
- UUID session token
- httpOnly, secure, sameSite cookies
- Session expires sau 24h
- Middleware check auth cho tất cả routes trừ /login

### PostgreSQL Connection
- Dùng service name `mtl-postgresql` trong Docker network
- Password PostgreSQL từ env variable, không lưu trong code
- Tất cả queries dùng parameterized statements

### Validation
- Database name: chỉ alphanumeric + underscore, không quá 63 ký tự
- Username: chỉ alphanumeric + underscore, không quá 63 ký tự
- File upload: chỉ chấp nhận .sql, .dump, .backup

### Audit
- Mọi thao tác nguy hiểm đều log vào audit_logs

## 8. PostgreSQL Connection Config

```env
POSTGRES_HOST=mtl-postgresql
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<from env>
POSTGRES_DB=postgres
```

## 9. Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** SQLite (Prisma ORM)
- **Container:** Docker + docker-compose
- **Icons:** Lucide React

## 10. File Structure

```
mtl-postgresql-manager/
├── docker-compose.yml
├── Dockerfile
├── README.md
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── databases/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── permissions/page.tsx
│   │   │   ├── backups/page.tsx
│   │   │   ├── restores/page.tsx
│   │   │   ├── audit-logs/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...route]/route.ts
│   │   │   ├── dashboard/route.ts
│   │   │   ├── databases/route.ts
│   │   │   ├── databases/[name]/route.ts
│   │   │   ├── users/route.ts
│   │   │   ├── users/[username]/route.ts
│   │   │   ├── permissions/route.ts
│   │   │   ├── permissions/[database]/route.ts
│   │   │   ├── backups/route.ts
│   │   │   ├── backups/[filename]/route.ts
│   │   │   ├── restores/route.ts
│   │   │   └── audit-logs/route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── dashboard/
│   │   │   └── stats-cards.tsx
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── confirm-dialog.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── postgres.ts
│   │   ├── auth.ts
│   │   ├── audit.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── data/
│   └── sqlite/ (.gitkeep)
├── data/
│   └── postgres/ (.gitkeep)
└── backups/ (.gitkeep)
```

## 11. Acceptance Criteria

1. Docker compose up thành công cả 2 containers
2. Truy cập app ở localhost:7001, đăng nhập được
3. Dashboard hiển thị đúng PostgreSQL status, db count, user count, size
4. Tạo, xóa, đổi tên database hoạt động
5. Tạo, xóa user, đổi password hoạt động
6. Grant/revoke permission hoạt động
7. Backup tạo file .dump trong /backups
8. Restore upload file và restore được
9. Audit log ghi đầy đủ các thao tác
10. Confirmation dialog cho delete/restore overwrite
11. Mobile responsive

## 12. Build & Run Commands

```bash
# Build
docker compose build

# Run
docker compose up -d

# Stop
docker compose down

# Logs
docker compose logs -f

# Shell vào manager app
docker compose exec mtl-manager-postgresql sh
```
