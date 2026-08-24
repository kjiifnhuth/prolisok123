const API = '/api';
const state = { type: 'news', items: [], editing: null };
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
async function api(url, options = {}) {
const headers = options.body instanceof FormData ? { ...(options.headers || {}) } : { 'Content-Type': 'application/json', ...(options.headers || {}) };
const response = await fetch(API + url, { ...options, headers, credentials: 'same-origin' });
let data = null;
try { data = await response.json();
} catch {}
if (!response.ok) throw new Error(data?.error || `Помилка HTTP ${response.status}`);
return data;
}
function toast(message, tone = 'dark') {
const el = document.createElement('div');
el.textContent = message;
el.className = `fixed bottom-5 right-5 z-[200] px-5 py-3 rounded-xl font-bold shadow-xl text-white ${tone === 'error' ? 'bg-rose-600' : tone === 'success' ? 'bg-emerald-600' : 'bg-slate-950'}`;
document.body.appendChild(el);
setTimeout(() => el.remove(), 3000);
return el;
}
function field(name, label, value = '', type = 'text', placeholder = '') { return `<div><label class="block text-sm font-bold mb-1">${esc(label)}</label><input type="${type}" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}" class="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"></div>`;
}
function textarea(name, label, value = '') { return `<div><label class="block text-sm font-bold mb-1">${esc(label)}</label><textarea name="${esc(name)}" rows="6" class="w-full p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none">${esc(value)}</textarea></div>`;
}
function richEditor(name, label, value = '') {
const editorId = `rich-${name}`;
const source = String(value || '').trim();
const html = source ? (/<[a-z][^>]*>/i.test(source) ? source : `<p>${esc(source).replace(/\r?\n/g, '<br>')}</p>`) : '<p>Почніть писати текст новини…</p>';
return `<div class="rich-editor-wrap">
  <label class="block text-sm font-bold mb-1">${esc(label)}</label>
  <div class="rounded-2xl border border-slate-200 overflow-hidden bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
    <div class="rich-toolbar" role="toolbar" aria-label="Форматування тексту">
      <select data-rich-block title="Стиль абзацу" class="rich-select"><option value="p">Текст</option><option value="h2">Заголовок</option><option value="h3">Підзаголовок</option><option value="blockquote">Цитата</option></select>
      <select data-rich-font title="Шрифт" class="rich-select"><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Verdana">Verdana</option><option value="Tahoma">Tahoma</option></select>
      <button type="button" data-rich-cmd="bold" title="Жирний"><strong>B</strong></button>
      <button type="button" data-rich-cmd="italic" title="Курсив"><em>I</em></button>
      <button type="button" data-rich-cmd="underline" title="Підкреслений"><u>U</u></button>
      <button type="button" data-rich-cmd="strikeThrough" title="Закреслений"><s>S</s></button>
      <span class="rich-divider" aria-hidden="true"></span>
      <button type="button" data-rich-cmd="insertUnorderedList" title="Маркований список">•≡</button>
      <button type="button" data-rich-cmd="insertOrderedList" title="Нумерований список">1≡</button>
      <button type="button" data-rich-cmd="justifyLeft" title="По лівому краю">≡</button>
      <button type="button" data-rich-cmd="justifyCenter" title="По центру">≣</button>
      <button type="button" data-rich-cmd="justifyRight" title="По правому краю">≡</button>
      <span class="rich-divider" aria-hidden="true"></span>
      <label class="rich-color" title="Колір тексту"><span>A</span><input type="color" data-rich-color value="#20231f" aria-label="Колір тексту"></label>
      <label class="rich-color rich-highlight" title="Колір виділення"><span>▰</span><input type="color" data-rich-highlight value="#fff3a3" aria-label="Колір виділення"></label>
      <button type="button" data-rich-link title="Додати посилання">🔗</button>
      <button type="button" data-rich-cmd="removeFormat" title="Очистити форматування">Tx</button>
      <button type="button" data-rich-cmd="undo" title="Скасувати">↶</button>
      <button type="button" data-rich-cmd="redo" title="Повторити">↷</button>
    </div>
    <div id="${editorId}" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" data-rich-editor="${esc(name)}">${html}</div>
  </div>
  <textarea name="${esc(name)}" class="hidden" aria-hidden="true"></textarea>
  <p class="text-xs text-slate-500 mt-2">Можна форматувати текст, змінювати шрифт і колір, додавати списки, цитати та посилання.</p>
</div>`;
}
const labels = { news: 'Новини', team: 'Колектив', groups: 'Групи', menu: 'Харчування', gallery: 'Галерея', documents: 'Документи', faq: 'FAQ', about: 'Про нас' };
function ensureArchivePanel() {
if ($('#tab-archive')) return;
const main = document.querySelector('main');
if (!main) return;
const panel = document.createElement('div');
panel.id = 'tab-archive';
panel.className = 'tab';
main.appendChild(panel);
}
function nav() {
ensureArchivePanel();
const groups = [['dashboard','🏠 Dashboard'],['applications','📥 Заявки'],['archive','🗄 Архів'],['general','⚙️ Головна та контакти'],['about','📖 Про нас'],['news','📰 Новини'],['team','👩‍🏫 Колектив'],['groups','👶 Групи'],['menu','🍎 Харчування'],['gallery','🖼 Галерея'],['documents','📄 Документи'],['faq','❓ FAQ'],['files','📁 Файли'],['security','🔐 Безпека']];
$('#nav').innerHTML = groups.map(([id, label]) => `<button data-tab="${id}" class="nav-link w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-sm transition">${label}</button>`).join('');
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => showTab(button.dataset.tab));
}
function setActiveNav(id) { document.querySelectorAll('.nav-link').forEach(b => { const active = b.dataset.tab === id;
b.classList.toggle('bg-emerald-600', active);
b.classList.toggle('text-white', active);
b.classList.toggle('text-slate-300', !active);
});
}
async function showTab(id) {
document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
setActiveNav(id);
const target = ['about','news','team','groups','menu','gallery','documents','faq'].includes(id) ? 'content' : id;
const panel = $(`#tab-${target}`);
if (!panel) return;
panel.classList.add('active');
try { if (id === 'dashboard') await dashboard();
else if (id === 'applications') await applications();
else if (id === 'archive') await archiveApplications();
else if (id === 'general') await general();
else if (id === 'files') await files();
else if (id === 'security') security();
else await content(id);
} catch (error) { toast(error.message, 'error');
}
}
async function init() {
try { const me = await api('/auth/me');
$('#login').classList.add('hidden');
$('#app').classList.remove('hidden');
$('#adminUser').textContent = me.username;
nav();
showTab('dashboard');
}
catch { $('#login').classList.remove('hidden');
$('#app').classList.add('hidden');
}
}
$('#loginForm').onsubmit = async event => { event.preventDefault();
$('#loginButton').disabled = true;
$('#loginButton').textContent = 'Вхід...';
$('#loginError').classList.add('hidden');
try { await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }) });
$('#password').value = '';
await init();
} catch (error) { $('#loginError').textContent = error.message;
$('#loginError').classList.remove('hidden');
} finally { $('#loginButton').disabled = false;
$('#loginButton').textContent = 'Увійти';
} };
$('#logout').onclick = async () => { try { await api('/auth/logout', { method: 'POST' });
} finally { location.reload();
} };
async function dashboard() {
const types = Object.keys(labels);
const counts = await Promise.all(types.map(type => api(`/content/${type}`).then(items => items.length).catch(() => 0)));
const fileCount = await api('/files').then(x => x.length).catch(() => 0);
const applicationsList = await api('/applications').catch(() => []);
const activeApplications = applicationsList.filter(x => x.status !== 'done');
const newApplications = activeApplications.filter(x => x.status === 'new').length;
const inProgressApplications = activeApplications.filter(x => x.status === 'in_progress').length;
$('#tab-dashboard').innerHTML = `<div class="flex flex-col lg:flex-row justify-between lg:items-end gap-4 mb-8"><div><p class="text-emerald-600 font-black text-sm uppercase">Панель керування</p><h1 class="text-4xl font-black">Вітаємо, <span id="dashUser">${esc($('#adminUser').textContent || 'адміністратор')}</span></h1><p class="text-slate-500 mt-2">Керуйте сайтом ЦРД «Пролісок» в одному місці.</p></div><a href="/" target="_blank" class="inline-flex self-start bg-slate-900 text-white px-4 py-3 rounded-xl font-bold">Відкрити сайт ↗</a></div>
  <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
    ${types.slice(0,3).map((type,i)=>`<div class="bg-white rounded-2xl p-6 border"><div class="text-slate-500 text-sm font-bold">${labels[type]}</div><div class="text-3xl font-black mt-2">${counts[i]}</div></div>`).join('')}
    <button onclick="showTab('applications')" class="bg-white rounded-2xl p-6 border text-left hover:border-emerald-300 hover:shadow-md transition"><div class="flex items-center justify-between gap-3"><div class="text-slate-500 text-sm font-bold">Активні заявки</div><span class="text-xs font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">${activeApplications.length}</span></div><div class="text-3xl font-black mt-2">${activeApplications.length}</div><div class="text-xs text-slate-400 mt-1">Нових: ${newApplications} · У роботі: ${inProgressApplications}</div></button>
    <button onclick="showTab('archive')" class="bg-white rounded-2xl p-6 border text-left hover:border-slate-300 hover:shadow-md transition"><div class="flex items-center justify-between gap-3"><div class="text-slate-500 text-sm font-bold">Архів заявок</div><span class="text-xs font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600">${applicationsList.filter(x=>x.status==='done').length}</span></div><div class="text-3xl font-black mt-2">${applicationsList.filter(x=>x.status==='done').length}</div><div class="text-xs text-slate-400 mt-1">Виконані заявки</div></button>
    <div class="bg-white rounded-2xl p-6 border"><div class="text-slate-500 text-sm font-bold">Файли</div><div class="text-3xl font-black mt-2">${fileCount}</div></div>
  </div>
  <div class="bg-white rounded-2xl border p-6 mt-6"><div class="flex items-center justify-between gap-3 mb-4"><h2 class="font-black text-xl">Активні заявки</h2><button onclick="showTab('applications')" class="text-sm font-black text-emerald-700">Відкрити всі →</button></div>${activeApplications.length ? `<div class="space-y-3">${activeApplications.slice(0,5).map(item=>`<button onclick="showTab('applications')" class="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 transition"><div class="flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-black truncate">${esc(item.name)}</div><div class="text-sm text-slate-500 truncate">${esc(item.phone)}${item.message ? ' · ' + esc(item.message.slice(0,80)) : ''}</div></div><span class="text-xs font-black px-2 py-1 rounded-full ${item.status==='in_progress'?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}">${applicationStatuses[item.status] || item.status}</span></div></button>`).join('')}</div>` : '<div class="py-8 text-center text-slate-500">Активних заявок немає.</div>'}</div>
  <div class="bg-white rounded-2xl border p-6 mt-6"><h2 class="font-black text-xl mb-4">Швидкі дії</h2><div class="flex flex-wrap gap-3"><button onclick="showTab('news')" class="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold">+ Новина</button><button onclick="showTab('gallery')" class="px-4 py-3 rounded-xl bg-slate-900 text-white font-bold">+ Фото</button><button onclick="showTab('documents')" class="px-4 py-3 rounded-xl bg-slate-200 font-bold">+ Документ</button><button onclick="showTab('files')" class="px-4 py-3 rounded-xl bg-slate-200 font-bold">Файли</button></div></div>`;
}
async function general() { const settings = await api('/settings/general');
$('#tab-general').innerHTML = `<h1 class="text-3xl font-black mb-2">Головна та контакти</h1><p class="text-slate-500 mb-6">Редагуйте основну інформацію без зміни коду.</p><form id="generalForm" class="bg-white border rounded-2xl p-6 space-y-5"><div class="grid md:grid-cols-2 gap-5">${field('siteName','Назва сайту',settings.siteName)}${field('city','Місто',settings.city)}${field('phone','Телефон',settings.phone)}${field('email','Email',settings.email,'email')}${field('workingHours','Графік роботи',settings.workingHours)}</div><hr><h2 class="font-black text-xl">Hero</h2>${field('heroTitle','Заголовок',settings.heroTitle)}${textarea('heroSub','Підзаголовок',settings.heroSub)}${filePicker('heroImage','Фото / ілюстрація головного блоку',settings.heroImage || '','image/jpeg,image/png,image/webp,image/gif')}<button id="saveGeneral" class="bg-emerald-600 text-white font-black px-6 py-3 rounded-xl">Зберегти зміни</button></form>`;
const generalForm = $('#generalForm');
bindFilePickers(generalForm);
generalForm.onsubmit = async event => { event.preventDefault();
const button = $('#saveGeneral');
button.disabled = true;
try { await api('/settings/general', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
toast('Зміни збережено', 'success');
} catch (error) { toast(error.message, 'error');
} finally { button.disabled = false;
} };
}
function filePicker(name, label, current = '', accept = '*/*') { return `<div class="rounded-2xl border border-slate-200 p-4 space-y-3"><label class="block text-sm font-bold">${esc(label)}</label><div class="flex flex-col lg:flex-row gap-3"><input type="text" name="${esc(name)}" value="${esc(current)}" placeholder="URL або завантажте файл" class="flex-1 p-3 rounded-xl border border-slate-200"><input type="file" data-upload-target="${esc(name)}" accept="${esc(accept)}" class="block w-full lg:w-auto text-sm"></div><div data-upload-status="${esc(name)}" class="text-xs font-bold text-slate-500" aria-live="polite">Можна вибрати файл прямо з комп'ютера.</div><img data-upload-preview="${esc(name)}" src="${esc(current)}" alt="Попередній перегляд" class="${current && /\.(jpg|jpeg|png|webp|gif)$/i.test(current) ? '' : 'hidden'} max-h-40 rounded-xl object-contain border"></div>`;
}
function uploadFile(file, onProgress) { return new Promise((resolve, reject) => { const xhr = new XMLHttpRequest();
const fd = new FormData();
fd.append('files', file);
xhr.open('POST', API + '/files/upload');
xhr.withCredentials = true;
xhr.upload.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(Math.round(event.loaded / event.total * 100));
};
xhr.onload = () => { let data = null;
try { data = JSON.parse(xhr.responseText);
} catch {} if (xhr.status >= 200 && xhr.status < 300) resolve(data[0]);
else reject(new Error(data?.error || `Помилка HTTP ${xhr.status}`));
};
xhr.onerror = () => reject(new Error('Не вдалося підключитися до локального сервера.'));
xhr.send(fd);
});
}
function bindFilePickers(form) { form.querySelectorAll('[data-upload-target]').forEach(input => input.addEventListener('change', async () => { const file = input.files?.[0];
if (!file) return;
const target = input.dataset.uploadTarget;
const status = form.querySelector(`[data-upload-status="${target}"]`);
const preview = form.querySelector(`[data-upload-preview="${target}"]`);
try { status.textContent = 'Завантаження: 0%';
const fileRow = await uploadFile(file, percent => status.textContent = `Завантаження: ${percent}%`);
form.querySelector(`[name="${target}"]`).value = fileRow.url;
status.textContent = `Завантажено: ${fileRow.name}`;
status.className = 'text-xs font-bold text-emerald-700';
if (preview && /^image\//.test(fileRow.mime_type)) { preview.src = fileRow.url;
preview.classList.remove('hidden');
} } catch (error) { status.textContent = error.message;
status.className = 'text-xs font-bold text-rose-600';
toast(error.message, 'error');
} }));
}
function formFor(type, item = null) { const d = item?.data || {};
const hidden = item ? `<input type="hidden" name="id" value="${esc(item.id)}">` : '';
let extra = '';
if (type === 'news') extra = `${field('title','Заголовок',item?.title || '')}${field('slug','Slug',item?.slug || '')}${field('date','Дата',d.date || '', 'date')}${textarea('excerpt','Короткий опис для картки новини (не показується у повній новині)',d.excerpt || '')}${richEditor('text','Повний текст новини',d.text || '')}${filePicker('imageUrl','Головне фото',d.imageUrl || '','image/*')}${textarea('mediaUrls','Додаткові фото — по одному URL у рядку',d.mediaUrls || '')}${field('icon','Іконка, якщо без фото',d.icon || '📰')}`;
if (type === 'team') extra = `${field('title','ПІБ',item?.title || '')}${field('role','Посада',d.role || '')}${filePicker('imageUrl','Фото співробітника',d.imageUrl || '','image/jpeg,image/png,image/webp,image/gif')}${textarea('comment','Коментар від співробітника',d.comment || '')}${textarea('desc','Опис / додаткова інформація',d.desc || '')}${field('icon','Іконка, якщо без фото',d.icon || '👩‍🏫')}`;
if (type === 'groups') extra = `${field('title','Назва групи',item?.title || '')}${field('age','Вік',d.age || '')}${textarea('desc','Опис',d.desc || '')}${field('icon','Іконка',d.icon || '🐥')}`;
if (type === 'menu') extra = `${field('title','Назва страви',item?.title || '')}${field('weight','Вага',d.weight || '')}`;
if (type === 'gallery') extra = `${field('title','Назва / опис',item?.title || '')}${filePicker('imageUrl','Фотографія',d.imageUrl || '','image/jpeg,image/png,image/webp,image/gif')}${field('category','Категорія',d.category || 'events')}${field('icon','Іконка, якщо без фото',d.icon || '🖼️')}`;
if (type === 'documents') extra = `${field('title','Назва документа',item?.title || '')}${filePicker('url','Файл документа',d.url || '', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt')}${field('meta','Опис / розмір',d.meta || 'Документ')}${field('icon','Іконка',d.icon || '📄')}`;
if (type === 'faq') extra = `${field('title','Питання',item?.title || '')}${textarea('answer','Відповідь',d.answer || '')}`;
if (type === 'about') extra = `${field('title','Назва сторінки',item?.title || 'Про нас')}${field('heroEyebrow','Надзаголовок',d.heroEyebrow || '')}${field('heroTitle','Головний заголовок',d.heroTitle || '')}${richEditor('heroText','Текст Hero',d.heroText || '')}${field('approachKicker','Підпис блоку',d.approachKicker || '')}${field('approachTitle','Заголовок блоку',d.approachTitle || '')}${richEditor('approachText','Текст блоку',d.approachText || '')}${textarea('bullets','Список пунктів (кожен пункт з нового рядка)',d.bullets || '')}${richEditor('quote','Цитата',d.quote || '')}${field('quoteAuthor','Підпис цитати',d.quoteAuthor || '')}${field('valuesKicker','Підпис цінностей',d.valuesKicker || '')}${field('valuesTitle','Заголовок цінностей',d.valuesTitle || '')}${field('value1Icon','Іконка 1',d.value1Icon || '♡')}${field('value1Title','Цінність 1',d.value1Title || '')}${richEditor('value1Text','Опис цінності 1',d.value1Text || '')}${field('value2Icon','Іконка 2',d.value2Icon || '☼')}${field('value2Title','Цінність 2',d.value2Title || '')}${richEditor('value2Text','Опис цінності 2',d.value2Text || '')}${field('value3Icon','Іконка 3',d.value3Icon || '✦')}${field('value3Title','Цінність 3',d.value3Title || '')}${richEditor('value3Text','Опис цінності 3',d.value3Text || '')}`;
return `<form id="editor" class="bg-white border rounded-2xl p-6 space-y-4">${hidden}<h2 class="font-black text-xl">${item ? 'Редагувати запис' : 'Додати запис'}</h2>${extra}<label class="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="published" ${item?.published !== false ? 'checked' : ''}> Опубліковано</label><div class="flex gap-3"><button id="editorSave" class="bg-emerald-600 text-white font-black px-5 py-3 rounded-xl">${item ? 'Зберегти зміни' : 'Додати'}</button>${item ? '<button type="button" id="cancelEdit" class="bg-slate-100 font-bold px-5 py-3 rounded-xl">Скасувати</button>' : ''}</div></form>`;
}
async function content(type) { state.type = type;
state.editing = null;
state.items = type === 'about' ? await api('/about?all=true') : await api(`/content/${type}?all=true`);
$('#tab-content').innerHTML = `<div class="mb-6"><p class="text-emerald-600 font-black text-sm uppercase">Контент</p><h1 class="text-3xl font-black">${labels[type]}</h1></div>${formFor(type)}<div id="items" class="space-y-3 mt-6"></div>`;
bindEditor();
renderItems();
}
let richSelection = null;
function getRichEditor(form = $('#editor')) { return form?.querySelector('[data-rich-editor]'); }
function saveRichSelection(editor) {
if (!editor) return;
const selection = window.getSelection();
if (!selection || !selection.rangeCount) return;
const range = selection.getRangeAt(0);
if (editor.contains(range.commonAncestorContainer)) richSelection = range.cloneRange();
}
function restoreRichSelection(editor) {
if (!editor) return;
editor.focus();
if (!richSelection) return;
const selection = window.getSelection();
selection.removeAllRanges();
selection.addRange(richSelection);
}
function syncRichEditor(form = $('#editor')) {
const editor = getRichEditor(form);
const field = form?.querySelector('textarea[name="text"]');
if (editor && field) field.value = editor.innerHTML;
}
function execRichCommand(command, value = null, editor = getRichEditor()) {
if (!editor) return;
restoreRichSelection(editor);
try { document.execCommand(command, false, value); } catch {}
saveRichSelection(editor);
syncRichEditor(editor.closest('form'));
}
function bindRichEditor(form = $('#editor')) {
const editor = getRichEditor(form);
if (!editor) return;
editor.addEventListener('keyup', () => saveRichSelection(editor));
editor.addEventListener('mouseup', () => saveRichSelection(editor));
editor.addEventListener('input', () => syncRichEditor(form));
editor.addEventListener('focus', () => saveRichSelection(editor));
form.querySelectorAll('[data-rich-cmd]').forEach((button) => {
button.addEventListener('mousedown', event => event.preventDefault());
button.addEventListener('click', () => execRichCommand(button.dataset.richCmd, null, editor));
});
form.querySelector('[data-rich-block]')?.addEventListener('change', (event) => execRichCommand('formatBlock', `<${event.target.value}>`, editor));
form.querySelector('[data-rich-font]')?.addEventListener('change', (event) => execRichCommand('fontName', event.target.value, editor));
form.querySelector('[data-rich-color]')?.addEventListener('input', (event) => execRichCommand('foreColor', event.target.value, editor));
form.querySelector('[data-rich-highlight]')?.addEventListener('input', (event) => execRichCommand('hiliteColor', event.target.value, editor));
const linkButton = form.querySelector('[data-rich-link]');
linkButton?.addEventListener('mousedown', event => event.preventDefault());
linkButton?.addEventListener('click', () => {
restoreRichSelection(editor);
const url = window.prompt('URL посилання:', 'https://');
if (!url) return;
const safeUrl = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
execRichCommand('createLink', safeUrl, editor);
});
syncRichEditor(form);
}
function bindEditor() { const form = $('#editor');
bindRichEditor(form);
bindFilePickers(form);
form.onsubmit = async event => { event.preventDefault();
const button = $('#editorSave');
button.disabled = true;
syncRichEditor(form);
const raw = Object.fromEntries(new FormData(form));
const itemId = raw.id;
delete raw.id;
const published = raw.published === 'on';
delete raw.published;
const title = String(raw.title || '').trim();
const slug = raw.slug || slugify(title);
delete raw.slug;
const payload = { title, slug, data: raw, published };
try { if (itemId) {
if (state.type === 'about') await api(`/about/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) });
else await api(`/content/${state.type}/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) });
} else {
await api(`/content/${state.type}`, { method: 'POST', body: JSON.stringify(payload) });
}
toast(itemId ? 'Зміни збережено' : 'Запис додано', 'success');
await content(state.type);
} catch (error) { toast(error.message, 'error');
} finally { button.disabled = false;
} };
$('#cancelEdit')?.addEventListener('click', () => content(state.type));
}
function slugify(value) { return String(value).toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}
function renderItems() { const box = $('#items');
if (!state.items.length) { box.innerHTML = '<div class="bg-white border rounded-2xl p-8 text-center text-slate-500">Поки що записів немає.</div>';
return;
} box.innerHTML = state.items.map(item => `<article class="bg-white border rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap gap-2 items-center"><span class="text-xs font-bold text-slate-400">${esc(item.data?.date || item.type)}</span><span class="text-[10px] px-2 py-1 rounded-full ${item.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${item.published ? 'Опубліковано' : 'Чернетка'}</span></div><div class="font-black text-lg truncate">${esc(item.title || 'Без назви')}</div><div class="text-sm text-slate-500 mt-1 truncate">${esc(item.data?.role || item.data?.excerpt || item.data?.weight || item.data?.category || item.data?.answer || '')}</div></div><div class="flex gap-2 shrink-0"><button onclick="editItem('${esc(item.id)}')" class="px-4 py-2 rounded-xl bg-sky-50 text-sky-700 font-bold">Редагувати</button><button onclick="removeItem('${esc(item.id)}')" class="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold">Видалити</button></div></article>`).join('');
}
function editItem(id) { const item = state.items.find(x => x.id === id);
if (!item) return;
state.editing = id;
$('#tab-content').innerHTML = `<div class="mb-6"><p class="text-emerald-600 font-black text-sm uppercase">Контент</p><h1 class="text-3xl font-black">${labels[state.type]}</h1></div>${formFor(state.type, item)}<div id="items" class="space-y-3 mt-6"></div>`;
bindEditor();
}
async function removeItem(id) { if (!confirm('Видалити цей запис?')) return;
try { await api(`/content/${state.type}/${id}`, { method: 'DELETE' });
toast('Видалено', 'success');
await content(state.type);
} catch (error) { toast(error.message, 'error');
} }
const richEditorStyle = document.createElement('style');
richEditorStyle.textContent = `
.rich-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px;border-bottom:1px solid #e2e8f0;background:#f8fafc}
.rich-toolbar button,.rich-toolbar select,.rich-toolbar label{height:36px;min-width:36px;border:1px solid #e2e8f0;border-radius:9px;background:#fff;color:#334155;font-weight:800;display:inline-flex;align-items:center;justify-content:center}
.rich-toolbar button{padding:0 9px}.rich-toolbar button:hover,.rich-toolbar select:hover{border-color:#10b981;background:#ecfdf5}
.rich-select{padding:0 8px;min-width:110px}.rich-divider{width:1px;height:26px;background:#cbd5e1;margin:0 2px}.rich-color{padding:0 7px;gap:4px;cursor:pointer}.rich-color input{width:20px;height:20px;padding:0;border:0;background:transparent}.rich-editor{min-height:280px;padding:18px 20px;outline:none;line-height:1.7;color:#334155}.rich-editor:empty::before{content:'Почніть писати текст новини…';color:#94a3b8}.rich-editor p{margin:0 0 1em}.rich-editor h2{font-size:1.6rem;line-height:1.25;margin:.75em 0 .4em}.rich-editor h3{font-size:1.3rem;line-height:1.3;margin:.7em 0 .35em}.rich-editor blockquote{margin:1em 0;padding:.8em 1em;border-left:4px solid #10b981;background:#ecfdf5;color:#475569;border-radius:0 10px 10px 0}.rich-editor ul,.rich-editor ol{padding-left:1.5rem;margin:0 0 1em}.rich-editor a{color:#047857;text-decoration:underline}.rich-editor:focus{box-shadow:inset 0 0 0 1px rgba(16,185,129,.15)}
`;
document.head.appendChild(richEditorStyle);

const applicationStatuses = { new: 'Нова', in_progress: 'У роботі', done: 'Виконано' };
async function applications(){
const all = await api('/applications');
const list = all.filter(x=>x.status !== 'done');
const unread=list.filter(x=>x.status==='new').length;
$('#tab-applications').innerHTML=`<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"><div><p class="text-emerald-600 font-black text-sm uppercase">Звернення батьків</p><h1 class="text-3xl font-black">Активні заявки</h1><p class="text-slate-500 mt-2">Усього активних: <strong>${list.length}</strong> · Нових: <strong>${unread}</strong>.</p></div><button onclick="showTab('archive')" class="px-4 py-3 rounded-xl bg-slate-900 text-white font-bold">Архів →</button></div><div class="space-y-4">${list.length?list.map(renderApplication).join(''):'<div class="bg-white border rounded-2xl p-10 text-center text-slate-500">Активних заявок немає.</div>'}</div>`;
bindApplicationStatusHandlers('#tab-applications');
}
async function archiveApplications(){
const all = await api('/applications');
const list = all.filter(x=>x.status === 'done');
$('#tab-archive').innerHTML=`<div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"><div><p class="text-slate-500 font-black text-sm uppercase">Історія звернень</p><h1 class="text-3xl font-black">Архів заявок</h1><p class="text-slate-500 mt-2">Тут зберігаються всі заявки зі статусом «Виконано».</p></div><button onclick="showTab('applications')" class="px-4 py-3 rounded-xl bg-emerald-600 text-white font-bold">← Активні заявки</button></div><div class="space-y-4">${list.length?list.map(item=>renderApplication(item,true)).join(''):'<div class="bg-white border rounded-2xl p-10 text-center text-slate-500">Архів поки порожній.</div>'}</div>`;
bindApplicationStatusHandlers('#tab-archive');
}
function bindApplicationStatusHandlers(panelSelector) {
const panel = $(panelSelector);
if (!panel) return;
panel.querySelectorAll('.application-status').forEach(select => select.addEventListener('change', () => updateApplicationStatus(select.dataset.id, select.value)));
}
function formatDateTime(value){const d=new Date(value);
return Number.isNaN(d.getTime())?String(value||''):d.toLocaleString('uk-UA')}
function renderApplication(item){const status=item.status||'new';
const badge=status==='done'?'bg-slate-100 text-slate-600':status==='in_progress'?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700';
const phone=String(item.phone||'').replace(/[^\d+]/g,'');
return `<article class="bg-white border rounded-2xl p-5 shadow-sm"><div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2 mb-2"><span class="text-xs font-bold text-slate-400">${esc(formatDateTime(item.created_at))}</span><span class="text-xs px-2 py-1 rounded-full ${badge}">${applicationStatuses[status]||status}</span></div><h2 class="text-xl font-black">${esc(item.name)}</h2><a href="tel:${esc(phone)}" class="inline-block mt-1 font-bold text-emerald-700">${esc(item.phone)}</a>${item.message?`<div class="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6"><div class="text-xs font-black uppercase tracking-wide text-slate-400 mb-1">Повідомлення</div>${esc(item.message)}</div>`:''}</div><div class="flex flex-wrap gap-2 shrink-0"><select class="application-status border rounded-xl px-3 py-2 font-bold bg-white" data-id="${esc(item.id)}"><option value="new" ${status==='new'?'selected':''}>Нова</option><option value="in_progress" ${status==='in_progress'?'selected':''}>У роботі</option><option value="done" ${status==='done'?'selected':''}>Оброблена</option></select><button onclick="removeApplication('${esc(item.id)}')" class="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold">Видалити</button></div></div></article>`}
async function updateApplicationStatus(id,status){try{await api(`/applications/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({status})});
toast('Статус заявки оновлено','success');
await applications()}catch(error){toast(error.message,'error')}}
async function removeApplication(id){if(!confirm('Видалити заявку?'))return;
try{await api(`/applications/${encodeURIComponent(id)}`,{method:'DELETE'});
toast('Заявку видалено','success');
await applications()}catch(error){toast(error.message,'error')}}
async function files() { let list = [];
try { list = await api('/files');
} catch (error) { toast(error.message, 'error');
} $('#tab-files').innerHTML = `<div class="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6"><div><h1 class="text-3xl font-black">Файловий менеджер</h1><p class="text-slate-500 mt-2">Фото, PDF та інші матеріали. Максимум 50 МБ на файл.</p></div></div><div id="drop" class="drop bg-white rounded-2xl p-10 text-center cursor-pointer border-2 border-dashed border-slate-300"><div class="text-4xl">📁</div><div class="font-black mt-2">Перетягніть файли сюди</div><div class="text-sm text-slate-500">або натисніть для вибору</div><input id="fileInput" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" class="hidden"></div><div class="bg-white border rounded-2xl mt-6 overflow-hidden"><div class="p-5 font-black">Завантажені файли</div><div class="divide-y">${(list || []).map(file => `<div class="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div class="min-w-0"><div class="font-bold truncate">${esc(file.name)}</div><div class="text-xs text-slate-500">${Math.max(1, Math.round((file.size || 0) / 1024))} KB • ${esc(file.mime_type || '')}</div></div><div class="flex gap-2"><a href="${esc(file.url)}" target="_blank" class="px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold">Відкрити</a><button onclick="copyUrl('${encodeURIComponent(file.url || '')}')" class="px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold">Копіювати URL</button><button onclick="deleteFile('${esc(file.id)}')" class="px-3 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold">Видалити</button></div></div>`).join('') || '<div class="p-8 text-center text-slate-500">Файлів ще немає.</div>'}</div></div>`;
const drop = $('#drop');
const input = $('#fileInput');
drop.onclick = () => input.click();
['dragenter','dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault();
drop.classList.add('drag');
}));
['dragleave','drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault();
drop.classList.remove('drag');
}));
drop.addEventListener('drop', e => uploadMany(e.dataTransfer.files));
input.onchange = () => uploadMany(input.files);
}
async function uploadMany(selectedFiles) { if (!selectedFiles?.length) return;
const status = toast('Підготовка завантаження...');
const list = [...selectedFiles];
let done = 0;
try { for (const file of list) { await uploadFile(file, percent => { if (status) status.textContent = `Завантаження ${done + 1}/${list.length}: ${percent}%`;
});
done++;
} toast(`Завантажено файлів: ${done}`, 'success');
await window.files();
} catch (error) { toast(error.message, 'error');
} }
async function deleteFile(id) { if (!confirm('Видалити файл?')) return;
try { await api('/files/' + id, { method: 'DELETE' });
toast('Файл видалено', 'success');
await files();
} catch (error) { toast(error.message, 'error');
} }
async function copyUrl(urlEncoded) { const url = decodeURIComponent(urlEncoded);
try { await navigator.clipboard.writeText(`${location.origin}${url}`);
toast('URL скопійовано', 'success');
} catch { toast(url);
} }
function security() { $('#tab-security').innerHTML = `<h1 class="text-3xl font-black">Безпека</h1><div class="bg-white border rounded-2xl p-6 mt-6"><h2 class="font-black text-xl">Зміна пароля</h2><p class="text-sm text-slate-500 mt-2 mb-5">Пароль зберігається в локальній БД у вигляді bcrypt-хешу.</p><form id="passwordForm" class="max-w-xl space-y-4">${field('currentPassword','Поточний пароль','','password')}${field('newPassword','Новий пароль','','password','Мінімум 10 символів')}<button class="bg-slate-950 text-white font-black px-5 py-3 rounded-xl">Змінити пароль</button></form></div>`;
$('#passwordForm').onsubmit = async event => { event.preventDefault();
try { await api('/auth/password', { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
event.target.reset();
toast('Пароль змінено', 'success');
} catch (error) { toast(error.message, 'error');
} };
}
window.showTab = showTab;
window.editItem = editItem;
window.removeApplication = removeApplication;
window.removeItem = removeItem;
window.deleteFile = deleteFile;
window.copyUrl = copyUrl;
window.toast = toast;
window.files = files;
init();
