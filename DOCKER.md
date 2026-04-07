# Docker Deployment

This project includes a production-oriented Docker setup with:

- `app`: Laravel running on PHP-FPM
- `nginx`: public web server
- `queue-worker`: Laravel queue worker for async jobs and proctoring assembly
- `postgres`: primary database
- `redis`: cache and queue backend

## 1. Prepare env

Copy the example file:

```bash
cp .env.docker.example .env.docker
```

Generate an `APP_KEY` and paste it into `.env.docker`:

```bash
php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
```

## 2. Build and start

```bash
docker compose --env-file .env.docker up -d --build
```

## 3. Run migrations

```bash
docker compose --env-file .env.docker exec app php artisan migrate --force
```

If you want demo data:

```bash
docker compose --env-file .env.docker exec app php artisan db:seed --force
```

Telescope adds its own migration too, so after first install keep running the
same migrate command against the current database.

## 4. Open the app

By default:

```text
http://127.0.0.1:8080
```

For a server deployment behind a host Nginx reverse proxy, keep Docker bound to
`127.0.0.1:${APP_PORT}` and point your domain to the host server. Recommended
`.env.docker` values:

```env
APP_URL=https://olympiad-test.atu.kz
ASSET_URL=https://olympiad-test.atu.kz
APP_PORT=8080
SANCTUM_STATEFUL_DOMAINS=olympiad-test.atu.kz
SESSION_SECURE_COOKIE=true
```

Example host Nginx server block:

```nginx
server {
    listen 80;
    server_name olympiad-test.atu.kz;

    client_max_body_size 120m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
    }
}
```

After editing the host Nginx config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If SSL is terminated on the host Nginx, keep Laravel proxy-aware settings
enabled and rebuild the Docker Nginx image after config changes:

```bash
docker compose --env-file .env.docker up -d --build nginx app queue-worker
```

## 5. Queue worker

The queue worker runs as a separate container:

```bash
docker compose --env-file .env.docker logs -f queue-worker
```

This container is required for async proctoring assembly jobs.

## 6. Telescope

Telescope is installed, but for Docker it is disabled by default in
`.env.docker.example` to avoid extra overhead during peak exams.

To enable it temporarily:

```env
TELESCOPE_ENABLED=true
TELESCOPE_RECORD_ALL=true
TELESCOPE_PATH=telescope
TELESCOPE_ALLOWED_IPS=127.0.0.1,::1,<your-public-ip>/32
```

Then rebuild the PHP containers and run migrations:

```bash
docker compose --env-file .env.docker up -d --build app queue-worker
docker compose --env-file .env.docker exec app php artisan migrate --force
```

Open:

```text
https://your-domain/telescope
```

To keep the Telescope tables under control, prune old entries periodically:

```bash
docker compose --env-file .env.docker exec app php artisan telescope:prune --hours=48
```

## 7. Useful commands

Stop containers:

```bash
docker compose --env-file .env.docker down
```

Stop and remove volumes:

```bash
docker compose --env-file .env.docker down -v
```

Open a shell in the app container:

```bash
docker compose --env-file .env.docker exec app sh
```

## 8. Connect from pgAdmin on your PC

PostgreSQL is bound only to `127.0.0.1:5432` on the server host, so connect
through an SSH tunnel instead of opening the database to the internet.

Restart the database container after updating Compose:

```bash
docker compose --env-file .env.docker up -d postgres
```

Create an SSH tunnel from your PC:

```bash
ssh -L 5432:127.0.0.1:5432 <server-user>@<server-ip>
```

Then configure pgAdmin with:

```text
Host: 127.0.0.1
Port: 5432
Database: value of DB_DATABASE from .env.docker
Username: value of DB_USERNAME from .env.docker
Password: value of DB_PASSWORD from .env.docker
```
