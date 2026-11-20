/* =====================================================
   FOCUS DASHBOARD — Vanilla JS
   Features: Clock/Greeting, Focus Timer, Todo List,
             Quick Links
   Challenges: Dark Mode, Custom Name, Change Pomodoro
               Time, Prevent Duplicate Tasks, Sort Tasks
===================================================== */

// ─── HELPERS ──────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function getStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

// ─── DARK MODE ────────────────────────────────────────
const darkToggleInput = $('dark-toggle-input');

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  darkToggleInput.checked = dark;
  const label = $('dark-toggle-label');
  if (label) label.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
}

function initDarkMode() {
  const saved = getStorage('darkMode', false);
  applyTheme(saved);
  darkToggleInput.addEventListener('change', () => {
    setStorage('darkMode', darkToggleInput.checked);
    applyTheme(darkToggleInput.checked);
  });
}

// ─── CLOCK & GREETING ─────────────────────────────────
const clockEl    = $('clock');
const dateEl     = $('date-str');
const greetingEl = $('greeting-text');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getGreeting(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function tickClock() {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  clockEl.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  dateEl.textContent  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const name = getStorage('userName', '');
  const base = getGreeting(h);
  greetingEl.textContent = name ? `${base}, ${name}! 👋` : `${base}! 👋`;
}

function initClock() {
  tickClock();
  setInterval(tickClock, 1000);
}

// ─── CUSTOM NAME ──────────────────────────────────────
function initCustomName() {
  const nameInput   = $('name-input');
  const nameSaveBtn = $('name-save-btn');

  const saved = getStorage('userName', '');
  nameInput.value = saved;

  nameSaveBtn.addEventListener('click', saveName);
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveName();
  });

  function saveName() {
    const name = nameInput.value.trim();
    setStorage('userName', name);
    tickClock(); // refresh greeting immediately
    showToast(name ? `Name saved as "${name}"` : 'Name cleared');
  }
}

// ─── FOCUS TIMER ──────────────────────────────────────
let timerInterval  = null;
let timerRunning   = false;
let totalSeconds   = 25 * 60;
let remainSeconds  = totalSeconds;

const timerDisplay  = $('timer-display');
const timerLabelEl  = $('timer-label');
const startBtn      = $('timer-start');
const stopBtn       = $('timer-stop');
const resetBtn      = $('timer-reset');
const customMinutes = $('custom-minutes');

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

function renderTimer() {
  timerDisplay.textContent = formatTime(remainSeconds);
  const pct = ((totalSeconds - remainSeconds) / totalSeconds) * 100;
  timerLabelEl.textContent = timerRunning
    ? `Elapsed: ${Math.round(pct)}%`
    : (remainSeconds === totalSeconds ? 'Press Start to begin' : 'Paused');
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    if (remainSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      showToast('⏰ Focus session complete! Take a break.');
      renderTimer();
      return;
    }
    remainSeconds--;
    renderTimer();
  }, 1000);
  renderTimer();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  renderTimer();
}

function resetTimer() {
  stopTimer();
  remainSeconds = totalSeconds;
  renderTimer();
}

function initTimer() {
  const savedMin = getStorage('pomodoroMinutes', 25);
  totalSeconds   = savedMin * 60;
  remainSeconds  = totalSeconds;
  customMinutes.value = savedMin;
  renderTimer();

  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);

  customMinutes.addEventListener('change', () => {
    let val = parseInt(customMinutes.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 120) val = 120;
    customMinutes.value = val;
    setStorage('pomodoroMinutes', val);
    totalSeconds  = val * 60;
    remainSeconds = totalSeconds;
    stopTimer();
    renderTimer();
    showToast(`Timer set to ${val} minutes`);
  });
}

// ─── TASKS ────────────────────────────────────────────
let tasks = [];

const taskInput    = $('task-input');
const addTaskBtn   = $('add-task-btn');
const taskListEl   = $('task-list');
const sortSelect   = $('sort-select');

function saveTasks() {
  setStorage('tasks', tasks);
}

function renderTasks() {
  let display = [...tasks];

  const sort = sortSelect.value;
  if (sort === 'az') {
    display.sort((a, b) => a.text.localeCompare(b.text));
  } else if (sort === 'za') {
    display.sort((a, b) => b.text.localeCompare(a.text));
  } else if (sort === 'done') {
    display.sort((a, b) => Number(b.done) - Number(a.done));
  } else if (sort === 'undone') {
    display.sort((a, b) => Number(a.done) - Number(b.done));
  }

  taskListEl.innerHTML = '';

  if (display.length === 0) {
    taskListEl.innerHTML = '<li class="empty-msg">No tasks yet. Add one above! ✨</li>';
    return;
  }

  display.forEach((task) => {
    const realIdx = tasks.findIndex(t => t.id === task.id);
    const li = document.createElement('li');
    li.className = 'task-item';
    li.dataset.id = task.id;

    // checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = task.done;
    cb.addEventListener('change', () => {
      tasks[realIdx].done = cb.checked;
      saveTasks();
      renderTasks();
    });

    // name span (double-click to edit)
    const nameSpan = document.createElement('span');
    nameSpan.className = 'task-name' + (task.done ? ' done' : '');
    nameSpan.textContent = task.text;
    nameSpan.addEventListener('dblclick', () => startEdit(task.id, li, nameSpan));

    // edit btn
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(task.id, li, nameSpan));

    // delete btn
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      tasks.splice(realIdx, 1);
      saveTasks();
      renderTasks();
    });

    li.appendChild(cb);
    li.appendChild(nameSpan);
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    taskListEl.appendChild(li);
  });
}

function startEdit(id, li, nameSpan) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // hide edit button while editing
  const editBtn = li.querySelector('.btn-edit');
  if (editBtn) editBtn.style.display = 'none';

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.text;

  li.replaceChild(editInput, nameSpan);
  editInput.focus();

  function commitEdit() {
    const newText = editInput.value.trim();
    if (!newText) {
      li.replaceChild(nameSpan, editInput);
      if (editBtn) editBtn.style.display = '';
      return;
    }

    // duplicate check (excluding self)
    const isDuplicate = tasks.some(
      t => t.id !== id && t.text.toLowerCase() === newText.toLowerCase()
    );

    if (isDuplicate) {
      showToast(`⚠️ Task "${newText}" already exists!`);
      editInput.focus();
      return;
    }

    const realIdx = tasks.findIndex(t => t.id === id);
    tasks[realIdx].text = newText;
    saveTasks();
    renderTasks();
  }

  editInput.addEventListener('blur', commitEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      li.replaceChild(nameSpan, editInput);
      if (editBtn) editBtn.style.display = '';
    }
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    showToast('Please enter a task name.');
    taskInput.focus();
    return;
  }

  // prevent duplicates
  const isDuplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (isDuplicate) {
    showToast(`⚠️ Task "${text}" already exists!`);
    taskInput.focus();
    return;
  }

  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
  taskInput.focus();
}

function initTasks() {
  tasks = getStorage('tasks', []);
  renderTasks();

  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  sortSelect.addEventListener('change', renderTasks);
}

// ─── QUICK LINKS ──────────────────────────────────────
let links = [];

const linkNameInput = $('link-name-input');
const linkUrlInput  = $('link-url-input');
const addLinkBtn    = $('add-link-btn');
const linkTagsEl    = $('link-tags');

function saveLinks() {
  setStorage('quickLinks', links);
}

function renderLinks() {
  linkTagsEl.innerHTML = '';

  if (links.length === 0) {
    linkTagsEl.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted)">No links yet. Add your favorites above!</span>';
    return;
  }

  links.forEach((link, idx) => {
    const a = document.createElement('a');
    a.className = 'link-tag';
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = link.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'link-tag-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove link';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      links.splice(idx, 1);
      saveLinks();
      renderLinks();
    });

    a.appendChild(nameSpan);
    a.appendChild(removeBtn);
    linkTagsEl.appendChild(a);
  });
}

function addLink() {
  let name = linkNameInput.value.trim();
  let url  = linkUrlInput.value.trim();

  if (!name || !url) {
    showToast('Please enter both a name and a URL.');
    return;
  }

  // auto-prepend https:// if missing
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  links.push({ name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
}

function initLinks() {
  links = getStorage('quickLinks', [
    { name: 'Google',   url: 'https://google.com' },
    { name: 'Gmail',    url: 'https://mail.google.com' },
    { name: 'Calendar', url: 'https://calendar.google.com' },
  ]);
  saveLinks();
  renderLinks();

  addLinkBtn.addEventListener('click', addLink);
  linkUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLink();
  });
  linkNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') linkUrlInput.focus();
  });
}

// ─── BOOT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initClock();
  initCustomName();
  initTimer();
  initTasks();
  initLinks();
});
