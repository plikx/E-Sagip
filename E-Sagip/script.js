const API_BASE_URL = 'https://e-sagip-production.up.railway.app/api';

/* ===== LOGIN PAGE ===== */
let allVolunteers = [];

async function loadVolunteers() {
    const volList = document.getElementById('vol-list');
    if (!volList) return;

    try {
        const response = await fetch('https://e-sagip-production.up.railway.app/api/auth/volunteers');
        allVolunteers = await response.json(); // store globally
        renderVolunteers(allVolunteers);
    } catch (err) {
        console.error('Failed to load volunteers:', err);
        volList.innerHTML = `<div class="vol-empty-state"><h3>Could not load volunteers</h3></div>`;
    }
}

function renderVolunteers(volunteers) {
    const volList = document.getElementById('vol-list');
    if (!volList) return;

    if (volunteers.length === 0) {
        volList.innerHTML = `
            <div class="vol-empty-state">
                <div class="empty-icon">👥</div>
                <h3>No Volunteers found</h3>
                <p>Try a different search or filter.</p>
            </div>`;
        return;
    }

    volList.innerHTML = volunteers.map(v => {
        const initials = (v.first_name[0] || '') + (v.last_name[0] || '');
        const skillTags = (v.skills || []).map(s => `<span class="vstag">${s}</span>`).join('');
        return `
            <div class="vol-card" data-id="${v.id}">
                <div class="vol-ops">
                    <div class="vol-avatar">${initials.toUpperCase()}</div>
                    <div class="vol-info">
                        <div class="vol-name">${v.first_name} ${v.last_name} <span class="vol-badge ${v.status}">${v.status}</span></div>
                        <div class="vol-meta">${v.address} · ${v.contact_number}</div>
                        <div class="vol-skills-row">${skillTags}</div>
                    </div>
                </div>
                <div class="vol-ops-btn">
                    <button class="v-approve" onclick="approveVolunteer(${v.id})">✓ Approve</button>
                    <button class="v-remove" onclick="removeVolunteer(${v.id})">🗑 Remove</button>
                </div>
            </div>
        `;
    }).join('');
}

let activeSkillFilter = 'all';

function filterVolunteers() {
    const searchInput = document.getElementById('vol-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let filtered = allVolunteers;

    if (activeSkillFilter !== 'all') {
        filtered = filtered.filter(v => (v.skills || []).includes(activeSkillFilter));
    }

    if (query) {
        filtered = filtered.filter(v => {
            const fullName = `${v.first_name} ${v.last_name}`.toLowerCase();
            return fullName.includes(query);
        });
    }

    renderVolunteers(filtered);
}

async function approveVolunteer(id) {
    try {
        await fetch(`https://e-sagip-production.up.railway.app/api/auth/volunteers/${id}/approve`, { method: 'PUT' });
        loadVolunteers();
    } catch (err) {
        console.error('Failed to approve volunteer:', err);
        alert('Could not approve volunteer. Please try again.');
    }
}

async function removeVolunteer(id) {
    if (!confirm('Permanently remove this volunteer?')) return;
    try {
        await fetch(`https://e-sagip-production.up.railway.app/api/auth/volunteers/${id}`, { method: 'DELETE' });
        loadVolunteers();
    } catch (err) {
        console.error('Failed to remove volunteer:', err);
        alert('Could not remove volunteer. Please try again.');
    }
}

function switchTab(tab) {
  const formVolunteer = document.getElementById('form-volunteer');
  const formAdmin     = document.getElementById('form-admin');
  const tabVolunteer  = document.getElementById('tab-volunteer');
  const tabAdmin      = document.getElementById('tab-admin');

  if (!formVolunteer) return;

  if (tab === 'volunteer') {
    formVolunteer.classList.remove('hidden');
    formAdmin.classList.add('hidden');
    tabVolunteer.classList.add('active');
    tabAdmin.classList.remove('active');
  } else {
    formAdmin.classList.remove('hidden');
    formVolunteer.classList.add('hidden');
    tabAdmin.classList.add('active');
    tabVolunteer.classList.remove('active');
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`;
  } else {
    input.type = 'password';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
  }
}

async function handleVolunteerLogin() {
  const email    = document.getElementById('v-email')?.value.trim();
  const password = document.getElementById('v-password')?.value;

  if (!email || !password) {
    alert('Please enter your credentials.');
    return;
  }
  if (!email.endsWith('@gmail.com')) {
    alert('Email must be a @gmail.com address.');
    document.getElementById('v-email').focus();
    return;
  }

  try {
    const response = await fetch('https://e-sagip-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'volunteer' })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      window.location.href = 'volunteer_page.html';
    } else {
      alert(data.error || 'Invalid email or password.');
    }

  } catch (err) {
    alert('Could not connect to the server. Please try again.');
    console.error(err);
  }
}

async function handleAdminLogin() {
  const email    = document.getElementById('a-email')?.value.trim();
  const password = document.getElementById('a-password')?.value;

  if (!email || !password) {
    alert('Please enter your admin credentials.');
    return;
  }

  try {
    const response = await fetch('https://e-sagip-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'admin' })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      if (data.user.role === 'superadmin') {
        window.location.href = 'superadmin_page.html';
      } else {
        window.location.href = 'admin_page.html';
      }
    } else {
      alert(data.error || 'Invalid admin credentials.');
    }

  } catch (err) {
    alert('Could not connect to the server. Please try again.');
    console.error(err);
  }
}


/* ===== ADMIN DASHBOARD ===== */

function switchSubNav(btn, tab) {
  document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const panels = ['dashboard', 'newop', 'volunteers','admins', 'feed'];
  panels.forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) el.classList.toggle('hidden', id !== tab);
  });
}

function toggleOp(chevronEl) {
  const card    = chevronEl.closest('.op-card');
  const details = card.querySelector('.op-details');
  const svg     = chevronEl.querySelector('svg');

  if (!details) return;

  const isOpen = details.classList.toggle('open');
  if (svg) svg.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function handleLogout() {
  if (confirm('Sign out of the admin portal?')) {
    window.location.href = 'index.html';
  }
}

function handleSaLogout() {
  if (confirm('Sign out of the Super Admin portal?')) {
    window.location.href = 'index.html';
  }
}


/* ===== REGISTRATION PAGE ===== */

let currentStep = 1;

function goToStep(step) {
  if (step === 2) {
    const fname            = document.getElementById('fname')?.value.trim();
    const lname            = document.getElementById('lname')?.value.trim();
    const birthdate        = document.getElementById('birthdate')?.value;
    const contact          = document.getElementById('contact')?.value.trim();
    const email            = document.getElementById('email')?.value.trim();
    const residentCheckbox = document.getElementById('resident');
    const isResident       = residentCheckbox?.checked ?? false;
    const residentAddress  = document.getElementById('resident-address')?.value.trim();
    const outsideAddress   = document.getElementById('outside-address')?.value.trim();

    if (!fname || !lname || !birthdate || !contact || !email) {
      alert('Please fill in all required fields (First Name, Last Name, Birthdate, Contact Number, and Email).');
      return;
    }
    if (!email.endsWith('@gmail.com')) {
      alert('Email must be a @gmail.com address.');
      document.getElementById('email').focus();
      return;
    }

    const birth = new Date(birthdate);
    const today = new Date();
    const age   = today.getFullYear() - birth.getFullYear() -
      (today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);

    if (age < 18) {
      alert('You must be at least 18 years old to register.');
      return;
    }
    if (age > 120) {
      alert('Please enter a valid birthdate. Age cannot be greater than 120 years.');
      return;
    }

    if (isResident && !residentAddress) {
      alert('Please select your Purok in Brgy. 628.');
      return;
    }
    if (!isResident && !outsideAddress) {
      alert('Please select your City/Municipality.');
      return;
    }
  }

  if (step === 3) {
    const skillSelection = document.querySelectorAll('input[name="skill"]:checked');
    if (skillSelection.length === 0) {
      alert('Please select at least one skill before continuing.');
      return;
    }
    updateSummary();
  }

  document.querySelectorAll('.reg-step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + step);
  if (panel) panel.classList.add('active');

  currentStep = step;
  updateStepUI(step);
  window.scrollTo(0, 0);
}

function updateStepUI(step) {
  for (let i = 1; i <= 3; i++) {
    const circle = document.getElementById('sc-' + i);
    const label  = document.getElementById('sl-' + i);
    const dot    = document.getElementById('dot-' + i);
    if (!circle) continue;

    circle.classList.remove('active', 'done');
    label.classList.remove('active');
    if (dot) dot.classList.remove('active');

    if (i < step) {
      circle.classList.add('done');
      circle.innerHTML = '✓';
    } else if (i === step) {
      circle.classList.add('active');
      circle.textContent = i;
      label.classList.add('active');
      if (dot) dot.classList.add('active');
    } else {
      circle.textContent = i;
    }
  }

  for (let c = 1; c <= 2; c++) {
    const conn = document.getElementById('conn-' + c);
    if (conn) conn.classList.toggle('done', step > c);
  }
}

function goBack() {
  if (currentStep <= 1) {
    window.location.href = 'index.html';
  } else {
    goToStep(currentStep - 1);
  }
}

function backtoS1() {
  if (currentStep <= 1) {
    window.location.href = 'index.html';
  } else {
    goToStep(currentStep - 1);
  }
}

function toggleResidentAddressFields() {
  const checkbox = document.getElementById('resident');
  const div1     = document.querySelector('.address-div1');
  const div2     = document.querySelector('.address-div2');
  const input1   = document.getElementById('resident-address');
  const input2   = document.getElementById('outside-address');
  if (!checkbox || !div1 || !div2 || !input1 || !input2) return;

  const isResident = checkbox.checked;

  div1.classList.toggle('active', isResident);
  div2.classList.toggle('active', !isResident);
  input1.required = isResident;
  input2.required = !isResident;

  if (!isResident) input1.value = '';
  else input2.value = '';
}

function toggleCategory(headerEl) {
  const body    = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.skill-cat-chevron');
  const isOpen  = body.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
}

function updateSummary() {
  const fname   = document.getElementById('fname')?.value.trim() || '';
  const lname   = document.getElementById('lname')?.value.trim() || '';
  const email   = document.getElementById('email')?.value.trim() || '—';
  const contact = document.getElementById('contact')?.value.trim() || '—';

  const fullName = (fname + ' ' + lname).trim() || '—';
  const skills   = [...document.querySelectorAll('input[name="skill"]:checked')].map(c => c.value);

  const sumName    = document.getElementById('sum-name');
  const sumEmail   = document.getElementById('sum-email');
  const sumContact = document.getElementById('sum-contact');
  const sumSkills  = document.getElementById('sum-skills');

  if (sumName)    sumName.textContent    = fullName.toUpperCase();
  if (sumEmail)   sumEmail.textContent   = email;
  if (sumContact) sumContact.textContent = contact;
  if (sumSkills)  sumSkills.textContent  = skills.length + ' skill' + (skills.length !== 1 ? 's' : '') + ' selected';
}

async function completeRegistration() {
  const password = document.getElementById('reg-password')?.value;
  const confirm  = document.getElementById('reg-confirm')?.value;
  const question = document.getElementById('sec-question')?.value;
  const answer   = document.getElementById('sec-answer')?.value.trim();

  if (!question || !answer) {
    alert('Please select a security question and provide your answer.');
    return;
  }
  if (!password || password.length < 8) {
    alert('Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    alert('Passwords do not match. Please try again.');
    return;
  }

  const isResident = document.getElementById('resident')?.checked ?? false;
  let address = '';
  if (isResident) {
    const purok   = document.getElementById('resident-address')?.value || '';
    const houseNo = document.getElementById('house-no')?.value.trim() || '';
    address = houseNo ? `${houseNo}, ${purok}` : purok;
  } else {
    const city = document.getElementById('outside-address')?.value || '';
    const brgy = document.getElementById('outside-address-brgy')?.value.trim() || '';
    address = brgy ? `${brgy}, ${city}` : city;
  }

  const skills = [...document.querySelectorAll('input[name="skill"]:checked')]
    .map(cb => cb.value);

  const payload = {
    firstName:     document.getElementById('fname')?.value.trim(),
    lastName:      document.getElementById('lname')?.value.trim(),
    birthdate:     document.getElementById('birthdate')?.value,
    gender:        document.getElementById('gender')?.value || null,
    isResident:    isResident,
    address:       address,
    contactNumber: document.getElementById('contact')?.value.trim(),
    email:         document.getElementById('email')?.value.trim(),
    ecName:        document.getElementById('ec-name')?.value.trim() || null,
    ecNumber:      document.getElementById('ec-num')?.value.trim() || null,
    secQuestion:   question,
    secAnswer:     answer,
    password:      password,
    skills:        skills,
    otherSkill:    document.getElementById('other-skill')?.value.trim() || null
  };

  try {
    const response = await fetch('https://e-sagip-production.up.railway.app/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      document.querySelectorAll('.reg-step-panel').forEach(p => p.classList.remove('active'));
      const success = document.getElementById('reg-success');
      if (success) success.classList.add('active');
      window.scrollTo(0, 0);
    } else {
      alert(data.error || 'Registration failed. Please try again.');
    }

  } catch (err) {
    alert('Could not connect to the server. Please try again.');
    console.error(err);
  }
}


/* ===== BIRTHDATE AGE DISPLAY ===== */

function calcAge(dateStr) {
  if (!dateStr) return -1;
  const dob   = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function updateAgeFeedback(dateStr) {
  const eligibleEl = document.getElementById('age-eligible');
  const minorEl    = document.getElementById('age-minor');
  const ageOkEl    = document.getElementById('age-ok');
  const ageErrEl   = document.getElementById('age-err');

  if (!eligibleEl || !minorEl) return;

  eligibleEl.classList.add('hidden');
  minorEl.classList.add('hidden');

  if (!dateStr) return;

  const age = calcAge(dateStr);
  if (age < 0 || age > 120) return;

  if (age >= 18) {
    if (ageOkEl) ageOkEl.textContent = age;
    eligibleEl.classList.remove('hidden');
  } else {
    if (ageErrEl) ageErrEl.textContent = age;
    minorEl.classList.remove('hidden');
  }
}


/* ===== FEED POST MODAL ===== */

function openPostModal() {
  document.getElementById('postModal')?.classList.remove('hidden');
}

function closePostModal() {
  document.getElementById('postModal')?.classList.add('hidden');
  clearPostForm();
}

function clearPostForm() {
  ['postTitle', 'post-date', 'post-loc', 'post-img', 'post-award', 'post-cap', 'post-vol', 'post-fam'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('input-error');
  });
  document.querySelectorAll('.field-error').forEach(e => e.remove());
}

function validatePostForm() {
  const requiredFields = [
    { id: 'postTitle',  label: 'Operation Title' },
    { id: 'post-date',  label: 'Date' },
    { id: 'post-loc',   label: 'Location' },
    { id: 'post-img',   label: 'Image' },
    { id: 'post-award', label: 'Highlight / Award' },
    { id: 'post-cap',   label: 'Caption' },
    { id: 'post-vol',   label: 'Volunteers' },
    { id: 'post-fam',   label: 'Families Helped' },
  ];

  // Clear previous errors
  document.querySelectorAll('.field-error').forEach(e => e.remove());
  document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));

  let isValid    = true;
  const missing  = [];

  requiredFields.forEach(function (field) {
    const input = document.getElementById(field.id);
    if (!input) return;

    const isEmpty = field.id === 'post-img'
      ? input.files.length === 0
      : input.value.trim() === '';

    if (isEmpty) {
      isValid = false;
      missing.push(field.label);
      input.classList.add('input-error');

      const error = document.createElement('span');
      error.className = 'field-error';
      error.textContent = `${field.label} is required.`;
      input.parentNode.appendChild(error);
    }
  });

  if (!isValid) {
    alert(`Please fill in the following required fields:\n\n• ${missing.join('\n• ')}`);
  }

  return isValid;
}


/* ===== DOM READY ===== */

document.addEventListener('DOMContentLoaded', () => {
  loadVolunteers();

  // ── Restrict input to letters only ─────────────────────────────
  function restrictToLetters(el) {
    if (!el) return;
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' '];
    el.addEventListener('keydown', e => {
      if (!allowed.includes(e.key) && !/^[a-zA-Z\s]$/.test(e.key)) e.preventDefault();
    });
    el.addEventListener('paste', e => {
      if (/[^a-zA-Z\s]/.test(e.clipboardData.getData('text'))) e.preventDefault();
    });
    el.addEventListener('drop', e => {
      if (/[^a-zA-Z\s]/.test(e.dataTransfer.getData('text'))) e.preventDefault();
    });
  }

  // ── Restrict input to numbers only ─────────────────────────────
  function restrictToNumbers(el) {
    if (!el) return;
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
    el.addEventListener('keydown', e => {
      if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault();
    });
    el.addEventListener('paste', e => {
      if (/[^0-9]/.test(e.clipboardData.getData('text'))) e.preventDefault();
    });
    el.addEventListener('drop', e => {
      if (/[^0-9]/.test(e.dataTransfer.getData('text'))) e.preventDefault();
    });
  }

  // ── Restrict input to numbers only, clamped to 1–1000 ──────────
  function restrictToSlots(el) {
    if (!el) return;
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    el.addEventListener('keydown', e => {
      if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
    });
    el.addEventListener('input', () => {
      const val = parseInt(el.value);
      if (isNaN(val) || val < 1) el.value = '';
      else if (val > 1000)       el.value = 1000;
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const num  = parseInt(text.replace(/\D/g, ''));
      if (!isNaN(num)) el.value = Math.min(Math.max(num, 1), 1000);
    });
  }

  // ── Apply input restrictions ────────────────────────────────────
  restrictToLetters(document.getElementById('fname'));
  restrictToLetters(document.getElementById('lname'));
  restrictToLetters(document.getElementById('ec-name'));
  restrictToNumbers(document.getElementById('contact'));
  restrictToNumbers(document.getElementById('ec-num'));
  restrictToNumbers(document.getElementById('post-fam'));
  restrictToSlots(document.getElementById('slots'));
  restrictToSlots(document.getElementById('post-vol'));

  // ── Resident checkbox toggle ────────────────────────────────────
  const residentCheckbox = document.getElementById('resident');
  if (residentCheckbox) {
    residentCheckbox.addEventListener('change', toggleResidentAddressFields);
  }
  toggleResidentAddressFields();

  // ── Birthdate: set max to today + wire age feedback ────────────
  const birthdateInput = document.getElementById('birthdate');
  if (birthdateInput) {
    const today = new Date();
    const yyyy  = today.getFullYear();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');
    birthdateInput.max = `${yyyy}-${mm}-${dd}`;

    birthdateInput.addEventListener('change', () => {
      updateAgeFeedback(birthdateInput.value);
    });
  }

  // ── Schedule min date (no past dates) ──────────────────────────
  const schedInput = document.getElementById('sched');
  if (schedInput) {
    const now       = new Date();
    const offset    = now.getTimezoneOffset() * 60000;
    const local     = new Date(now - offset);
    const formatted = local.toISOString().slice(0, 16);
    schedInput.min  = formatted;
  }

  // ── Post date: no future dates ──────────────────────────────────
  const postDateInput = document.getElementById('post-date');
  if (postDateInput) {
    const today = new Date();
    const yyyy  = today.getFullYear();
    const mm    = String(today.getMonth() + 1).padStart(2, '0');
    const dd    = String(today.getDate()).padStart(2, '0');
    postDateInput.max = `${yyyy}-${mm}-${dd}`;
  }


  // ── Others checkbox toggle ──────────────────────────────────────
  const othersCheckbox = document.getElementById('skill-others');
  const othersDiv      = document.getElementById('others-div');
  if (othersCheckbox && othersDiv) {
    othersCheckbox.addEventListener('change', () => {
      othersDiv.classList.toggle('hidden', !othersCheckbox.checked);
    });
  }

  const noneCheckbox = document.querySelector('#skill-tags input[value="None"]');
  if (noneCheckbox) {
    noneCheckbox.addEventListener('change', () => {
      const otherCheckboxes = document.querySelectorAll('#skill-tags input[type="checkbox"]:not([value="None"])');
      otherCheckboxes.forEach(cb => {
        cb.checked  = false;
        cb.disabled = noneCheckbox.checked;
        const tag = cb.closest('label')?.querySelector('.skill-tag');
        if (tag) tag.style.color = noneCheckbox.checked ? 'var(--text-muted)' : '';
      });
      if (noneCheckbox.checked) {
        document.getElementById('others-div')?.classList.add('hidden');
      }
    });

    document.querySelectorAll('#skill-tags input[type="checkbox"]:not([value="None"])').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          noneCheckbox.checked = false;
          document.querySelectorAll('#skill-tags input[type="checkbox"]:not([value="None"])').forEach(other => {
            const tag = other.closest('label')?.querySelector('.skill-tag');
            if (tag) tag.style.color = '';
          });
        }
      });
    });
  }

  // ── Registration form submit ────────────────────────────────────
  const registrationForm = document.getElementById('registration-form');
  if (registrationForm) {
    registrationForm.addEventListener('submit', event => {
      event.preventDefault();
      if (currentStep === 3)      completeRegistration();
      else if (currentStep === 1) goToStep(2);
      else if (currentStep === 2) goToStep(3);
    });
  }

  // ── Feed Post Modal ─────────────────────────────────────────────

  const addPostBtn = document.getElementById('addPostBtn');
  if (addPostBtn) {
    addPostBtn.addEventListener('click', openPostModal);
  }

  const publishBtn = document.getElementById('publishPost');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      if (validatePostForm()) {
        publishPost();
        closePostModal();
      }
    });
  }

  const cancelBtn = document.getElementById('cancelPost');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closePostModal);
  }

  const closeBtn = document.querySelector('#postModal .close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePostModal);
  }

  ['postTitle', 'post-date', 'post-loc', 'post-img', 'post-award', 'post-cap', 'post-vol', 'post-fam']
    .forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(el.type === 'file' ? 'change' : 'input', () => {
        el.classList.remove('input-error');
        const err = el.parentNode.querySelector('.field-error');
        if (err) err.remove();
      });
    });

});

async function loadDashboardSummaryMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/operations/dashboard-stats`);
        if (!response.ok) throw new Error("Failed to clear backend metrics handshake.");
        
        const stats = await response.json();

        // 1. Update the Volunteer Card Elements
        const totalVolElement = document.querySelector('.stat-value-v');
        const activeVolSubElement = document.querySelector('.stat-card:nth-child(1) .stat-sub');
        
        if (totalVolElement) totalVolElement.textContent = stats.totalVolunteers;
        if (activeVolSubElement) activeVolSubElement.textContent = `${stats.activeVolunteers} active`;

        // 2. Update the Active Operations Card Elements
        const activeOpsElement = document.querySelector('.stat-value-op');
        const enrolledSubElement = document.querySelector('.stat-card:nth-child(2) .stat-sub');

        if (activeOpsElement) activeOpsElement.textContent = stats.activeOperations;
        if (enrolledSubElement) enrolledSubElement.textContent = `${stats.enrolledVolunteers} enrolled`;

        // 3. Update the decorative footer layout text variable count if it exists
        const footerVolCounter = document.getElementById('vol-num');
        if (footerVolCounter) footerVolCounter.textContent = stats.totalVolunteers;

    } catch (error) {
        console.error("Dashboard metric visualization tracking failed:", error);
    }
}

// Call the function automatically as soon as the admin portal window page loads up
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardSummaryMetrics();
});
