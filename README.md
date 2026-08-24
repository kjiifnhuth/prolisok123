# ЗДО «Пролісок» — сайт + CMS

GitHub-ready версія сайту ЗДО «Пролісок» з адаптивним frontend, Express API та простою JSON-базою для локального/невеликого self-hosted розгортання.

## Стек

- Node.js 18+
- Express 5
- Vanilla HTML/CSS/JavaScript
- `bcryptjs` для хешування паролів
- JWT + HTTP-only cookie для авторизації
- Multer для завантаження файлів

## Структура

```text
prolisok/
├── public/                 # сайт та адмін-панель
│   ├── assets/
│   ├── pages/
│   └── admin/
├── server/                 # Express server + API
├── scripts/                # ручні CLI-утиліти
├── data/                   # runtime JSON, не комітиться
├── storage/uploads/        # runtime uploads, не комітяться
├── supabase/               # SQL-схема для майбутньої міграції
├── docs/
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

## Запуск

1. Встановіть Node.js 18+.
2. Створіть локальний `.env` з `.env.example`.
3. Встановіть залежності:

```bash
npm install
```

4. Запустіть сервер:

```bash
npm start
```

Для розробки з автоматичним перезапуском:

```bash
npm run dev
```

Після запуску:

- сайт: `http://localhost:3000/`
- адмінка: `http://localhost:3000/admin/`

Перший запуск автоматично створює `data/db.json` із початковим контентом. Файл не входить до Git.

## Адміністратор

Після першого запуску створіть або змініть адміністратора:

```bash
npm run create-admin
```

Пароль має містити щонайменше 10 символів.

> Не використовуйте пароль з прикладів у реальному середовищі.

## Перевірка перед commit

```bash
npm run check
```

Перевірка контролює:

- наявність основних файлів;
- синтаксис JavaScript;
- відсутність локальних `.bat` automation-файлів;
- відсутність `.env` та `node_modules` у структурі проєкту.

## GitHub

Проєкт не містить:

- `node_modules/`;
- `.env`;
- локальної БД;
- backup-файлів БД;
- користувацьких upload-файлів;
- Windows `.bat` automation-скриптів;
- legacy-документації.

Перед першим push:

```bash
git init
git add .
git commit -m "chore: prepare project for GitHub"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY>
git push -u origin main
```

## Важливо про зберігання даних

Поточна реалізація використовує JSON-файл як runtime storage. Це зручно для локального запуску та невеликих self-hosted інсталяцій, але не підходить для serverless-платформ із ephemeral filesystem.

Для production із кількома інстансами сервера рекомендується винести:

- контент;
- заявки;
- адміністраторів;
- metadata файлів;
- uploads

у PostgreSQL/Supabase або іншу зовнішню БД та object storage.

SQL-схема для такої міграції вже збережена в `supabase/schema.sql`.

## Безпека

- `.env` не комітиться.
- JWT secret задається через environment variable.
- Паролі зберігаються тільки у вигляді bcrypt hash.
- Auth cookie — HTTP-only; у production автоматично вмикається `Secure`.
- Додані базові security headers.
- Завантаження файлів обмежене розміром, кількістю та типами.
- Runtime uploads та БД виключені з Git.

## Ліцензія

Власник проєкту може додати потрібну ліцензію перед публічним відкриттям репозиторію.


## Production admin bootstrap

On the first Render deployment, add these Environment Variables:

```text
NODE_ENV=production
JWT_SECRET=<long random secret, 32+ characters>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password, 10+ characters>
```

The server creates the first administrator automatically only when `admin_users` is empty. After the first successful deployment and login, you may remove `ADMIN_PASSWORD` from Render; the existing bcrypt password hash remains in the database.

Admin panel:

```text
https://<your-render-domain>/admin/
```

Health check:

```text
https://<your-render-domain>/health
```

> Note: the current JSON database and local uploads are suitable for a test/small deployment but are not durable on an ephemeral host. For production data persistence, migrate the database to PostgreSQL/Supabase and uploads to object storage.
