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
