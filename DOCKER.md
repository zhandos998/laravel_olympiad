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

## 4. Open the app

By default:

```text
http://127.0.0.1:8080
```

## 5. Queue worker

The queue worker runs as a separate container:

```bash
docker compose --env-file .env.docker logs -f queue-worker
```

This container is required for async proctoring assembly jobs.

## 6. Useful commands

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
