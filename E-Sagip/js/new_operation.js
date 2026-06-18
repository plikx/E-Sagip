async function handleDeployOp() {
  const titleInput    = document.querySelector('.form-group input[placeholder="e.g. Flood Relief Distribution"]');
  const locationInput = document.querySelector('.form-group input[placeholder="Purok/Street, Brgy. 628, Sta. Mesa"]');
  const schedInput    = document.getElementById('sched');
  const slotsInput    = document.getElementById('slots');
  const descInput     = document.querySelector('#tab-newop textarea[placeholder]');

  const title    = titleInput?.value.trim();
  const location = locationInput?.value.trim();
  const sched    = schedInput?.value;
  const slots    = slotsInput?.value;
  const description = descInput?.value.trim() || '';

  if (!title || !location || !sched || !slots) {
    alert('Please fill in all required fields (Title, Location, Schedule, Slots).');
    return;
  }

  // Required skills
  const checkedSkills = [...document.querySelectorAll('#skill-tags input[type="checkbox"]:checked')];
  if (checkedSkills.length === 0) {
    alert('Please select at least one required skill.');
    return;
  }
  const skills = checkedSkills.map(cb => cb.value).filter(v => v !== 'Others');

  // "Others" textarea
  const othersChecked = document.getElementById('skill-others')?.checked;
  const otherSkillVal = document.getElementById('other-skill')?.value.trim();
  if (othersChecked && !otherSkillVal) {
    alert('Please describe the other required skills.');
    return;
  }

  // Convert "2026-06-18T14:30" -> "2026-06-18 14:30:00" for MySQL DATETIME
  const scheduledAt = sched.replace('T', ' ') + ':00';

  // Logged-in admin id, if you store it after login
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

    // ── Render card in dashboard ──
    const dateObj = new Date(sched);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const schedDisplay = `${formattedDate} · ${formattedTime}`;

    const card = document.createElement('div');
    card.className = 'op-card';
    card.innerHTML = `
      <div class="op-header">
        <span class="op-name">${title}</span>
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
            ${location}
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
        <button class="complete" onclick="complete()">
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

    // Switch to dashboard tab
    document.querySelectorAll('.dashboard-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById('tab-dashboard').classList.remove('hidden');

    // Reset form
    titleInput.value = '';
    locationInput.value = '';
    schedInput.value = '';
    slotsInput.value = '';
    if (descInput) descInput.value = '';
    document.querySelectorAll('#skill-tags input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.disabled = false;
    });
    document.getElementById('others-div').classList.add('hidden');
    document.getElementById('other-skill').value = '';

    alert('Operation deployed successfully!');
  } catch (err) {
    console.error('Deploy failed:', err);
    alert('Failed to deploy operation: ' + err.message);
  } finally {
    if (deployBtn) { deployBtn.disabled = false; deployBtn.innerHTML = '🚀Deploy Operation'; }
  }
}
