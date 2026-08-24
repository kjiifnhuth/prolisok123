require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'db.backup.json');
const UPLOAD_DIR = path.join(ROOT, 'storage', 'uploads');

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (
  IS_PRODUCTION ? '' : crypto.randomBytes(32).toString('hex')
);
const BOOTSTRAP_ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || '').trim().slice(0, 80);
const BOOTSTRAP_ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '');

if (IS_PRODUCTION && JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured in production and contain at least 32 characters.');
}
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 20;

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.ppt', '.pptx', '.txt',
]);

const CONTENT_TYPES = new Set([
  'news', 'team', 'groups', 'menu', 'gallery', 'documents', 'faq', 'about',
]);

const PAGE_ROUTES = Object.freeze({
  '/about': 'about.html',
  '/groups': 'groups.html',
  '/team': 'team.html',
  '/menu': 'menu.html',
  '/gallery': 'gallery.html',
  '/documents': 'documents.html',
  '/news': 'news.html',
  '/faq': 'faq.html',
  '/contacts': 'contacts.html',
});

const APPLICATION_STATUSES = new Set(['new', 'in_progress', 'done']);

const DEFAULT_SETTINGS = Object.freeze({
  siteName: 'ЦРД «Пролісок»',
  city: 'смт Макарів',
  phone: '+38 (0XX) XXX-XX-XX',
  email: 'prolisok@makariv.gov.ua',
  workingHours: 'Пн–Пт: 07:30–18:00',
  heroTitle: 'Затишний дитячий садок для щасливого зростання',
  heroSub: 'У ЦРД «Пролісок» ми створюємо простір, де кожна дитина почувається в безпеці, розкриває свої таланти та знаходить перших справжніх друзів.',
});

for (const directory of [DATA_DIR, UPLOAD_DIR]) {
  fs.mkdirSync(directory, { recursive: true });
}

function createEmptyDatabase() {
  return {
    settings: { general: { ...DEFAULT_SETTINGS } },
    admin_users: [],
    content_items: [],
    applications: [],
    files: [],
  };
}

function writeDatabase(database) {
  const tempFile = `${DB_FILE}.tmp`;
  const serialized = JSON.stringify(database, null, 2);

  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, BACKUP_FILE);
  }

  fs.writeFileSync(tempFile, serialized, 'utf8');
  fs.renameSync(tempFile, DB_FILE);
}

function readDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const database = createEmptyDatabase();
    writeDatabase(database);
    return database;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const defaults = createEmptyDatabase();

    return {
      ...defaults,
      ...parsed,
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
        general: {
          ...defaults.settings.general,
          ...(parsed.settings?.general || {}),
        },
      },
      admin_users: Array.isArray(parsed.admin_users) ? parsed.admin_users : [],
      content_items: Array.isArray(parsed.content_items) ? parsed.content_items : [],
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
      files: Array.isArray(parsed.files) ? parsed.files : [],
    };
  } catch (error) {
    throw new Error(`Не вдалося прочитати локальну БД: ${error.message}`);
  }
}

let db = readDatabase();

async function ensureBootstrapAdmin() {
  if (db.admin_users.length > 0) return;

  if (!BOOTSTRAP_ADMIN_USERNAME && !BOOTSTRAP_ADMIN_PASSWORD) {
    console.warn('[AUTH] No admin user exists. Set ADMIN_USERNAME and ADMIN_PASSWORD in the hosting environment to create the first administrator.');
    return;
  }

  if (!BOOTSTRAP_ADMIN_USERNAME || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be provided together when bootstrapping the first administrator.');
  }

  if (BOOTSTRAP_ADMIN_PASSWORD.length < 10) {
    throw new Error('ADMIN_PASSWORD must contain at least 10 characters.');
  }

  const passwordHash = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 12);

  db.admin_users.push({
    id: createId(),
    username: BOOTSTRAP_ADMIN_USERNAME,
    password_hash: passwordHash,
    active: true,
    created_at: now(),
    updated_at: now(),
  });

  save();
  console.log(`[AUTH] Bootstrap administrator created: ${BOOTSTRAP_ADMIN_USERNAME}`);
}

const save = () => writeDatabase(db);
const now = () => new Date().toISOString();
const createId = () => `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
const cleanSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '');
const isValidContentType = (type) => CONTENT_TYPES.has(type);

function seedDatabase() {
  if (db.content_items.length) return;

  const addItem = (type, title, data, published = true, sortOrder = 0, slug = '') => {
    db.content_items.push({
      id: createId(),
      type,
      title,
      slug: cleanSlug(slug || title),
      data,
      published,
      sort_order: sortOrder,
      created_at: now(),
      updated_at: now(),
    });
  };

  addItem('news', 'Свято врожаю та осінній ярмарок', {
    date: '2026-08-20',
    excerpt: 'Наші вихованці готують тематичні вироби та танцювальні номери.',
    text: 'Наші вихованці готують тематичні вироби та танцювальні номери.',
    icon: '🌾',
  }, true, 0);
  addItem('news', 'Тиждень творчості та малювання', {
    date: '2026-08-15',
    excerpt: 'Діти створювали великий спільний плакат та пробували нові техніки.',
    text: 'Діти створювали великий спільний плакат та пробували нові техніки.',
    icon: '🎨',
  }, true, 1);
  addItem('news', 'Зустріч з рятувальниками ДСНС', {
    date: '2026-08-10',
    excerpt: 'В ігровій формі діти повторили правила безпеки життєдіяльності.',
    text: 'В ігровій формі діти повторили правила безпеки життєдіяльності.',
    icon: '🚒',
  }, true, 2);

  addItem('team', 'Світлана Петрівна', {
    role: 'Директор закладу',
    desc: 'Досвід роботи в освіті понад 15 років.',
    icon: '👩‍🏫',
  }, true, 0);
  addItem('team', 'Наталія Іванівна', {
    role: 'Вихователь-методист',
    desc: 'Координатор сучасних освітніх програм.',
    icon: '👩‍🎨',
  }, true, 1);
  addItem('team', 'Ольга Володимирівна', {
    role: 'Практичний психолог',
    desc: 'Супровід адаптації та емоційного розвитку.',
    icon: '👩‍⚕️',
  }, true, 2);
  addItem('team', 'Марія Василівна', {
    role: 'Музичний керівник',
    desc: 'Розвиток творчих здібностей та вокалу.',
    icon: '🎵',
  }, true, 3);

  addItem('groups', '«Карапузи»', {
    age: '2 - 3 роки',
    desc: 'М’яка адаптація, сенсорика, мовлення та розвиток дрібної моторики.',
    icon: '🐥',
  }, true, 0);
  addItem('groups', '«Чомучки»', {
    age: '3 - 5 років',
    desc: 'Соціалізація, творчість, логіка та ігрова англійська мова.',
    icon: '🎈',
  }, true, 1);
  addItem('groups', '«Знайки»', {
    age: '5 - 6 років',
    desc: 'Комплексна підготовка до школи, читання, письмо та логіка.',
    icon: '🚀',
  }, true, 2);

  addItem('menu', 'Каша молочна вівсяна з маслом', { weight: '200 г' }, true, 0);
  addItem('menu', 'Сирники запечені зі сметаною', { weight: '120 г' }, true, 1);
  addItem('menu', 'Чай з лимоном (несолодкий)', { weight: '180 мл' }, true, 2);
  addItem('menu', 'Фрукти сезонні (яблуко/банан)', { weight: '100 г' }, true, 3);

  addItem('faq', 'Які документи необхідні для зарахування дитини?', {
    answer: 'Для зарахування необхідні: заява батьків, медична довідка дитини, копія свідоцтва про народження та довідка про щеплення.',
  }, true, 0);
  addItem('faq', 'Як організовано безпеку під час повітряної тривоги?', {
    answer: 'Заклад має власне укриття та організований алгоритм дій персоналу під час тривоги.',
  }, true, 1);

  save();
}

seedDatabase();

function ensureAboutPageContent() {
  const existing = db.content_items.find((item) => item.type === 'about' && item.slug === 'about-page');
  if (existing) return;

  db.content_items.push({
    id: createId(),
    type: 'about',
    title: 'Про нас',
    slug: 'about-page',
    data: {
      heroEyebrow: 'Про наш садок',
      heroTitle: 'Місце, де дитинство має свій ритм.',
      heroText: '«Пролісок» — простір турботи, розвитку та щирого дитячого спілкування. Ми хочемо, щоб кожен ранок починався без поспіху, а кожен день залишав добрі спогади.',
      approachKicker: 'Наш підхід',
      approachTitle: 'Не просто догляд — партнерство з родиною.',
      approachText: 'Ми уважно слухаємо дітей і батьків, створюємо зрозумілий режим та підтримуємо самостійність дитини.',
      bullets: 'Дбайлива адаптація до садочка\nЗаняття за віком та інтересами\nЩоденний рух і свіже повітря\nКомунікація з батьками без зайвої бюрократії',
      quote: '«Дитина вчиться найкраще тоді, коли їй цікаво, спокійно й безпечно.»',
      quoteAuthor: 'Наш принцип роботи',
      valuesKicker: 'Наші цінності',
      valuesTitle: 'Три речі, на яких тримається «Пролісок»',
      value1Icon: '♡', value1Title: 'Повага', value1Text: 'До темпу, характеру, почуттів та маленьких особистих меж кожної дитини.',
      value2Icon: '☼', value2Title: 'Турбота', value2Text: 'Тепла атмосфера та дорослі, до яких можна звернутися у будь-якій ситуації.',
      value3Icon: '✦', value3Title: 'Цікавість', value3Text: 'Навчання через дослідження, гру, творчість і реальні щоденні відкриття.',
    },
    published: true,
    sort_order: 0,
    created_at: now(),
    updated_at: now(),
  });
  save();
}

ensureAboutPageContent();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

function sendPage(file) {
  return (req, res) => {
    res.setHeader('X-Prolisok-Page', file);
    res.sendFile(path.join(PUBLIC_DIR, 'pages', file));
  };
}

for (const [route, file] of Object.entries(PAGE_ROUTES)) {
  const handler = sendPage(file);
  app.get(route, handler);
  app.get(`${route}/`, handler);
}

app.get('/news/:slug', sendPage('news-detail.html'));

app.use('/uploads', express.static(UPLOAD_DIR, {
  fallthrough: false,
  index: false,
}));
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html'],
  index: 'index.html',
  etag: true,
  maxAge: IS_PRODUCTION ? '7d' : 0,
}));

function sanitizeUploadBaseName(originalName) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, extension)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return {
    extension,
    baseName: baseName || 'file',
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const { extension, baseName } = sanitizeUploadBaseName(file.originalname);
    const uniquePart = crypto.randomBytes(4).toString('hex');
    callback(null, `${Date.now()}-${uniquePart}-${baseName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return callback(new Error(`Недозволений тип файлу: ${extension || 'невідомий'}`));
    }
    callback(null, true);
  },
});

const loginAttempts = new Map();

function auth(req, res, next) {
  const token = req.cookies.prolisok_admin;
  if (!token) return res.status(401).json({ error: 'Не авторизовано' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Сесія завершилась. Увійдіть знову.' });
  }
}

function signedToken(username) {
  return jwt.sign(
    { sub: username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '8h' },
  );
}

function sortContentItems(items) {
  return items.sort((a, b) => (
    Number(a.sort_order || 0) - Number(b.sort_order || 0)
  ) || String(b.created_at).localeCompare(String(a.created_at)));
}

function getContentItems(type, includeDrafts = false) {
  return sortContentItems(
    db.content_items.filter((item) => (
      item.type === type && (includeDrafts || item.published)
    )),
  );
}

function uniqueSlug(type, requestedSlug, currentId = '') {
  const base = cleanSlug(requestedSlug) || 'item';
  const usedSlugs = new Set(
    db.content_items
      .filter((item) => item.type === type && item.id !== currentId)
      .map((item) => item.slug),
  );

  if (!usedSlugs.has(base)) return base;

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (usedSlugs.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

function sanitizeRichText(value = '') {
  const raw = String(value || '');
  if (!/<[a-z][^>]*>/i.test(raw)) return raw.slice(0, 200000);
  const allowedTags = new Set(['p','br','strong','b','em','i','u','s','del','mark','h2','h3','ul','ol','li','blockquote','a','span']);
  const allowedStyle = new Set(['color','background-color','font-family','font-size','text-align']);
  return raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[^>]*>/g, tag => {
    const close = tag.match(/^<\/\s*([a-z0-9]+)\s*>$/i);
    if (close) return allowedTags.has(close[1].toLowerCase()) ? `</${close[1].toLowerCase()}>` : '';
    const open = tag.match(/^<\s*([a-z0-9]+)([\s\S]*?)\/?\s*>$/i);
    if (!open) return '';
    const name = open[1].toLowerCase(); if (!allowedTags.has(name)) return '';
    const attrs = open[2] || ''; const out=[]; const re=/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g; let m;
    while ((m=re.exec(attrs))) {
      const attr=m[1].toLowerCase(); const val=String(m[2] ?? m[3] ?? m[4] ?? '');
      if(name==='a'&&attr==='href'&&/^(https?:|mailto:|tel:)/i.test(val)) out.push(`href="${val.replace(/"/g,'&quot;')}" rel="noopener noreferrer"`);
      if(name==='span'&&attr==='style') {
        const safe=val.split(';').map(x=>x.trim()).filter(Boolean).map(x=>x.split(':')).filter(([prop,v])=>prop&&v&&allowedStyle.has(prop.trim().toLowerCase())).map(([prop,v])=>`${prop.trim().toLowerCase()}:${v.trim().replace(/[<>"']/g,'')}`).join(';');
        if(safe) out.push(`style="${safe.replace(/"/g,'&quot;')}"`);
      }
    }
    return `<${name}${out.length?' '+out.join(' '):''}>`;
  }).slice(0,220000);
}

function sanitizeContentData(type, data = {}) {
  const source = { ...data };
  if (type === 'news') {
    source.text = sanitizeRichText(source.text || '');
  }
  if (type === 'about') {
    for (const key of ['heroText', 'approachText', 'quote', 'value1Text', 'value2Text', 'value3Text']) {
      source[key] = sanitizeRichText(source[key] || '');
    }
  }
  return source;
}

function validateContentItem(type, item) {
  if (!String(item.title || '').trim()) return 'Заголовок обов’язковий.';
  if (type === 'news' && !item.data?.text && !item.data?.excerpt) {
    return 'Для новини потрібен текст або короткий опис.';
  }
  if (type === 'gallery' && !item.data?.imageUrl && !item.data?.icon) {
    return 'Для фото потрібне зображення.';
  }
  if (type === 'documents' && !item.data?.url) {
    return 'Для документа потрібно завантажити файл або вказати URL.';
  }
  return null;
}

function verifyDraftAccess(req) {
  const token = req.cookies.prolisok_admin;
  if (!token) return false;

  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: IS_PRODUCTION ? 'production' : 'local',
    database: 'json',
    uptime: process.uptime(),
    time: now(),
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'prolisok' });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = String(username || '').trim().slice(0, 80);
  const key = `${req.ip}:${normalizedUsername}`;
  const attempt = loginAttempts.get(key) || { count: 0, until: 0 };

  if (attempt.until > Date.now()) {
    return res.status(429).json({ error: 'Забагато спроб. Спробуйте пізніше.' });
  }

  const user = db.admin_users.find((item) => (
    item.username === normalizedUsername && item.active !== false
  ));
  const validPassword = user
    ? await bcrypt.compare(String(password || ''), user.password_hash)
    : false;

  if (!user || !validPassword) {
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.until = Date.now() + 10 * 60 * 1000;
      attempt.count = 0;
    }

    loginAttempts.set(key, attempt);
    return res.status(401).json({ error: 'Невірний логін або пароль' });
  }

  loginAttempts.delete(key);
  res.cookie('prolisok_admin', signedToken(normalizedUsername), {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/',
  });

  return res.json({ ok: true, username: normalizedUsername });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('prolisok_admin', {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ authenticated: true, username: req.admin.sub });
});

app.put('/api/auth/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const nextPassword = String(newPassword || '');

  if (nextPassword.length < 10) {
    return res.status(400).json({
      error: 'Новий пароль має містити щонайменше 10 символів.',
    });
  }

  const user = db.admin_users.find((item) => item.username === req.admin.sub);
  if (!user) return res.status(404).json({ error: 'Адміністратора не знайдено.' });

  const validCurrentPassword = await bcrypt.compare(
    String(currentPassword || ''),
    user.password_hash,
  );
  if (!validCurrentPassword) {
    return res.status(401).json({ error: 'Поточний пароль неправильний.' });
  }

  user.password_hash = await bcrypt.hash(nextPassword, 12);
  user.updated_at = now();
  save();

  res.json({ ok: true });
});

app.post('/api/applications', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const message = String(req.body?.message || '').trim();

  if (name.length < 2) return res.status(400).json({ error: 'Вкажіть ім’я та прізвище.' });
  if (phone.length < 5) return res.status(400).json({ error: 'Вкажіть коректний номер телефону.' });
  if (message.length > 4000) return res.status(400).json({ error: 'Повідомлення занадто довге.' });

  const application = {
    id: createId(),
    name,
    phone,
    message,
    status: 'new',
    created_at: now(),
  };

  db.applications.unshift(application);
  save();

  res.status(201).json({ ok: true, application });
});

app.get('/api/applications', auth, (_req, res) => {
  const applications = db.applications
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(applications);
});

app.put('/api/applications/:id', auth, (req, res) => {
  const status = String(req.body?.status || '');
  if (!APPLICATION_STATUSES.has(status)) {
    return res.status(400).json({ error: 'Невірний статус заявки.' });
  }

  const application = db.applications.find((item) => item.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'Заявку не знайдено.' });

  application.status = status;
  application.updated_at = now();
  save();

  res.json(application);
});

app.delete('/api/applications/:id', auth, (req, res) => {
  const originalLength = db.applications.length;
  db.applications = db.applications.filter((item) => item.id !== req.params.id);

  if (db.applications.length === originalLength) {
    return res.status(404).json({ error: 'Заявку не знайдено.' });
  }

  save();
  res.json({ ok: true });
});

app.get('/api/settings/general', (_req, res) => {
  res.json(db.settings.general || {});
});

app.put('/api/settings/general', auth, (req, res) => {
  db.settings.general = {
    ...DEFAULT_SETTINGS,
    ...db.settings.general,
    ...(req.body || {}),
  };
  save();
  res.json(db.settings.general);
});

app.get('/api/about', (req, res) => {
  const includeDrafts = req.query.all === 'true';
  if (includeDrafts && !verifyDraftAccess(req)) {
    return res.status(401).json({ error: 'Не авторизовано' });
  }
  res.json(getContentItems('about', includeDrafts));
});

app.put('/api/about/:id', auth, (req, res) => {
  const item = db.content_items.find((entry) => entry.id === req.params.id && entry.type === 'about');
  if (!item) return res.status(404).json({ error: 'Сторінку «Про нас» не знайдено.' });

  const body = req.body || {};
  const updatedItem = {
    ...item,
    title: String(body.title || 'Про нас').trim() || 'Про нас',
    slug: 'about-page',
    data: sanitizeContentData('about', body.data || {}),
    published: body.published !== false,
    sort_order: Number(body.sort_order || 0),
    updated_at: now(),
  };

  const validationError = validateContentItem('about', updatedItem);
  if (validationError) return res.status(400).json({ error: validationError });

  Object.assign(item, updatedItem);
  save();
  res.json(item);
});

app.get('/api/content/:type', (req, res) => {
  const { type } = req.params;
  if (!isValidContentType(type)) {
    return res.status(404).json({ error: 'Невідомий тип контенту.' });
  }

  const includeDrafts = req.query.all === 'true';
  if (includeDrafts && !verifyDraftAccess(req)) {
    return res.status(401).json({ error: 'Не авторизовано' });
  }

  res.json(getContentItems(type, includeDrafts));
});

app.get('/api/content/:type/:slug', (req, res) => {
  const { type, slug } = req.params;
  if (!isValidContentType(type)) {
    return res.status(404).json({ error: 'Невідомий тип контенту.' });
  }

  const item = getContentItems(type).find((entry) => (
    entry.slug === slug || entry.id === slug
  ));
  if (!item) return res.status(404).json({ error: 'Не знайдено' });

  res.json(item);
});

app.post('/api/content/:type', auth, (req, res) => {
  const { type } = req.params;
  if (!isValidContentType(type)) {
    return res.status(404).json({ error: 'Невідомий тип контенту.' });
  }

  const body = req.body || {};
  const item = {
    id: createId(),
    type,
    title: String(body.title || '').trim(),
    slug: uniqueSlug(type, body.slug || body.title),
    data: sanitizeContentData(type, body.data || {}),
    published: body.published !== false,
    sort_order: Number(body.sort_order || 0),
    created_at: now(),
    updated_at: now(),
  };

  const validationError = validateContentItem(type, item);
  if (validationError) return res.status(400).json({ error: validationError });

  db.content_items.push(item);
  save();

  res.status(201).json(item);
});

app.put('/api/content/:type/:id', auth, (req, res) => {
  const { type, id } = req.params;
  if (!isValidContentType(type)) {
    return res.status(404).json({ error: 'Невідомий тип контенту.' });
  }

  const item = db.content_items.find((entry) => entry.id === id && entry.type === type);
  if (!item) return res.status(404).json({ error: 'Не знайдено' });

  const body = req.body || {};
  const updatedItem = {
    ...item,
    title: String(body.title || '').trim(),
    slug: uniqueSlug(type, body.slug || body.title, item.id),
    data: sanitizeContentData(type, body.data || {}),
    published: body.published !== false,
    sort_order: Number(body.sort_order || 0),
    updated_at: now(),
  };

  const validationError = validateContentItem(type, updatedItem);
  if (validationError) return res.status(400).json({ error: validationError });

  Object.assign(item, updatedItem);
  save();

  res.json(item);
});

app.delete('/api/content/:type/:id', auth, (req, res) => {
  const { type, id } = req.params;
  const originalLength = db.content_items.length;
  db.content_items = db.content_items.filter((item) => !(item.id === id && item.type === type));

  if (db.content_items.length === originalLength) {
    return res.status(404).json({ error: 'Не знайдено' });
  }

  save();
  res.json({ ok: true });
});

app.get('/api/files', auth, (_req, res) => {
  const files = db.files
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  res.json(files);
});

app.post('/api/files/upload', auth, upload.array('files', MAX_FILES_PER_REQUEST), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Файли не вибрано.' });

  const uploadedFiles = req.files.map((file) => {
    const record = {
      id: createId(),
      name: file.originalname,
      path: file.filename,
      mime_type: file.mimetype,
      size: file.size,
      url: `/uploads/${encodeURIComponent(file.filename)}`,
      created_at: now(),
    };

    db.files.push(record);
    return record;
  });

  save();
  res.status(201).json(uploadedFiles);
});

app.delete('/api/files/:id', auth, (req, res) => {
  const index = db.files.findIndex((file) => file.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Не знайдено' });

  const file = db.files[index];
  const absolutePath = path.resolve(UPLOAD_DIR, file.path);
  const uploadRoot = `${UPLOAD_DIR}${path.sep}`;

  if (!absolutePath.startsWith(uploadRoot)) {
    return res.status(400).json({ error: 'Небезпечний шлях файлу.' });
  }

  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
  db.files.splice(index, 1);
  save();

  res.json({ ok: true });
});

app.get('/admin', (_req, res) => res.redirect(301, '/admin/'));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint не знайдено.' });
  if (req.path.startsWith('/uploads/')) return res.status(404).send('Файл не знайдено.');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Метод не підтримується.' });
  return res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Файл завеликий. Максимум 50 МБ.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Максимум 20 файлів за раз.' });
    }
    return res.status(400).json({ error: `Помилка завантаження: ${error.message}` });
  }

  if (error?.message?.startsWith('Недозволений тип файлу')) {
    return res.status(415).json({ error: error.message });
  }

  console.error('[SERVER ERROR]', error);
  return res.status(500).json({ error: 'Внутрішня помилка сервера.' });
});

if (require.main === module) {
  let server;

  ensureBootstrapAdmin()
    .then(() => {
      server = app.listen(PORT, () => {
        console.log(`\nPROLISOK\nSite:  http://localhost:${PORT}\nAdmin: http://localhost:${PORT}/admin/\n`);
      });
    })
    .catch((error) => {
      console.error('[STARTUP ERROR]', error.message);
      process.exit(1);
    });

  function shutdown(signal) {
    console.log(`\n${signal}: saving data...`);
    save();
    if (server) {
      server.close(() => process.exit(0));
    } else {
      process.exit(0);
    }
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

module.exports = app;
