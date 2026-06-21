// ── Profanity Filter ─────────────────────────────────────────────────
const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard',
  'putang ina', 'gago', 'tangina', 'puta', 'ulol',
  'bobo', 'tanga', 'inutil', 'leche', 'punyeta'
];

const profanityFlags = {};

function containsProfanity(text) {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word.toLowerCase()));
}

function sanitizeText(text) {
  let sanitized = text;
  BLOCKED_WORDS.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    sanitized = sanitized.replace(regex, '*'.repeat(word.length));
  });
  return sanitized;
}

function hasProfanityFlags() {
  return Object.values(profanityFlags).some(flag => flag === true);
}

function applyProfanityFilter(el) {
  if (!el) return;

  const warningId = `profanity-warning-${el.id}`;
  profanityFlags[el.id] = false;

  if (!document.getElementById(warningId)) {
    const warn = document.createElement('span');
    warn.id = warningId;
    warn.style.cssText = 'display:none; font-size:12px; color:#c0392b; margin-top:3px;';
    warn.textContent = '⚠ Inappropriate content detected. Please remove it to continue.';
    el.insertAdjacentElement('afterend', warn);
  }

  el.addEventListener('input', function () {
    const warning = document.getElementById(warningId);

    if (containsProfanity(this.value)) {
      const cursor = this.selectionStart;
      this.value = sanitizeText(this.value);
      this.setSelectionRange(cursor, cursor);
      profanityFlags[el.id] = true;
      this.style.borderColor = '#c0392b';
      if (warning) warning.style.display = 'block';
    } else {
      profanityFlags[el.id] = false;
      this.style.borderColor = '';
      if (warning) warning.style.display = 'none';
    }

    if (this.id === 'desc-op') {
      const counter = document.getElementById('desc-count');
      if (counter) counter.textContent = this.value.length;
    }
  });
}

document.getElementById('desc-op').addEventListener('input', function () {
  if (this.value.length > 300) {
    this.value = this.value.slice(0, 300);
  }

  document.getElementById('desc-count').textContent = this.value.length;
});

// ── Field Validation Helpers ──────────────────────────────────────────
function setFieldError(el, hasError) {
  if (!el) return;
  el.style.borderColor = hasError ? '#c0392b' : '';
}

function clearAllFieldErrors(fields) {
  fields.forEach(el => setFieldError(el, false));
}

// ── Logout ────────────────────────────────────────────────────────────
async function handleSaLogout() {
  const confirmed = confirm('Are you sure you want to logout?');
  if (!confirmed) return;

  try {
    localStorage.removeItem('user');
    sessionStorage.clear();
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Logout failed:', err);
    alert('Something went wrong during logout. Please try again.');
  }
}

// ── Deploy Operation ─────────────────────────────────────────────────
async function handleDeployOp() {
  const titleInput    = document.querySelector('.form-group input[placeholder="e.g. Flood Relief Distribution"]');
  const locationInput = document.querySelector('.form-group input[placeholder="Purok/Street, Brgy. 628, Sta. Mesa"]');
  const schedInput    = document.getElementById('sched');
  const slotsInput    = document.getElementById('slots');
  const descInput     = document.querySelector('#tab-newop textarea[placeholder]');

  const title       = titleInput?.value.trim();
  const location    = locationInput?.value.trim();
  const sched       = schedInput?.value;
  const slots       = slotsInput?.value;
  const description = descInput?.value.trim() || '';

  // ── Required fields validation with red border ───────────────────
  let hasError = false;

  setFieldError(titleInput,    !title);
  setFieldError(locationInput, !location);
  setFieldError(schedInput,    !sched);
  setFieldError(slotsInput,    !slots);

  if (!title || !location || !sched || !slots) {
    hasError = true;
  }

  if (hasError) {
    alert('Please fill in all required fields.');
    return;
  }

  // ── Block deploy if any field triggered profanity ────────────────
  if (hasProfanityFlags()) {
    alert('One or more fields contain inappropriate content. Please clear them before submitting.');
    return;
  }

  const checkedSkills = [...document.querySelectorAll('#skill-tags input[type="checkbox"]:checked')];
  if (checkedSkills.length === 0) {
    alert('Please select at least one required skill.');
    return;
  }
  const skills = checkedSkills.map(cb => cb.value).filter(v => v !== 'Others');

  const othersChecked = document.getElementById('skill-others')?.checked;
  const otherSkillVal = document.getElementById('other-skill')?.value.trim();
  if (othersChecked && !otherSkillVal) {
    alert('Please describe the other required skills.');
    return;
  }

  const scheduledAt = sched.replace('T', ' ') + ':00';

  const adminId = (() => {
    try { return JSON.parse(localStorage.getItem('user'))?.id || null; }
    catch { return null; }
  })();

  const deployBtn = document.querySelector('.btn-deploy');
  if (deployBtn) { deployBtn.disabled = true; deployBtn.textContent = 'Deploying…'; }

  try {
    const res = await fetch(`${API_BASE_URL}/operations/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        location,
        scheduledAt,
        slots: Number(slots),
        description,
        skills,
        otherSkill: othersChecked ? otherSkillVal : null,
        createdBy: adminId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Server returned ${res.status}`);
    }

    const dateObj       = new Date(sched);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const schedDisplay  = `${formattedDate} · ${formattedTime}`;

    const safeTitle    = sanitizeText(title);
    const safeLocation = sanitizeText(location);

    const card = document.createElement('div');
    card.className    = 'op-card';
    card.dataset.opId = data.operationId;

    card.innerHTML = `
      <div class="op-header">
        <span class="op-name">${safeTitle}</span>
        <span class="op-count">
          0/${slots}
          <span class="chevron" onclick="toggleOp(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </span>
      </div>
      <div class="meta-container">
        <div class="op-meta">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            ${safeLocation}
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ${schedDisplay}
          </span>
        </div>
      </div>
      <div class="op-progress-bar"><div class="op-progress-fill" style="width:0%"></div></div>
      <div class="comp-container">
        <button class="complete" onclick="completeOp(${data.operationId})">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a7a40" stroke-width="2" width="28" height="28">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>Complete
        </button>
      </div>
      <div class="op-details">
        <p>Enrolled volunteers:</p>
        <div class="volunteer-tags">
          <span class="vtag" style="opacity:0.5;font-style:italic;">No volunteers yet</span>
        </div>
      </div>
    `;

    const noOpt = document.querySelector('.empty-state');
    if (noOpt) noOpt.style.display = 'none';
    document.getElementById('operation-list').appendChild(card);

    const statEl = document.querySelector('.stat-value-op');
    if (statEl) statEl.textContent = Number(statEl.textContent) + 1;

    document.querySelectorAll('.dashboard-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-dashboard').classList.remove('hidden');

    // ── Reset form ───────────────────────────────────────────────
    titleInput.value    = '';
    locationInput.value = '';
    schedInput.value    = '';
    slotsInput.value    = '';
    if (descInput) descInput.value = '';
    document.querySelectorAll('#skill-tags input[type="checkbox"]').forEach(cb => {
      cb.checked  = false;
      cb.disabled = false;
    });
    document.getElementById('others-div').classList.add('hidden');
    document.getElementById('other-skill').value = '';

    // clear red borders and profanity flags
    clearAllFieldErrors([titleInput, locationInput, schedInput, slotsInput]);
    Object.keys(profanityFlags).forEach(k => profanityFlags[k] = false);

    const descCount = document.getElementById('desc-count');
    if (descCount) descCount.textContent = '0';

    alert('Operation deployed successfully!');
  } catch (err) {
    console.error('Deploy failed:', err);
    alert('Failed to deploy operation: ' + err.message);
  } finally {
    if (deployBtn) { deployBtn.disabled = false; deployBtn.innerHTML = '🚀Deploy Operation'; }
  }
}

// ── Load Active Operations ────────────────────────────────────────────
async function loadActiveOperations() {
  try {
    const res = await fetch(`${API_BASE_URL}/operations/active`);
    const ops = await res.json();
    if (!Array.isArray(ops) || ops.length === 0) return;

    const noOpt = document.querySelector('.empty-state');
    if (noOpt) noOpt.style.display = 'none';

    const list = document.getElementById('operation-list');

    ops.forEach(op => {
      const dateObj       = new Date(op.scheduled_at);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const schedDisplay  = `${formattedDate} · ${formattedTime}`;

      const filled = op.enrolled_count || 0;
      const pct    = op.volunteer_slots > 0 ? Math.round((filled / op.volunteer_slots) * 100) : 0;

      const safeTitle    = sanitizeText(op.title);
      const safeLocation = sanitizeText(op.location);

      const card = document.createElement('div');
      card.className    = 'op-card';
      card.dataset.opId = op.id;
      card.innerHTML = `
        <div class="op-header">
          <span class="op-name">${safeTitle}</span>
          <span class="op-count">
            ${filled}/${op.volunteer_slots}
            <span class="chevron" onclick="toggleOp(this)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </span>
        </div>
        <div class="meta-container">
          <div class="op-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${safeLocation}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${schedDisplay}
            </span>
          </div>
        </div>
        <div class="op-progress-bar"><div class="op-progress-fill" style="width:${pct}%"></div></div>
        <div class="comp-container">
          <button class="complete" onclick="completeOp(${op.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1a7a40" stroke-width="2" width="28" height="28">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>Complete
          </button>
        </div>
        <div class="op-details">
          <p>Enrolled volunteers:</p>
          <div class="volunteer-tags">
            <span class="vtag" style="opacity:0.5;font-style:italic;">No volunteers yet</span>
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    const statEl = document.querySelector('.stat-value-op');
    if (statEl) statEl.textContent = ops.length;

  } catch (err) {
    console.error('Failed to load active operations:', err);
  }
}

// ── DOMContentLoaded ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadActiveOperations();

  const titleInput    = document.querySelector('.form-group input[placeholder="e.g. Flood Relief Distribution"]');
  const locationInput = document.querySelector('.form-group input[placeholder="Purok/Street, Brgy. 628, Sta. Mesa"]');
  const schedInput    = document.getElementById('sched');
  const slotsInput    = document.getElementById('slots');
  const descInput     = document.getElementById('desc-op');

  applyProfanityFilter(titleInput);
  applyProfanityFilter(locationInput);
  applyProfanityFilter(descInput);

  // ── Clear red border as user fills in each field ─────────────────
  [titleInput, locationInput, schedInput, slotsInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', function () {
      if (this.value.trim()) setFieldError(this, false);
    });
  });
});
