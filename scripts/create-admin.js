require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const bcrypt = require('bcryptjs');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

function createEmptyDatabase() {
  return {
    settings: { general: {} },
    admin_users: [],
    content_items: [],
    applications: [],
    files: [],
  };
}

function readDatabase() {
  if (!fs.existsSync(DB_FILE)) return createEmptyDatabase();

  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    throw new Error(`Не вдалося прочитати БД: ${error.message}`);
  }
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = readDatabase();
  const username = (await ask(`Admin username [${process.env.ADMIN_USERNAME || 'admin'}]: `)).trim()
    || process.env.ADMIN_USERNAME
    || 'admin';
  const password = await ask('Admin password (10+ chars): ');

  if (password.length < 10) {
    throw new Error('Пароль має містити щонайменше 10 символів.');
  }

  const existing = (db.admin_users || []).find((user) => user.username === username);
  const timestamp = new Date().toISOString();

  const user = {
    id: existing?.id || `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    username,
    password_hash: await bcrypt.hash(password, 12),
    active: true,
    created_at: existing?.created_at || timestamp,
    updated_at: timestamp,
  };

  db.admin_users = existing
    ? db.admin_users.map((item) => item.username === username ? user : item)
    : [...(db.admin_users || []), user];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Адміністратора «${username}» збережено.`);
}

main()
  .catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
