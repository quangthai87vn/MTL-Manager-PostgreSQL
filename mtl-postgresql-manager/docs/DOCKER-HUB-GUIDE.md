# Hướng Dẫn Push Docker Image Lên Registry (Docker Hub)

## Mục Lục
- [Chuẩn Bị](#chuẩn-bị)
- [Các Bước Push Lên Docker Hub](#các-bước-push-lên-docker-hub)
- [Sử Dụng Image Từ Docker Hub](#sử-dụng-image-từ-docker-hub)
- [Auto-Update với GitHub Actions](#auto-update-với-github-actions)
- [Quản Lý Image](#quản-lý-image)

---

## Chuẩn Bị

### 1. Tạo tài khoản Docker Hub

1. Truy cập https://hub.docker.com
2. Đăng ký tài khoản mới
3. Tạo repository cho project

### 2. Đăng nhập Docker Hub trên máy local

```bash
docker login
```

Nhập username và password khi được yêu cầu.

### 3. Kiểm tra Docker Hub username

```bash
docker info | grep Username
```

---

## Các Bước Push Lên Docker Hub

### Cách 1: Push thủ công

#### Bước 1: Build Docker image

```bash
cd mtl-postgresql-manager

# Build image với tag mới nhất
docker build -t mtl-postgresql-manager:latest .

# Hoặc build với version
docker build -t mtl-postgresql-manager:v1.0.0 .
```

#### Bước 2: Tag image cho Docker Hub

```bash
# Format: docker tag <image-name> <dockerhub-username>/<repository>:<tag>
docker tag mtl-postgresql-manager:latest your-dockerhub-username/mtl-postgresql-manager:latest

# Hoặc với version
docker tag mtl-postgresql-manager:v1.0.0 your-dockerhub-username/mtl-postgresql-manager:v1.0.0
```

#### Bước 3: Push lên Docker Hub

```bash
# Push latest
docker push your-dockerhub-username/mtl-postgresql-manager:latest

# Push version
docker push your-dockerhub-username/mtl-postgresql-manager:v1.0.0
```

### Cách 2: Sử dụng docker-compose build và tag

```bash
cd mtl-postgresql-manager

# Build với docker-compose
docker-compose build manager

# Tag image sau khi build
docker tag mtl-postgresql-manager-manager:latest your-dockerhub-username/mtl-postgresql-manager:latest

# Push
docker push your-dockerhub-username/mtl-postgresql-manager:latest
```

---

## Sử Dụng Image TỪ Docker Hub

### Trên máy khác hoặc server mới

#### Cách 1: Pull trực tiếp

```bash
# Pull image
docker pull your-dockerhub-username/mtl-postgresql-manager:latest

# Chạy container
docker run -d \
  --name mtl-postgresql-manager \
  -p 7001:3000 \
  -e POSTGRES_HOST=mtl-postgresql \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=postgres \
  -e ADMIN_USERNAME=admin@example.com \
  -e ADMIN_PASSWORD=admin123 \
  your-dockerhub-username/mtl-postgresql-manager:latest
```

#### Cách 2: Sử dụng docker-compose (Recommended)

Tạo file `docker-compose.yml` mới:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:18-alpine
    container_name: mtl-postgresql
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: postgres
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    ports:
      - "7000:5432"
    networks:
      - mtl-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  manager:
    image: your-dockerhub-username/mtl-postgresql-manager:latest
    container_name: mtl-manager-postgresql
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: file:/data/mtl-manager.db
      POSTGRES_HOST: mtl-postgresql
      POSTGRES_PORT: 5432
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_DB: postgres
      SESSION_SECRET: your-secret-key
      ADMIN_USERNAME: admin@example.com
      ADMIN_PASSWORD: admin123
    volumes:
      - ./data/sqlite:/data
      - ./backups:/backups
    ports:
      - "7001:3000"
    networks:
      - mtl-network
    restart: unless-stopped
    user: root

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: mtl-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin123
    volumes:
      - ./data/pgadmin:/var/lib/pgadmin
    ports:
      - "7002:80"
    networks:
      - mtl-network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

networks:
  mtl-network:
    driver: bridge
```

Sau đó chạy:

```bash
docker-compose up -d
```

---

## Auto-Update với GitHub Actions

### Tạo GitHub Actions Workflow

Tạo file `.github/workflows/docker-publish.yml`:

```yaml
name: Build and Push to Docker Hub

on:
  push:
    branches:
      - main
    tags:
      - 'v*'
  pull_request:
    branches:
      - main

env:
  REGISTRY: docker.io
  IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/mtl-postgresql-manager

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push with Buildx
        uses: docker/build-push-action@v5
        with:
          context: ./mtl-postgresql-manager
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Thêm Secrets vào GitHub

1. Truy cập GitHub repository → Settings → Secrets and variables → Actions
2. Thêm các secrets:
   - `DOCKERHUB_USERNAME`: Username Docker Hub
   - `DOCKERHUB_TOKEN`: Docker Hub Access Token (tạo ở https://hub.docker.com/settings/security)

### Trigger Auto-Build

- **Push lên main**: Build và push automatically
- **Tag version**: `git tag v1.0.0 && git push --tags`

---

## Quản Lý Image

### Liệt kê các image đã push

Truy cập https://hub.docker.com/repository/docker/your-username/mtl-postgresql-manager

### Xóa image cũ trên local

```bash
# Liệt kê images
docker images

# Xóa image cũ
docker rmi your-dockerhub-username/mtl-postgresql-manager:old-tag
docker rmi mtl-postgresql-manager:old-tag
```

### Pull phiên bản mới nhất

```bash
docker pull your-dockerhub-username/mtl-postgresql-manager:latest
```

### Update container lên version mới

```bash
# Pull image mới
docker pull your-dockerhub-username/mtl-postgresql-manager:latest

# Stop và xóa container cũ
docker-compose down

# Start lại với image mới
docker-compose up -d
```

---

## Multi-Platform Build (Optional)

Nếu muốn build image cho nhiều platform (amd64, arm64):

```bash
# Enable Docker experimental features hoặc use buildx
docker buildx create --use
docker buildx inspect --bootstrap

# Build cho multi-platform
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag your-dockerhub-username/mtl-postgresql-manager:latest \
  --push \
  .
```

---

## Best Practices

### 1. Sử dụng Version Tags
```bash
# Luôn tag version cụ thể
docker build -t mtl-postgresql-manager:1.0.0 .
docker tag mtl-postgresql-manager:1.0.0 your-username/mtl-postgresql-manager:1.0.0
docker push your-username/mtl-postgresql-manager:1.0.0
```

### 2. Giữ cả latest và version tags
```bash
# Sau khi push version
docker tag your-username/mtl-postgresql-manager:1.0.0 your-username/mtl-postgresql-manager:latest
docker push your-username/mtl-postgresql-manager:latest
```

### 3. Security
- Không push image với password hardcoded
- Sử dụng environment variables
- Quét image với Trivy trước khi push:
```bash
trivy image your-username/mtl-postgresql-manager:latest
```

### 4. Optimize Image Size
```bash
# Sử dụng multi-stage build
# Xem Dockerfile trong project đã có sẵn
```

---

## Troubleshooting

### "denied: requested access to the resource is denied"

Kiểm tra:
```bash
# Đăng nhập lại
docker logout
docker login

# Kiểm tra username
docker info | grep Username
```

### "net/http: request canceled"

```bash
# Tăng timeout
export DOCKER_CLI_HIGHLIGHT="400"
docker push your-username/mtl-postgresql-manager:latest
```

### "manifest unknown"

Image chưa được push hoặc tag sai:
```bash
# Kiểm tra image tồn tại
docker images | grep mtl-postgresql

# Push lại
docker push your-username/mtl-postgresql-manager:tag
```

---

## License

Copyright 2026 MTL Technology. All rights reserved.
