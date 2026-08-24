# Розгортання

## GitHub

1. Створіть порожній репозиторій.
2. Перевірте `npm run check`.
3. Виконайте `git add .`, `git commit` та `git push`.

## Self-hosted Node.js

Сервер очікує Node.js 18+.

```bash
npm ci
npm start
```

Environment variables:

- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET=<довгий випадковий секрет>`

Перед production створіть адміністратора через:

```bash
npm run create-admin
```

## Reverse proxy

Для HTTPS рекомендується запускати Node.js за Nginx/Caddy/іншим reverse proxy та передавати весь HTTP-трафік на внутрішній порт Node.js.

У production cookie авторизації автоматично отримує прапорець `Secure`.

## Storage

Поточний storage — локальна файлова система:

- `data/db.json`
- `storage/uploads/`

Ці каталоги не повинні потрапляти до Git.

Для горизонтального масштабування або serverless потрібна зовнішня БД та object storage.


## Render: first administrator

Add the following Environment Variables in the Render service:

- `NODE_ENV` = `production`
- `JWT_SECRET` = a random secret of at least 32 characters
- `ADMIN_USERNAME` = your initial admin login
- `ADMIN_PASSWORD` = a strong initial password (at least 10 characters)

The application bootstraps the administrator only when no admin user exists. This avoids exposing a public "create admin" endpoint.

After deployment, open `/admin/` and sign in. Once logged in, use the Security section to change the password if needed.

### Health check

Use `/health` as the Render health check path if you want an explicit health endpoint.
