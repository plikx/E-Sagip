/* ============================================================
   SUPERADMIN.JS
   ============================================================ */

// ---------- Tab navigation ----------
function switchSubNav(button, tab) {
  document.querySelectorAll(".subnav-btn").forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
  document.querySelectorAll(".dashboard-content").forEach(tabContent => tabContent.classList.add("hidden"));
  const activeTab = document.getElementById("tab-" + tab);
  if (activeTab) activeTab.classList.remove("hidden");

  if (tab === "auditlog" && typeof loadAuditLogs === "function") loadAuditLogs();
}

// ---------- New Op: skill pill multi-select ----------
document.querySelectorAll('#newop-skills .pill').forEach(p => {
  p.addEventListener('click', () => p.classList.toggle('selected'));
});

/* ============================================================
   VOLUNTEERS  (superadmin version — prefixed "sa" to avoid
   colliding with script.js globals on the admin page)
   ============================================================ */

let saVolunteers        = [];
let saActiveSkillFilter = "All Skills";
let saSearchTerm        = "";

async function loadVolunteersForSuperadmin() {
  try {
    const res  = await fetch(`${API_BASE_URL}/auth/volunteers`);
    const data = await res.json();

    saVolunteers = data.map(v => ({
      id      : v.id,
      name    : `${v.first_name} ${v.last_name}`,
      initials: ((v.first_name?.[0] || '') + (v.last_name?.[0] || '')).toUpperCase(),
      status  : v.status,
      location: v.address,
      phone   : v.contact_number,
      skills  : v.skills || [],
      ops     : v.ops || 0
    }));

    renderSaFilters();
    renderSaVolunteers();
    renderSkillDistribution();
    updateVolunteerStats();
  } catch (err) {
    console.error('Failed to load volunteers for superadmin:', err);
  }
}

function updateVolunteerStats() {
  const totalEl  = document.getElementById("totalVolunteers");
  const subEl    = document.querySelector(".stat-card .stat-sub");
  const countEl  = document.getElementById("volunteerRecordCount");
  const activeCount = saVolunteers.filter(v => v.status === "active").length;
  if (totalEl)  totalEl.textContent  = saVolunteers.length;
  if (subEl)    subEl.textContent    = `${activeCount} active`;
  if (countEl)  countEl.textContent  = `${saVolunteers.length} records`;
}

function renderSkillDistribution() {
  const skillNames = [
    "Basic First Aid / CPR",
    "Medical Professional",
    "Relief Goods Packing",
    "Debris Clearing & Heavy Lifting",
    "Driver (4-Wheel / Truck / Van)",
    "Boat / Bangka Operator",
  ];

  const counts = skillNames.map(name => ({
    name,
    count: saVolunteers.filter(v => v.skills.includes(name)).length
  }));

  const max = Math.max(...counts.map(s => s.count), 1);

  document.querySelectorAll(".skills-card .skill-row").forEach((row, i) => {
    if (!counts[i]) return;
    const bar   = row.querySelector(".skill-bar");
    const count = row.querySelector(".skill-count");
    if (bar)   bar.style.width   = `${(counts[i].count / max) * 100}%`;
    if (count) count.textContent = counts[i].count;
  });
}

function renderSaFilters() {
  const uniqueSkills    = ["All Skills", ...new Set(saVolunteers.flatMap(v => v.skills))];
  const filterContainer = document.getElementById("skill-filters");
  if (!filterContainer) return;

  filterContainer.innerHTML = uniqueSkills.map(skill => `
    <button class="filter-pill ${skill === saActiveSkillFilter ? "active" : ""}" data-skill="${skill}">
      ${skill}
    </button>
  `).join("");

  document.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      saActiveSkillFilter = btn.dataset.skill;
      renderSaFilters();
      renderSaVolunteers();
    });
  });
}

function renderSaVolunteers() {
  const resultsCount  = document.getElementById("vol-count");
  const volunteerList = document.getElementById("vol-list");
  if (!volunteerList) return;

  const term = saSearchTerm.toLowerCase();

  const filtered = saVolunteers.filter(v => {
    const matchesSkill  = saActiveSkillFilter === "All Skills" || v.skills.includes(saActiveSkillFilter);
    const matchesSearch = v.name.toLowerCase().includes(term) ||
                          v.skills.some(s => s.toLowerCase().includes(term));
    return matchesSkill && matchesSearch;
  });

  if (resultsCount) {
    resultsCount.textContent = `${filtered.length} volunteer${filtered.length === 1 ? "" : "s"} found`;
  }

  if (filtered.length === 0) {
    volunteerList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No Volunteers found</h3>
        <p>Try a different search or filter.</p>
      </div>`;
    return;
  }

  volunteerList.innerHTML = filtered.map(v => {
    const isApproved      = v.status === 'active';
    const approveText     = isApproved ? 'approved' : '✓ Approve';
    const approveDisabled = isApproved ? 'disabled' : '';
    return `
      <div class="card vol-card" data-id="${v.id}">
        <div class="vol-top">
          <div class="vol-left">
            <div class="avatar">${v.initials}</div>
            <div>
              <div class="vol-name-row">
  <span class="vol-name">
    ${v.name}
    <span class="vol-badge ${v.status}">${v.status}</span>
    <span class="online-dot ${v.is_online ? 'online' : 'offline'}" title="${v.is_online ? 'Online' : 'Offline'}"></span>
  </span>
</div>
              <div class="vol-meta">${v.location} · ${v.phone}</div>
              <div class="vol-skills">
                ${v.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join("")}
              </div>
            </div>
          </div>
          <div class="vol-ops">
            <div class="num">${v.ops}</div>
            <div class="lbl">ops</div>
          </div>
        </div>
        <div class="vol-ops-btn" style="margin-top:12px;gap:8px;">
          <button class="v-edit"    onclick="openEditModal(this)">✏️ Edit</button>
          <button class="v-approve" onclick="approveVolunteer(${v.id})" ${approveDisabled}>${approveText}</button>
          <button class="v-remove"  onclick="removeVolunteer(${v.id})">🗑 Remove</button>
        </div>
      </div>`;
  }).join("");
}

function setVolFilter(btn, skill) {
  document.querySelectorAll('#vol-filter-row .vfilter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  saActiveSkillFilter = skill === 'all' ? 'All Skills' : skill;
  renderSaVolunteers();
}

function filterVolunteers() {
  saSearchTerm = document.getElementById("vol-search")?.value || "";
  renderSaVolunteers();
}

const saVolSearchInput = document.getElementById("vol-search");
if (saVolSearchInput) {
  saVolSearchInput.addEventListener("input", e => {
    saSearchTerm = e.target.value;
    renderSaVolunteers();
  });
}

/* ============================================================
   ADMINS
   ============================================================ */

let saAdmins = [];

async function loadAdminsForSuperadmin() {
  try {
    const res  = await fetch(`${API_BASE_URL}/auth/admins`);
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error("Invalid response");

    saAdmins = data.map(a => ({
      id   : a.id,
      name : a.name,
      email: a.email,
      role : a.role
    }));

    renderSaAdmins();

    const adminRecordCount = document.getElementById("adminRecordCount");
    if (adminRecordCount) adminRecordCount.textContent = `${saAdmins.length} accounts`;

  } catch (err) {
    console.error('Failed to load admins for superadmin:', err);
  }
}

function renderSaAdmins() {
  const adminContainer = document.getElementById("adminContainer");
  const adminCount     = document.getElementById("admin-count");

  if (!adminContainer) return;

  if (saAdmins.length === 0) {
    adminContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👨‍💼</div>
        <h3>No Administrator Accounts</h3>
        <p>Administrator accounts created by the Superadmin will appear here.</p>
      </div>`;
  } else {
    adminContainer.innerHTML = saAdmins.map(a => `
      <div class="card admin-card">
        <div class="admin-top">
          <div class="ad-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.35C16.5 21.15 20 16.25 20 11V5L12 2z"/>
            </svg>
          </div>
          <div class="ad-meta">
            <div class="admin-name">${a.name}</div>
            <div class="admin-email">${a.email}</div>
            <span class="role-badge">admin</span>
          </div>
        </div>
        <hr class="ad-divider">
        <div class="ad-btn">
          <button class="a-edit" onclick="openAdminEditModal(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button class="a-remove" onclick="openAdminDeleteModal(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Remove
          </button>
        </div>
      </div>
    `).join("");
  }

  if (adminCount) {
    adminCount.textContent = `${saAdmins.length} administrator account${saAdmins.length === 1 ? "" : "s"}`;
  }
}

/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadVolunteersForSuperadmin();
  loadAdminsForSuperadmin();
});

/* ============================================================
   SUPERADMIN COMMUNITY EDIT
   ============================================================ */

const editBtn = document.getElementById("editCommunityBtn");

if (editBtn) {
  let editing = false;

  editBtn.addEventListener("click", () => {
    editing = !editing;

    document.querySelectorAll(".editable").forEach(el => { el.contentEditable = editing; });

    const badge = document.getElementById("editingBadge");
    if (badge) badge.style.display = editing ? "inline-flex" : "none";

    const addFact = document.getElementById("addFactContainer");
    if (addFact) addFact.style.display = editing ? "block" : "none";

    const bulletinBadge = document.getElementById("bulletinEditingBadge");
    if (bulletinBadge) bulletinBadge.style.display = editing ? "inline-flex" : "none";

    document.querySelectorAll(".addTipContainer").forEach(c => {
      c.style.display = editing ? "block" : "none";
    });

    const addContactBtn = document.getElementById("addContactBtn");
    if (addContactBtn) addContactBtn.style.display = editing ? "flex" : "none";

    const addEvacBtn = document.getElementById("addEvacBtn");
    if (addEvacBtn) addEvacBtn.style.display = editing ? "flex" : "none";

    document.querySelectorAll(".edit-evac-btn").forEach(btn => {
      btn.style.display = editing ? "flex" : "none";
    });

    document.body.classList.toggle("community-editing", editing);

    editBtn.innerHTML = editing
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Done</span>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg><span>Edit</span>`;
  });
}

// ---------- Add Fact ----------
const addFactBtn = document.getElementById("addFactBtn");
if (addFactBtn) {
  addFactBtn.addEventListener("click", () => {
    const list             = document.querySelector(".quick-facts-list");
    const addFactContainer = document.getElementById("addFactContainer");
    if (!list) return;
    const row     = document.createElement("div");
    row.className = "fact-row";
    row.innerHTML = `
      <span class="fact-label editable" contenteditable="true">New Label</span>
      <span class="fact-value editable" contenteditable="true">New Value</span>
    `;
    addFactContainer.before(row);
  });
}

/* ============================================================
   BULLETIN - ADD TIP
   ============================================================ */

document.querySelectorAll(".add-tip-btn").forEach(button => {
  button.addEventListener("click", function () {
    const bulletinCard = this.closest(".bulletin-card");
    if (!bulletinCard) return;
    const list   = bulletinCard.querySelector(".bulletin-list");
    const total  = list.querySelectorAll(".bulletin-item").length + 1;
    const header = bulletinCard.querySelector(".bulletin-header");
    let color = "blue";
    if (header?.classList.contains("violet")) color = "violet";
    else if (header?.classList.contains("red"))   color = "red";
    else if (header?.classList.contains("green")) color = "green";
    const item     = document.createElement("div");
    item.className = "bulletin-item";
    item.innerHTML = `
      <span class="num-badge ${color}">${total}</span>
      <span class="editable" contenteditable="true">New Tip</span>
    `;
    list.appendChild(item);
  });
});

/* ============================================================
   CONTACTS - ADD CONTACT
   ============================================================ */

const addContactBtn = document.getElementById("addContactBtn");
if (addContactBtn) {
  addContactBtn.addEventListener("click", () => {
    const directory = document.querySelector(".directory-card");
    if (!directory) return;
    const row     = document.createElement("div");
    row.className = "directory-row";
    row.innerHTML = `
      <div class="directory-icon maroon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
      </div>
      <div class="directory-info">
        <div class="dir-name">New Contact</div>
        <div class="dir-sub">Category</div>
      </div>
      <div class="directory-number maroon">Contact Number</div>
    `;
    directory.appendChild(row);
  });
}
