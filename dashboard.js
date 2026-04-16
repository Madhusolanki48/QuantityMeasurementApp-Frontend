// all the units 
const UNITS = {
  length: ['km', 'm', 'cm', 'mm', 'miles', 'feet', 'inches'],
  volume: ['liters', 'ml', 'gallons', 'cups', 'fl oz'],
  weight: ['kg', 'g', 'mg', 'lb', 'oz', 'ton'],
  temperature: ['Celsius', 'Fahrenheit', 'Kelvin']
};

// conversion factors to base unit
const TO_BASE = {
  length: { km: 1000, m: 1, cm: 0.01, mm: 0.001, miles: 1609.34, feet: 0.3048, inches: 0.0254 },
  volume: { liters: 1, ml: 0.001, gallons: 3.78541, cups: 0.236588, 'fl oz': 0.0295735 },
  weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 }
};

// helper functions

function showToast(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }
}

// switch between light and dark mode
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.className = isDark ? 'bi bi-moon-stars' : 'bi bi-sun';
  if (label) label.textContent = isDark ? 'Dark Mode' : 'Light Mode';
}

function round(n) {
  return Math.round(n * 1000000) / 1000000;
}

function convertTemp(val, from, to) {
  let c;
  if (from === 'Celsius') c = val;
  else if (from === 'Fahrenheit') c = (val - 32) * 5 / 9;
  else c = val - 273.15;
  if (to === 'Celsius') return c;
  if (to === 'Fahrenheit') return (c * 9 / 5) + 32;
  return c + 273.15;
}

// current user and history data

let currentUser = null;
let history = [];
let sidebarOpen = true;

// get the key to store this user's history
function historyKey() {
  return 'miq_history_' + (currentUser ? currentUser.email : 'guest');
}

// load user's past calculations
function loadHistory() {
  history = JSON.parse(localStorage.getItem(historyKey()) || '[]');
}

// save calculations to device storage
function saveHistory() {
  localStorage.setItem(historyKey(), JSON.stringify(history));
}

// when page loads, check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
  console.log('Dashboard page loaded');
  
  // load user from localstorage
  const userStr = localStorage.getItem('loggedInUser');
  if (!userStr) {
    console.log('No logged-in user found, redirecting to login...');
    window.location.href = 'login-signup.html';
    return;
  }
  
  currentUser = JSON.parse(userStr);
  loadHistory();
  
  // initialize dashboard ui
  updateUserProfile();
  buildAllCalculators();
  showTab('dashboard');
});

// show dashboard info
function updateUserProfile() {
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('dd-avatar').textContent = initials;
  document.getElementById('dd-name').textContent = currentUser.name;
  document.getElementById('dd-email').textContent = currentUser.email;
}

// when user clicks logout
function handleLogout() {
  currentUser = null;
  history = [];
  localStorage.removeItem('loggedInUser');
  showToast('Logged out!');
  
  setTimeout(() => {
    window.location.href = 'login-signup.html';
  }, 800);
}

// navigation section
// show the selected tab
function showTab(tab) {
  // hide all tabs first
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  
  // show the active button
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const active = document.querySelector(`[data-tab="${tab}"]`);
  if (active) active.classList.add('active');
  
  // load content for this tab
  if (tab === 'history') renderHistory();
  if (tab === 'dashboard') renderDashboard();
  
  // close dropdown menu
  document.getElementById('profile-dropdown').classList.remove('open');
  
  // update breadcrumbs
  updateBreadcrumbs(tab);
}

// update breadcrumb path
function updateBreadcrumbs(tab) {
  const breadcrumbs = {
    dashboard: 'Dashboard',
    length: 'Converters → Length',
    volume: 'Converters → Volume',
    weight: 'Converters → Weight',
    temperature: 'Converters → Temperature',
    history: 'History'
  };
  const bc = document.getElementById('breadcrumb-path');
  if (bc) bc.textContent = breadcrumbs[tab] || 'Dashboard';
}

// hide/show sidebar menu
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const mc = document.getElementById('main-content');
  if (window.innerWidth <= 700) {
    sb.classList.toggle('open');
  } else {
    sidebarOpen = !sidebarOpen;
    sb.classList.toggle('collapsed', !sidebarOpen);
    mc.classList.toggle('full', !sidebarOpen);
  }
}

// show/hide profile menu
function toggleDropdown() {
  document.getElementById('profile-dropdown').classList.toggle('open');
}

// close dropdown if click outside
document.addEventListener('click', function(e) {
  const pw = document.querySelector('.profile-wrap');
  if (pw && !pw.contains(e.target)) {
    document.getElementById('profile-dropdown').classList.remove('open');
  }
});

// show dashboard with user's info
function renderDashboard() {
  // personalized welcome message
  const firstName = currentUser ? currentUser.name.split(' ')[0] : 'there';
  document.getElementById('welcome-msg').textContent = `👋 Welcome back, ${firstName}!`;

  // show last 3 calculations
  const list = document.getElementById('recent-list');
  const recent = history.slice(0, 3);
  if (recent.length === 0) {
    list.innerHTML = '<p class="empty-msg" style="padding:16px 0;font-size:13px">No activity yet! Start calculating.</p>';
    return;
  }
  list.innerHTML = recent.map(h => `
    <div class="recent-item">
      <div class="recent-item-left">
        <strong>${h.icon} ${h.expr}</strong>
        <span>${h.time}</span>
      </div>
      <div class="recent-item-right">${h.result}</div>
    </div>
  `).join('');
}

// build all calculator tabs
function buildAllCalculators() {
  ['length', 'volume', 'weight', 'temperature'].forEach(buildCalculator);
}

// create calculator for one type
function buildCalculator(type) {
  const container = document.getElementById(type + '-calc');
  const ops = ['Convert', 'Add', 'Subtract', 'Multiply', 'Divide'];
  container.innerHTML = `
    <div class="calc-ops">
      ${ops.map((op, i) => `<button class="op-btn ${i === 0 ? 'active' : ''}" onclick="selectOp(this, '${type}')">${op}</button>`).join('')}
    </div>
    <div id="${type}-fields"></div>
    <button class="btn-calc" onclick="calculate('${type}')">Calculate ➜</button>
    <div class="result-box" id="${type}-result">
      <div class="result-label">Result</div>
      <div class="result-value" id="${type}-result-val">—</div>
    </div>
  `;
  buildFields(type, 'Convert');
}

// when user clicks an operation button
function selectOp(btn, type) {
  btn.closest('.calc-ops').querySelectorAll('.op-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildFields(type, btn.textContent.trim());
  document.getElementById(type + '-result').classList.remove('show');
}

// create input fields based on what operation is selected
function buildFields(type, op) {
  const units = UNITS[type];
  const isTemp = type === 'temperature';
  const container = document.getElementById(type + '-fields');
  const unitOpts = units.map(u => `<option value="${u}">${u}</option>`).join('');
  const unitOpts2 = units.map((u, i) => `<option value="${u}" ${i === 1 ? 'selected' : ''}>${u}</option>`).join('');

  let note = '';
  if (isTemp && (op === 'Multiply' || op === 'Divide')) {
    note = `<div class="calc-note">⚠️ Multiply/Divide works on the numeric value only.</div>`;
  }

  if (op === 'Convert') {
    container.innerHTML = `${note}
      <div class="calc-row">
        <label>Value</label>
        <input class="calc-input" id="${type}-v1" type="number" placeholder="0" />
        <select class="unit-select" id="${type}-u1">${unitOpts}</select>
        <button class="btn-swap" onclick="swapUnits('${type}')" title="Swap units"><i class="bi bi-arrow-left-right"></i></button>
      </div>
      <div class="calc-row">
        <label>To</label>
        <select class="unit-select" id="${type}-u2" style="flex:1">${unitOpts2}</select>
      </div>`;
  } else {
    const isScalar = op === 'Multiply' || op === 'Divide';
    container.innerHTML = `${note}
      <div class="calc-row">
        <label>Value 1</label>
        <input class="calc-input" id="${type}-v1" type="number" placeholder="0" />
        <select class="unit-select" id="${type}-u1">${unitOpts}</select>
      </div>
      <div class="calc-row">
        <label>${isScalar ? 'Factor' : 'Value 2'}</label>
        <input class="calc-input" id="${type}-v2" type="number" placeholder="0" />
        ${isScalar ? '' : `<select class="unit-select" id="${type}-u2">${unitOpts2}</select>`}
      </div>
      ${isScalar ? '' : `<div class="calc-row"><label>Result in</label><select class="unit-select" id="${type}-u3" style="flex:1">${unitOpts}</select></div>`}`;
  }
}

// swap units in conversion
function swapUnits(type) {
  const u1 = document.getElementById(type + '-u1');
  const u2 = document.getElementById(type + '-u2');
  if (u1 && u2) {
    [u1.value, u2.value] = [u2.value, u1.value];
    showToast('Units swapped!');
  }
}

// get which operation is selected
function getActiveOp(type) {
  const active = document.querySelector(`#${type}-calc .op-btn.active`);
  return active ? active.textContent.trim() : 'Convert';
}

// do the actual calculation
function calculate(type) {
  const op = getActiveOp(type);
  const v1El = document.getElementById(type + '-v1');
  const v2El = document.getElementById(type + '-v2');
  const v1 = parseFloat(v1El?.value);
  const v2 = parseFloat(v2El?.value);
  const u1 = document.getElementById(type + '-u1')?.value;
  const u2 = document.getElementById(type + '-u2')?.value;
  const u3 = document.getElementById(type + '-u3')?.value;
  const isTemp = type === 'temperature';

  // check if inputs are valid
  if (isNaN(v1)) {
    showValidationError(v1El, 'Please enter a valid number!');
    return;
  }
  clearValidationError(v1El);

  if ((op !== 'Convert') && isNaN(v2)) {
    showValidationError(v2El, 'Enter a value!');
    return;
  }
  if (v2El) clearValidationError(v2El);

  if (op === 'Divide' && v2 === 0) {
    showValidationError(v2El, 'Cannot divide by zero!');
    return;
  }

  // do the math based on operation type
  let resultVal = 0, expr = '', resultUnit = '';

  if (op === 'Convert') {
    if (isTemp) {
      resultVal = convertTemp(v1, u1, u2);
      expr = `${v1} ${u1} → ${u2}`;
      resultUnit = u2;
    } else {
      resultVal = (v1 * TO_BASE[type][u1]) / TO_BASE[type][u2];
      expr = `${v1} ${u1} → ${u2}`;
      resultUnit = u2;
    }
  } else if (op === 'Add' || op === 'Subtract') {
    if (isTemp) {
      const v2InU1 = convertTemp(v2, u2, u1);
      resultVal = op === 'Add' ? v1 + v2InU1 : v1 - v2InU1;
      expr = `${v1} ${u1} ${op === 'Add' ? '+' : '-'} ${v2} ${u2}`;
      resultUnit = u1;
    } else {
      const b1 = v1 * TO_BASE[type][u1];
      const b2 = v2 * TO_BASE[type][u2];
      const base = op === 'Add' ? b1 + b2 : b1 - b2;
      resultVal = base / TO_BASE[type][u3];
      expr = `${v1} ${u1} ${op === 'Add' ? '+' : '-'} ${v2} ${u2}`;
      resultUnit = u3;
    }
  } else if (op === 'Multiply') {
    resultVal = v1 * v2;
    expr = `${v1} ${u1} × ${v2}`;
    resultUnit = u1;
  } else if (op === 'Divide') {
    resultVal = v1 / v2;
    expr = `${v1} ${u1} ÷ ${v2}`;
    resultUnit = u1;
  }

  // show the result
  const displayResult = `${round(resultVal)} ${resultUnit}`;
  const resultBox = document.getElementById(type + '-result');
  const resultValEl = document.getElementById(type + '-result-val');
  resultValEl.textContent = displayResult;
  resultBox.classList.add('show', 'success-animation');
  setTimeout(() => resultBox.classList.remove('success-animation'), 600);

  // save this to history
  const icons = { length: '📏', volume: '🧪', weight: '⚖️', temperature: '🌡️' };
  history.unshift({
    id: Date.now(),
    type,
    icon: icons[type],
    op,
    expr,
    result: displayResult,
    time: new Date().toLocaleString()
  });
  saveHistory();
  showToast('✓ Saved to history!');
}

// show error if input is bad
function showValidationError(element, msg) {
  if (!element) return;
  element.classList.add('input-error');
  showToast('❌ ' + msg);
  setTimeout(() => element.classList.remove('input-error'), 2000);
}

// remove error from input
function clearValidationError(element) {
  if (element) element.classList.remove('input-error');
}

// history section
// show all past calculations
function renderHistory() {
  const list = document.getElementById('history-list');
  if (history.length === 0) {
    list.innerHTML = '<div class="empty-msg">📭 No history yet. Start calculating!</div>';
    return;
  }
  list.innerHTML = '<div class="timeline">' + history.map((h, i) => `
    <div class="timeline-item fade-in" style="animation-delay: ${i * 50}ms">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-icon">${h.icon}</span>
          <span class="timeline-type">[${h.type}]</span>
          <span class="timeline-op">${h.op}</span>
        </div>
        <div class="timeline-expr">${h.expr}</div>
        <div class="timeline-result">${h.result}</div>
        <div class="timeline-time">${h.time}</div>
        <button class="timeline-del" title="Delete" onclick="deleteHistory(${h.id})">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  `).join('') + '</div>';
}

// delete one calculation from history
function deleteHistory(id) {
  history = history.filter(h => h.id !== id);
  saveHistory();
  renderHistory();
}

// clear all history
function clearAllHistory() {
  if (!confirm('Clear all history?')) return;
  history = [];
  saveHistory();
  renderHistory();
  showToast('History cleared!');
}
