/* ============================================================
           SUPERADMIN
   ============================================================ */


// ---------- Tab navigation ----------
function switchSubNav(button, tab) {

    document.querySelectorAll(".subnav-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");

    document.querySelectorAll(".dashboard-content").forEach(tabContent => {
        tabContent.classList.add("hidden");
    });

    const activeTab = document.getElementById("tab-" + tab);

    if (activeTab) {
        activeTab.classList.remove("hidden");
    }

}

// ---------- New Op: skill pill multi-select ----------
document.querySelectorAll('#newop-skills .pill').forEach(p => {
  p.addEventListener('click', () => p.classList.toggle('selected'));
});

// ---------- Data ----------
const skills = [
  { name: "Basic First Aid / CPR", count: 2 },
  { name: "Medical Professional", count: 2 },
  { name: "Relief Goods Packing", count: 1 },
  { name: "Debris Clearing & Heavy Lifting", count: 2 },
  { name: "Driver (4-Wheel / Truck / Van)", count: 1 },
  { name: "Boat / Bangka Operator", count: 1 },
];

const maxSkillCount = Math.max(...skills.map(s => s.count));

const activeOps = [
  {
    title: "Flood Relief Distribution",
    location: "Purok 3, Brgy. 628",
    schedule: "June 10, 2026 · 7:00 AM",
    filled: 14,
    total: 20
  },
  {
    title: "Debris Clearing Brigade",
    location: "Purok 5, Brgy. 628",
    schedule: "June 12, 2026 · 6:00 AM",
    filled: 9,
    total: 15
  },
  {
    title: "Medical Mission",
    location: "Purok 1, Brgy. 628",
    schedule: "June 14, 2026 · 8:00 AM",
    filled: 8,
    total: 12
  },
  {
    title: "Evacuation Center Support",
    location: "Purok 6, Brgy. 628",
    schedule: "June 16, 2026 · 5:00 PM",
    filled: 5,
    total: 10
  }
];


// ---------- Render: Skills distribution ----------
const skillsHTML = skills.map(s => `
<div class="skill-row">
  <div class="skill-row-top">
    <span>${s.name}</span>
    <span>${s.count}</span>
  </div>
  <div class="bar-track">
    <div class="bar-fill" style="width:${(s.count / maxSkillCount) * 100}%"></div>
  </div>
</div>
`).join("");

const skillsContainer = document.getElementById("skills-distribution");

if (skillsContainer) {
    skillsContainer.innerHTML = skillsHTML;
}

// ---------- Render: Active Operations ----------
const opsHTML = activeOps.map(op => {
  const pct = Math.round((op.filled / op.total) * 100);

  return `
  <div class="card op-card">
    <div class="op-top">
      <div>
        <div class="op-title">${op.title}</div>
        <div class="op-meta">${op.location}</div>
        <div class="op-meta">${op.schedule}</div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;">
        <span class="op-count">${op.filled}/${op.total}</span>
      </div>
    </div>

    <div class="op-progress">
      <div class="bar-track">
        <div class="bar-fill"
          style="width:${pct}%;background:var(--maroon-600)">
        </div>
      </div>
    </div>

    <button class="complete-btn">
      Complete Operation
    </button>
  </div>
  `;
}).join("");

const activeOpsContainer = document.getElementById("active-ops");

if (activeOpsContainer) {
    activeOpsContainer.innerHTML = opsHTML;
}

// ---------- Superadmin Volunteer Directory (backed by real API data) ----------
// NOTE: all names below are prefixed "sa" (superadmin) to avoid colliding with
// script.js, which already defines its own global `renderVolunteers`,
// `allVolunteers`, `filterVolunteers`, etc. for the regular admin page.

let saVolunteers = [];
let saAdmins = [];
let saActiveSkillFilter = "All Skills";
let saSearchTerm = "";

async function loadVolunteersForSuperadmin() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/volunteers`);
    const data = await res.json();

    // Adapt backend shape (first_name/last_name/skills array) to what this page's render expects
    saVolunteers = data.map(v => ({
      name: `${v.first_name} ${v.last_name}`,
      initials: ((v.first_name?.[0] || '') + (v.last_name?.[0] || '')).toUpperCase(),
      status: v.status,
      location: v.address,
      phone: v.contact_number,
      skills: v.skills || [],
      ops: v.ops || 0
    }));

    renderSaFilters();
    renderSaVolunteers();
  } catch (err) {
    console.error('Failed to load volunteers for superadmin:', err);
  }
}

function renderSaFilters() {
  const uniqueSkills = ["All Skills", ...new Set(saVolunteers.flatMap(v => v.skills))];
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
  const resultsCount = document.getElementById("results-count");
  const volunteerList = document.getElementById("vol-list");
  if (!resultsCount || !volunteerList) return;

  const term = saSearchTerm.toLowerCase();

  const filtered = saVolunteers.filter(v => {
    const matchesSkill = saActiveSkillFilter === "All Skills" || v.skills.includes(saActiveSkillFilter);
    const matchesSearch = v.name.toLowerCase().includes(term) ||
      v.skills.some(s => s.toLowerCase().includes(term));
    return matchesSkill && matchesSearch;
  });

  resultsCount.textContent = `${filtered.length} volunteer${filtered.length === 1 ? "" : "s"} found`;

  volunteerList.innerHTML = filtered.map(v => `
    <div class="card vol-card">
      <div class="vol-top">
        <div class="vol-left">
          <div class="avatar">${v.initials}</div>
          <div>
            <div class="vol-name-row">
              <span class="vol-name">${v.name}</span>
              <span class="status-badge ${v.status}">${v.status}</span>
            </div>
            <div class="vol-meta">${v.location}</div>
            <div class="vol-meta">${v.phone}</div>
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
    </div>
  `).join("");
}

const saVolSearchInput = document.getElementById("vol-search");
if (saVolSearchInput) {
  saVolSearchInput.addEventListener("input", e => {
    saSearchTerm = e.target.value;
    renderSaVolunteers();
  });
}

// Kick off the real data load
document.addEventListener('DOMContentLoaded', loadVolunteersForSuperadmin);

// ---------- Admin List ----------

function renderSaAdmins() {
    const adminContainer = document.getElementById("adminContainer");
    const adminCount = document.getElementById("admin-count");

    if (adminContainer) {
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
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
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

// Render admins once on load (currently an empty array until a real /admins endpoint exists)
renderSaAdmins();

/* ==========================================
   SUPERADMIN COMMUNITY EDIT
========================================== */

const editBtn = document.getElementById("editCommunityBtn");

if (editBtn) {

    let editing = false;

    editBtn.addEventListener("click", () => {

        editing = !editing;

        // =========================
        // EDITABLE FIELDS
        // =========================
        document.querySelectorAll(".editable").forEach(el => {
            el.contentEditable = editing;
        });

        // =========================
        // QUICK FACTS
        // =========================
        const badge = document.getElementById("editingBadge");

        if (badge) {
            badge.style.display = editing ? "inline-flex" : "none";
        }

        const addFact = document.getElementById("addFactContainer");

        if (addFact) {
            addFact.style.display = editing ? "block" : "none";
        }

        // =========================
        // BULLETIN
        // =========================

        const bulletinBadge =
            document.getElementById("bulletinEditingBadge");

        if (bulletinBadge) {
            bulletinBadge.style.display =
                editing ? "inline-flex" : "none";
        }

        document
            .querySelectorAll(".addTipContainer")
            .forEach(container => {

                container.style.display =
                    editing ? "block" : "none";

            });
             

        // =========================
        // CONTACTS
        // =========================

        const addContactBtn =
            document.getElementById("addContactBtn");

        if (addContactBtn) {

            addContactBtn.style.display =
                editing ? "flex" : "none";

        }

        // =========================
        // MAP
        // =========================

        const addEvacBtn =
            document.getElementById("addEvacBtn");

        if (addEvacBtn) {

            addEvacBtn.style.display =
                editing ? "flex" : "none";

        }

        document
            .querySelectorAll(".edit-evac-btn")
            .forEach(btn => {

                btn.style.display =
                    editing ? "flex" : "none";

            });

        document.body.classList.toggle(
            "community-editing",
            editing
        );

        editBtn.innerHTML = editing
        ? `
            <svg viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2">

                <polyline points="20 6 9 17 4 12"/>

            </svg>

            <span>Done</span>
        `
        : `
            <svg viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2">

                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>

            </svg>

            <span>Edit</span>
        `;

    });

}

//ADD FACT BUTTON
const addFactBtn = document.getElementById("addFactBtn");

if(addFactBtn){

    addFactBtn.addEventListener("click",()=>{

const list = document.querySelector(".quick-facts-list");
const addFactContainer =
document.getElementById("addFactContainer");
       if(!list) return;

        const row=document.createElement("div");

        row.className="fact-row";

        row.innerHTML=`
            <span class="fact-label editable" contenteditable="true">
                New Label
            </span>

            <span class="fact-value editable" contenteditable="true">
                New Value
            </span>
        `;

      addFactContainer.before(row);

    });

}



/* ==========================================================
   BULLETIN - ADD TIP
========================================================== */

document.querySelectorAll(".add-tip-btn").forEach(button => {

    button.addEventListener("click", function () {

        const list =
            this.closest(".bulletin-card")
                .querySelector(".bulletin-list");

        const total =
            list.querySelectorAll(".bulletin-item").length + 1;

        let color = "blue";

        if (list.closest(".bulletin-card")
                .querySelector(".bulletin-header")
                .classList.contains("violet")) {

            color = "violet";

        } else if (list.closest(".bulletin-card")
                .querySelector(".bulletin-header")
                .classList.contains("red")) {

            color = "red";

        } else if (list.closest(".bulletin-card")
                .querySelector(".bulletin-header")
                .classList.contains("green")) {

            color = "green";

        }

        const item = document.createElement("div");

        item.className = "bulletin-item";

        item.innerHTML = `

            <span class="num-badge ${color}">
                ${total}
            </span>

            <span class="editable"
                  contenteditable="true">

                New Tip

            </span>

        `;

        list.appendChild(item);

    });

});

/* ==========================================================
   CONTACTS - ADD CONTACT
========================================================== */

const addContactBtn =
document.getElementById("addContactBtn");

if(addContactBtn){

    addContactBtn.addEventListener("click",()=>{

        const directory =
        document.querySelector(".directory-card");

        const row =
        document.createElement("div");

        row.className = "directory-row";

        row.innerHTML = `

            <div class="directory-icon maroon">

                <svg viewBox="0 0 24 24"
                     fill="none"
                     stroke="currentColor"
                     stroke-width="2">

                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>

                </svg>

            </div>

            <div class="directory-info">

                <div class="dir-name">
                    New Contact
                </div>

                <div class="dir-sub">
                    Category
                </div>

            </div>

            <div class="directory-number maroon">
                Contact Number
            </div>

        `;

        directory.appendChild(row);

    });

}
