const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'package.json',
  '.gitignore',
  '.env.example',
  'server/server.js',
  'public/index.html',
  'public/404.html',
  'public/admin/index.html',
  'public/assets/js/site.js',
  'public/assets/js/admin.js',
  'public/pages/about.html',
  'public/pages/groups.html',
  'public/pages/team.html',
  'public/pages/menu.html',
  'public/pages/gallery.html',
  'public/pages/documents.html',
  'public/pages/news.html',
  'public/pages/faq.html',
  'public/pages/contacts.html',
  'scripts/create-admin.js',
];

const forbiddenPaths = [
  '.env',
  'node_modules',
  'create-admin.bat',
  'diagnose.bat',
  'open-admin.bat',
  'setup-local.bat',
  'start-local.bat',
  'stop-local.bat',
  'verify-local.bat',
  'scripts/init-local.js',
  'scripts/setup-local.js',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
const forbidden = forbiddenPaths.filter((file) => fs.existsSync(path.join(root, file)));

if (missing.length || forbidden.length) {
  console.error('SELF-CHECK FAILED');

  if (missing.length) {
    console.error('\\nMissing:');
    missing.forEach((file) => console.error(`- ${file}`));
  }

  if (forbidden.length) {
    console.error('\\nForbidden/local-only files:');
    forbidden.forEach((file) => console.error(`- ${file}`));
  }

  process.exit(1);
}

const jsFiles = [
  'server/server.js',
  'scripts/create-admin.js',
  'scripts/self-check.js',
  'public/assets/js/site.js',
  'public/assets/js/admin.js',
];

for (const file of jsFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = spawnSync(
    process.execPath,
    ['--check', ...(file.startsWith('public/') ? [] : [path.join(root, file)])],
    {
      input: file.startsWith('public/') ? source : undefined,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    console.error(`Syntax error in ${file}\n${result.stderr}`);
    process.exit(1);
  }
}

console.log('SELF-CHECK OK');
console.log(`Checked ${requiredFiles.length} required files and ${jsFiles.length} JavaScript files.`);
