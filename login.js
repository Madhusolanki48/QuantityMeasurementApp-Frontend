// --- utilities ---
function showToast(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  }
}

function showPage(id) {
  document.querySelectorAll('.err').forEach((el) => (el.textContent = ''));
  document
    .querySelectorAll('.auth-page')
    .forEach((page) => page.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

/**
 * Toggles password visibility between dots and plain text
 */
function togglePass(id, icon) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('bi-eye', 'bi-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('bi-eye-slash', 'bi-eye');
  }
}

/**
 * Real-time validation for input fields
 */
function validateField(input) {
  const val = input.value.trim();
  if (val === '') {
    input.classList.remove('valid', 'invalid');
    return;
  }

  let isValid = false;
  if (input.type === 'email') {
    isValid = val.includes('@') && val.includes('.');
  } else if (input.id === 'su-name') {
    isValid = val.length >= 2;
  } else {
    isValid = val.length >= 6;
  }

  if (isValid) {
    input.classList.add('valid');
    input.classList.remove('invalid');
  } else {
    input.classList.add('invalid');
    input.classList.remove('valid');
  }
}

// --- CORE LOGIC ---
window.doSignupLogic = function () {
  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass = document.getElementById('su-pass').value;
  const cpass = document.getElementById('su-cpass').value;

  if (
    name.length < 2 ||
    !email.includes('@') ||
    pass.length < 6 ||
    pass !== cpass
  ) {
    showToast('Please correct the errors in the form.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('miq_users') || '[]');
  if (users.find((u) => u.email === email)) {
    showToast('Email already registered!');
    return;
  }

  users.push({ name, email, pass });
  localStorage.setItem('miq_users', JSON.stringify(users));
  showToast('Account created! Please sign in.');
  showPage('login-page');
};

window.doLoginLogic = function () {
  const email = document.getElementById('li-email').value.trim();
  const pass = document.getElementById('li-pass').value;

  const users = JSON.parse(localStorage.getItem('miq_users') || '[]');
  const user = users.find((u) => u.email === email && u.pass === pass);

  if (!user) {
    showToast('Invalid credentials!');
    return;
  }

  localStorage.setItem('loggedInUser', JSON.stringify(user));
  showToast('Success! Redirecting...');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1200);
};

document.addEventListener('DOMContentLoaded', () => {
  showPage('signup-page');
});
