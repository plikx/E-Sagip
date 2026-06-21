const API_BASE_URL = 'https://e-sagip-production.up.railway.app/api';

/* ===== LOGIN PAGE ===== */
let allVolunteers = [];

// ── Helper: get current logged-in user from localStorage ─────────────
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
}

async function loadVolunteers() {
    const volList = document.getElementById('vol-list');
    if (!volList) return;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/volunteers`);
        allVolunteers = await response.json();
        renderVolunteers(allVolunteers);
        await loadDashboardSummaryMetrics();
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
        const isApproved = v.status === 'active';
        const approveText = isApproved ? 'approved' : '✓ Approve';
        const approveDisabled = isApproved ? 'disabled' : '';
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
                    <button class="v-edit" onclick="openEditModal(this)">✏️ Edit</button>
                    <button class="v-approve" onclick="approveVolunteer(${v.id})" ${approveDisabled}>${approveText}</button>
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

// ── FIXED: now passes adminId + adminName so audit log shows who did it
async function approveVolunteer(id) {
    const currentUser = getCurrentUser();

    try {
        await fetch(`${API_BASE_URL}/auth/volunteers/${id}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId:   currentUser?.id   || null,
                adminName: currentUser?.name || 'Admin'
            })
        });

        // Log to audit
        await logAuditAction('APPROVE_VOLUNTEER',
            `Volunteer #${id}`,
            null
        );

        if (document.body.classList.contains('superadmin-page')) {
            if (typeof loadVolunteersForSuperadmin === 'function') await loadVolunteersForSuperadmin();
        } else {
            await loadVolunteers();
        }
    } catch (err) {
        console.error('Failed to approve volunteer:', err);
        alert('Could not approve volunteer. Please try again.');
    }
}

// ── FIXED: now passes adminId + adminName as query params
async function removeVolunteer(id) {
    if (!confirm('Permanently remove this volunteer?')) return;

    const currentUser = getCurrentUser();

    // Find the volunteer name from the rendered list for a clearer audit entry
    const card = document.querySelector(`.vol-card[data-id="${id}"]`);
    const volNameEl = card?.querySelector('.vol-name');
    const volName = volNameEl
        ? volNameEl.textContent.replace(/pending|active|inactive/gi, '').trim()
        : `Volunteer #${id}`;

    try {
        const params = new URLSearchParams({
            adminId:   currentUser?.id   || '',
            adminName: currentUser?.name || 'Admin'
        });

        await fetch(`${API_BASE_URL}/auth/volunteers/${id}?${params}`, {
            method: 'DELETE'
        });

        // Log to audit
        await logAuditAction('REMOVE_VOLUNTEER', volName, 'Removed by admin');

        if (document.body.classList.contains('superadmin-page')) {
            if (typeof loadVolunteersForSuperadmin === 'function') await loadVolunteersForSuperadmin();
        } else {
            await loadVolunteers();
        }
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
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: 'admin' })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            // Log the login action
            if (typeof logAuditAction === 'function') {
    await logAuditAction('LOGIN', data.user.name, `Role: ${data.user.role}`);
}

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

async function handleSaLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

   try {
        if (
            currentUser &&
            typeof window.logAuditAction === 'function'
        ) {
            await window.logAuditAction(
                'LOGOUT',
                currentUser.name,
                `Role: ${currentUser.role}`
            );
        }
    } catch (err) {
        console.error('Audit logging failed:', err);
    } finally {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        sessionStorage.clear();

        window.location.href = 'index.html';
    }
}
async function handleLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
        const currentUser = getCurrentUser();
        if (currentUser) {
            await logAuditAction('LOGOUT', currentUser.name, `Role: ${currentUser.role}`);
        }
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        sessionStorage.clear();
        window.location.href = 'index.html';
    } catch (err) {
        console.error('Logout failed:', err);
        alert('Something went wrong during logout. Please try again.');
    }
}


/* ===== ADMIN DASHBOARD ===== */

function switchSubNav(btn, tab) {
    document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const panels = ['dashboard', 'newop', 'volunteers', 'admins', 'feed', 'auditlog', 'trash'];
    panels.forEach(id => {
        const el = document.getElementById('tab-' + id);
        if (el) el.classList.toggle('hidden', id !== tab);
    });

    // Refresh audit log when switching to it
    if (tab === 'auditlog' && typeof loadAuditLogs === 'function') {
        loadAuditLogs();
    }
}

async function toggleOp(chevronEl) {
    const card    = chevronEl.closest('.op-card');
    const details = card.querySelector('.op-details');
    const svg     = chevronEl.querySelector('svg');
    if (!details) return;

    const isOpen = details.classList.toggle('open');
    if (svg) svg.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    if (!isOpen) return;

    const opId    = card.dataset.opId;
    const tagWrap = details.querySelector('.volunteer-tags');
    if (!opId || !tagWrap) return;

    tagWrap.innerHTML = `<span class="vtag" style="opacity:0.5;">Loading…</span>`;

    try {
        const res  = await fetch(`${API_BASE_URL}/operations/${opId}/volunteers`);
        const vols = await res.json();

        tagWrap.innerHTML = (!Array.isArray(vols) || vols.length === 0)
            ? `<span class="vtag" style="opacity:0.5;font-style:italic;">No volunteers yet</span>`
            : vols.map(v => `
                <span class="vtag" title="${v.contact_number} · Joined ${new Date(v.enrolled_at).toLocaleDateString()}">
                    ${v.first_name} ${v.last_name}
                </span>`).join('');
    } catch (err) {
        console.error('Failed to load enrolled volunteers:', err);
        tagWrap.innerHTML = `<span class="vtag" style="opacity:0.5;">Could not load volunteers</span>`;
    }
}

/* ===== REGISTRATION PAGE ===== */

let currentStep = 1;
let formIsDirty = false;

function showFieldError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add('input-error');
    
    let helper = inputEl.parentNode.querySelector('.helper-text');
    if (!helper) {
        helper = document.createElement('span');
        helper.className = 'helper-text';
        inputEl.parentNode.appendChild(helper);
    }
    helper.textContent = message;
}

function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('input-error');
    const helper = inputEl.parentNode.querySelector('.helper-text');
    if (helper) helper.remove();
}

function validateName(val) {
    const trimmed = val.trim();
    if (trimmed.length < 2 || trimmed.length > 60) return false;
    return /^[a-zA-Z'\-\s]+$/.test(trimmed);
}

const REGION_CITY_DATA = {
    NCR: {
        name: "National Capital Region (NCR)",
        cities: ["Manila", "Quezon City", "Caloocan", "Makati", "Pasig", "Taguig", "Mandaluyong", "San Juan", "Las Piñas", "Malabon", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pateros", "Valenzuela"]
    },
    CAR: {
        name: "Cordillera Administrative Region (CAR)",
        cities: ["Baguio City", "La Trinidad", "Tabuk", "Bangued", "Bontoc", "Lagawe", "Kabayan"]
    },
    R1: {
        name: "Region I (Ilocos Region)",
        cities: ["Laoag", "Vigan", "San Fernando (La Union)", "Dagupan", "Urdaneta", "Alaminos", "Lingayen"]
    },
    R2: {
        name: "Region II (Cagayan Valley)",
        cities: ["Tuguegarao", "Ilagan", "Santiago", "Cauayan", "Bayombong", "Basco", "Cabarroguis"]
    },
    R3: {
        name: "Region III (Central Luzon)",
        cities: ["Malolos", "San Fernando (Pampanga)", "Angeles", "Olongapo", "Tarlac City", "Cabanatuan", "Balanga", "Iba", "San Jose Del Monte"]
    },
    R4A: {
        name: "Region IV-A (CALABARZON)",
        cities: ["Antipolo", "Bacoor", "Imus", "Dasmariñas", "Calamba", "Santa Rosa", "Biñan", "Lipa", "Batangas City", "Lucena", "San Pablo"]
    },
    MIMAROPA: {
        name: "MIMAROPA Region",
        cities: ["Puerto Princesa", "Calapan", "Mamburao", "Odiongan", "Boac", "Romblon"]
    },
    R5: {
        name: "Region V (Bicol Region)",
        cities: ["Legazpi", "Naga", "Daet", "Sorsogon City", "Masbate City", "Virac"]
    },
    R6: {
        name: "Region VI (Western Visayas)",
        cities: ["Iloilo City", "Bacolod City", "Roxas City", "Kalibo", "San Jose de Buenavista", "Jordan"]
    },
    R7: {
        name: "Region VII (Central Visayas)",
        cities: ["Cebu City", "Mandaue", "Lapu-Lapu", "Dumaguete", "Tagbilaran", "Toledo", "Talisay"]
    },
    R8: {
        name: "Region VIII (Eastern Visayas)",
        cities: ["Tacloban", "Ormoc", "Calbayog", "Catbalogan", "Maasin", "Borongan", "Catarman"]
    },
    R9: {
        name: "Region IX (Zamboanga Peninsula)",
        cities: ["Zamboanga City", "Dipolog", "Pagadian", "Isabela City", "Dapitan"]
    },
    R10: {
        name: "Region X (Northern Mindanao)",
        cities: ["Cagayan de Oro", "Iligan", "Malaybalay", "Valencia", "Oroquieta", "Ozamiz"]
    },
    R11: {
        name: "Region XI (Davao Region)",
        cities: ["Davao City", "Tagum", "Digos", "Mati", "Panabo", "Samal"]
    },
    R12: {
        name: "Region XII (SOCCSKSARGEN)",
        cities: ["General Santos", "Koronadal", "Kidapawan", "Tacurong", "Cotabato City"]
    },
    R13: {
        name: "Region XIII (Caraga)",
        cities: ["Butuan", "Surigao City", "Cabadbaran", "Tandag", "Bislig"]
    },
    BARMM: {
        name: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
        cities: ["Cotabato City", "Marawi", "Jolo", "Lamitan", "Bongao", "Shariff Aguak"]
    }
};

function getBarangaysForCity(regionKey, cityVal) {
    if (regionKey === 'NCR' && cityVal === 'Manila') {
        return ["Barangay 628", "Barangay 627", "Barangay 629", "Barangay 630", "Barangay 631", "Barangay 632", "Barangay 633", "Barangay 634", "Barangay 635", "Barangay 636"];
    }
    return ["Poblacion", "San Jose", "San Antonio", "Santa Maria", "Concepcion", "San Vicente", "Santo Domingo", "Bagong Silang", "Santa Cruz", "Rosario", "San Miguel", "San Juan", "Magsaysay"];
}

function populateCities(regionKey) {
    const citySelect = document.getElementById('address-city');
    const brgySelect = document.getElementById('address-barangay');
    if (!citySelect) return;

    citySelect.innerHTML = '<option value="" disabled selected>Select City</option>';
    if (brgySelect) brgySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>';

    const regionData = REGION_CITY_DATA[regionKey];
    if (!regionData) return;

    regionData.cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        citySelect.appendChild(opt);
    });
}

function populateBarangays(regionKey, cityVal) {
    const brgySelect = document.getElementById('address-barangay');
    if (!brgySelect) return;

    brgySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>';

    const barangays = getBarangaysForCity(regionKey, cityVal);
    if (!barangays) return;

    barangays.forEach(brgy => {
        const opt = document.createElement('option');
        opt.value = brgy;
        opt.textContent = brgy;
        brgySelect.appendChild(opt);
    });
}

function validatePostalCode(postal) {
    return /^\d{4}$/.test(postal.trim());
}

function validateStep1() {
    let isValid = true;

    const fnameInput = document.getElementById('fname');
    const fnameVal = fnameInput?.value.trim() || '';
    if (!fnameVal) { showFieldError(fnameInput, 'First name is required.'); isValid = false; }
    else if (!validateName(fnameVal)) { showFieldError(fnameInput, 'First name must contain only letters, hyphens, apostrophes and be 2-60 characters.'); isValid = false; }
    else clearFieldError(fnameInput);

    const lnameInput = document.getElementById('lname');
    const lnameVal = lnameInput?.value.trim() || '';
    if (!lnameVal) { showFieldError(lnameInput, 'Last name is required.'); isValid = false; }
    else if (!validateName(lnameVal)) { showFieldError(lnameInput, 'Last name must contain only letters, hyphens, apostrophes and be 2-60 characters.'); isValid = false; }
    else clearFieldError(lnameInput);

    const birthdateInput = document.getElementById('birthdate');
    const birthdateVal = birthdateInput?.value || '';
    if (!birthdateVal) { showFieldError(birthdateInput, 'Birthdate is required.'); isValid = false; }
    else {
        const birth = new Date(birthdateVal);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear() -
            (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
        if (age < 18) { showFieldError(birthdateInput, 'You must be at least 18 years old to register.'); isValid = false; }
        else if (age > 120) { showFieldError(birthdateInput, 'Age cannot be greater than 120 years.'); isValid = false; }
        else clearFieldError(birthdateInput);
    }

    const contactInput = document.getElementById('contact');
    const contactVal = contactInput?.value.trim() || '';
    if (!contactVal) { showFieldError(contactInput, 'Contact number is required.'); isValid = false; }
    else if (!/^\d{11}$/.test(contactVal)) { showFieldError(contactInput, 'Contact number must be exactly 11 digits.'); isValid = false; }
    else clearFieldError(contactInput);

    const emailInput = document.getElementById('email');
    const emailVal = emailInput?.value.trim() || '';
    if (!emailVal) { showFieldError(emailInput, 'Email address is required.'); isValid = false; }
    else if (!emailVal.endsWith('@gmail.com')) { showFieldError(emailInput, 'Email must be a @gmail.com address.'); isValid = false; }
    else clearFieldError(emailInput);

    const checkbox = document.getElementById('resident');
    const isResident = checkbox?.checked ?? false;
    if (isResident) {
        const purokSelect = document.getElementById('resident-address');
        if (!purokSelect?.value) { showFieldError(purokSelect, 'Please select your Purok.'); isValid = false; }
        else clearFieldError(purokSelect);
    }

    const regionSelect = document.getElementById('address-region');
    const citySelect   = document.getElementById('address-city');
    const brgySelect   = document.getElementById('address-barangay');
    const streetInput  = document.getElementById('address-street');
    const postalInput  = document.getElementById('address-postal');

    if (!regionSelect?.value) { showFieldError(regionSelect, 'Region is required.'); isValid = false; } else clearFieldError(regionSelect);
    if (!citySelect?.value)   { showFieldError(citySelect, 'City/Municipality is required.'); isValid = false; } else clearFieldError(citySelect);
    if (!brgySelect?.value)   { showFieldError(brgySelect, 'Barangay is required.'); isValid = false; } else clearFieldError(brgySelect);
    if (!streetInput?.value.trim()) { showFieldError(streetInput, 'Street Address is required.'); isValid = false; } else clearFieldError(streetInput);

    const postalVal = postalInput?.value.trim() || '';
    if (!postalVal) { showFieldError(postalInput, 'Postal Code is required.'); isValid = false; }
    else if (!validatePostalCode(postalVal)) { showFieldError(postalInput, 'Format: 4 digits (e.g. 1016)'); isValid = false; }
    else clearFieldError(postalInput);

    return isValid;
}

function validateStep2() {
    const skillSelection = document.querySelectorAll('input[name="skill"]:checked');
    const buttonsDiv = document.querySelector('.step2-buttons');
    if (skillSelection.length === 0) {
        if (buttonsDiv) {
            let helper = buttonsDiv.parentNode.querySelector('.skills-error-helper');
            if (!helper) {
                helper = document.createElement('span');
                helper.className = 'helper-text skills-error-helper';
                helper.style.marginBottom = '12px';
                buttonsDiv.parentNode.insertBefore(helper, buttonsDiv);
            }
            helper.textContent = 'Please select at least one skill to continue.';
        }
        return false;
    } else {
        const helper = buttonsDiv?.parentNode.querySelector('.skills-error-helper');
        if (helper) helper.remove();
        return true;
    }
}

function validateStep3() {
    let isValid = true;

    const questionSelect = document.getElementById('sec-question');
    if (!questionSelect?.value) { showFieldError(questionSelect, 'Please select a security question.'); isValid = false; } else clearFieldError(questionSelect);

    const answerInput = document.getElementById('sec-answer');
    if (!answerInput?.value.trim()) { showFieldError(answerInput, 'Security answer is required.'); isValid = false; } else clearFieldError(answerInput);

    const passwordInput = document.getElementById('reg-password');
    const passwordVal = passwordInput?.value || '';
    if (!passwordVal) { showFieldError(passwordInput, 'Password is required.'); isValid = false; }
    else if (passwordVal.length < 8) { showFieldError(passwordInput, 'Password must be at least 8 characters.'); isValid = false; }
    else clearFieldError(passwordInput);

    const confirmInput = document.getElementById('reg-confirm');
    const confirmVal = confirmInput?.value || '';
    if (!confirmVal) { showFieldError(confirmInput, 'Please confirm your password.'); isValid = false; }
    else if (confirmVal !== passwordVal) { showFieldError(confirmInput, 'Passwords do not match.'); isValid = false; }
    else clearFieldError(confirmInput);

    const consentInput = document.getElementById('privacy-consent');
    if (consentInput && !consentInput.checked) { showFieldError(consentInput, 'You must agree to the terms and privacy consent.'); isValid = false; }
    else if (consentInput) clearFieldError(consentInput);

    return isValid;
}

function checkCharLimits(panelId) {
    let isValid = true;
    const panel = document.getElementById(panelId);
    if (!panel) return true;

    panel.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(field => {
        const max = parseInt(field.getAttribute('maxlength'));
        if (!isNaN(max) && field.value.length > max) {
            showFieldError(field, `Character limit exceeded (maximum ${max} characters).`);
            isValid = false;
        }
    });
    return isValid;
}

function setupCharCounter(inputEl) {
    if (!inputEl) return;
    const maxLength = parseInt(inputEl.getAttribute('maxlength'));
    if (isNaN(maxLength)) return;

    let counter = inputEl.parentNode.querySelector('.char-counter');
    if (!counter) {
        counter = document.createElement('span');
        counter.className = 'char-counter';
        inputEl.parentNode.appendChild(counter);
    }

    const updateCounter = () => {
        const len = inputEl.value.length;
        counter.textContent = `${len}/${maxLength} chars`;
        counter.style.color = len > maxLength ? '#E24B4A' : '';
    };

    inputEl.addEventListener('input', updateCounter);
    updateCounter();
}

function setupLiveValidation() {
    const inputs = [
        'fname', 'lname', 'birthdate', 'contact', 'email',
        'resident-address', 'address-region', 'address-city', 'address-barangay',
        'address-street', 'address-postal',
        'sec-question', 'sec-answer', 'reg-password', 'reg-confirm', 'privacy-consent'
    ];

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date') ? 'change' : 'input';
        el.addEventListener(eventType, () => {
            if (id === 'fname' || id === 'lname') {
                if (el.value.trim() && validateName(el.value.trim())) clearFieldError(el);
            } else if (id === 'birthdate') {
                const birth = new Date(el.value);
                const today = new Date();
                const age = today.getFullYear() - birth.getFullYear() -
                    (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);
                if (age >= 18 && age <= 120) clearFieldError(el);
            } else if (id === 'contact') {
                if (/^\d{11}$/.test(el.value.trim())) clearFieldError(el);
            } else if (id === 'email') {
                if (el.value.trim().endsWith('@gmail.com')) clearFieldError(el);
            } else if (id === 'address-postal') {
                if (validatePostalCode(el.value)) clearFieldError(el);
            } else if (id === 'reg-password') {
                if (el.value.length >= 8) clearFieldError(el);
            } else if (id === 'reg-confirm') {
                const pw = document.getElementById('reg-password')?.value;
                if (el.value && el.value === pw) clearFieldError(el);
            } else if (id === 'privacy-consent') {
                if (el.checked) clearFieldError(el);
            } else {
                if (el.value.trim()) clearFieldError(el);
            }
        });
    });

    const regionSelect = document.getElementById('address-region');
    const citySelect   = document.getElementById('address-city');
    const brgySelect   = document.getElementById('address-barangay');

    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            populateCities(regionSelect.value);
            clearFieldError(regionSelect);
        });
    }
    if (citySelect) {
        citySelect.addEventListener('change', () => {
            populateBarangays(regionSelect?.value || '', citySelect.value);
            clearFieldError(citySelect);
        });
    }
    if (brgySelect) {
        brgySelect.addEventListener('change', () => clearFieldError(brgySelect));
    }

    document.querySelectorAll('input[maxlength], textarea[maxlength]').forEach(input => {
        setupCharCounter(input);
    });
}

function goToStep(step) {
    if (step === 2 && currentStep === 1) {
        if (!validateStep1() || !checkCharLimits('panel-1')) return;
    }
    if (step === 3 && currentStep === 2) {
        if (!validateStep2() || !checkCharLimits('panel-2')) return;
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
        label?.classList.remove('active');
        dot?.classList.remove('active');

        if (i < step) { circle.classList.add('done'); circle.innerHTML = '✓'; }
        else if (i === step) { circle.classList.add('active'); circle.textContent = i; label?.classList.add('active'); dot?.classList.add('active'); }
        else { circle.textContent = i; }
    }

    for (let c = 1; c <= 2; c++) {
        document.getElementById('conn-' + c)?.classList.toggle('done', step > c);
    }
}

function goBack() {
    if (currentStep <= 1) window.location.href = 'index.html';
    else goToStep(currentStep - 1);
}

function backtoS1() {
    if (currentStep <= 1) window.location.href = 'index.html';
    else goToStep(currentStep - 1);
}

function toggleResidentAddressFields() {
    const checkbox    = document.getElementById('resident');
    const purokDiv    = document.querySelector('.address-purok-div');
    const purokSelect = document.getElementById('resident-address');
    const regionSelect = document.getElementById('address-region');
    const citySelect   = document.getElementById('address-city');
    const brgySelect   = document.getElementById('address-barangay');
    const streetInput  = document.getElementById('address-street');
    const postalInput  = document.getElementById('address-postal');

    if (!checkbox || !regionSelect) return;

    const isResident = checkbox.checked;

    if (isResident) {
        if (purokDiv) purokDiv.style.display = 'block';
        if (purokSelect) purokSelect.required = true;

        regionSelect.value = 'NCR'; regionSelect.disabled = true;
        populateCities('NCR');
        citySelect.value = 'Manila'; citySelect.disabled = true;
        populateBarangays('NCR', 'Manila');
        brgySelect.value = 'Barangay 628'; brgySelect.disabled = true;
        postalInput.value = '1016'; postalInput.disabled = true;

        [regionSelect, citySelect, brgySelect, postalInput].forEach(el => clearFieldError(el));
    } else {
        if (purokDiv) {
            purokDiv.style.display = 'none';
            if (purokSelect) { purokSelect.required = false; purokSelect.value = ''; clearFieldError(purokSelect); }
        }
        regionSelect.disabled = false; regionSelect.value = '';
        citySelect.innerHTML = '<option value="" disabled selected>Select City</option>'; citySelect.disabled = false;
        brgySelect.innerHTML = '<option value="" disabled selected>Select Barangay</option>'; brgySelect.disabled = false;
        postalInput.disabled = false;
        if (postalInput.value === '1016') postalInput.value = '';
    }
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
    const skills  = [...document.querySelectorAll('input[name="skill"]:checked')].map(c => c.value);

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
    if (!validateStep3() || !checkCharLimits('panel-3')) return;

    const password = document.getElementById('reg-password')?.value;
    const question = document.getElementById('sec-question')?.value;
    const answer   = document.getElementById('sec-answer')?.value.trim();
    const isResident = document.getElementById('resident')?.checked ?? false;

    const street       = document.getElementById('address-street')?.value.trim() || '';
    const regionSelect = document.getElementById('address-region');
    const region       = regionSelect ? regionSelect.options[regionSelect.selectedIndex]?.text : '';
    const citySelect   = document.getElementById('address-city');
    const city         = citySelect?.value || '';
    const brgySelect   = document.getElementById('address-barangay');
    const brgy         = brgySelect?.value || '';
    const postal       = document.getElementById('address-postal')?.value.trim() || '';
    const country      = "Philippines";

    let address = '';
    if (isResident) {
        const purok = document.getElementById('resident-address')?.value || '';
        address = `${street}, ${purok}, ${brgy}, ${city}, ${region}, ${postal}, ${country}`;
    } else {
        address = `${street}, ${brgy}, ${city}, ${region}, ${postal}, ${country}`;
    }

    const skills = [...document.querySelectorAll('input[name="skill"]:checked')].map(cb => cb.value);

    const submitBtn = document.querySelector('button[type="submit"]');
    let originalHtml = '';
    if (submitBtn) {
        if (submitBtn.classList.contains('loading')) return;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = `<span class="spinner"></span> Submitting...`;
    }

    const payload = {
        firstName:     document.getElementById('fname')?.value.trim(),
        lastName:      document.getElementById('lname')?.value.trim(),
        birthdate:     document.getElementById('birthdate')?.value,
        gender:        document.getElementById('gender')?.value || null,
        isResident,
        address,
        contactNumber: document.getElementById('contact')?.value.trim(),
        email:         document.getElementById('email')?.value.trim(),
        ecName:        document.getElementById('ec-name')?.value.trim() || null,
        ecNumber:      document.getElementById('ec-num')?.value.trim() || null,
        secQuestion:   question,
        secAnswer:     answer,
        password,
        skills,
        otherSkill:    document.getElementById('other-skill')?.value.trim() || null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            formIsDirty = false;
            document.querySelectorAll('.reg-step-panel').forEach(p => p.classList.remove('active'));
            const success = document.getElementById('reg-success');
            if (success) success.classList.add('active');
            window.scrollTo(0, 0);
        } else {
            if (data.error && data.error.includes("already registered")) {
                const goToLogin = confirm("This email is already registered. Would you like to sign in instead?");
                if (goToLogin) { formIsDirty = false; window.location.href = 'index.html'; return; }
            } else {
                alert(data.error || 'Registration failed. Please try again.');
            }
            if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; submitBtn.innerHTML = originalHtml; }
        }
    } catch (err) {
        alert('Could not connect to the server. Please try again.');
        console.error(err);
        if (submitBtn) { submitBtn.classList.remove('loading'); submitBtn.disabled = false; submitBtn.innerHTML = originalHtml; }
    }
}

window.addEventListener('beforeunload', (e) => {
    if (formIsDirty) { e.preventDefault(); e.returnValue = ''; return ''; }
});

// ── Password Strength Meter ──────────────────────────────────────────
(function () {
    const input = document.getElementById('reg-password');
    const segs  = [1, 2, 3, 4].map(n => document.getElementById('seg' + n));
    const label = document.getElementById('pw-strength-label');
    const hint  = document.getElementById('pw-hint');

    const reqs = {
        len:   { el: document.getElementById('req-len'),   test: v => v.length >= 8,           text: 'At least 8 characters' },
        upper: { el: document.getElementById('req-upper'), test: v => /[A-Z]/.test(v),         text: 'Uppercase letter' },
        num:   { el: document.getElementById('req-num'),   test: v => /[0-9]/.test(v),         text: 'Number' },
        sym:   { el: document.getElementById('req-sym'),   test: v => /[^A-Za-z0-9]/.test(v), text: 'Special character' }
    };

    const levels = [
        { color: '#E24B4A', label: 'Weak',        hint: 'Try adding numbers or symbols' },
        { color: '#EF9F27', label: 'Fair',        hint: 'Getting there — add more variety' },
        { color: '#639922', label: 'Strong',      hint: 'A special character would help' },
        { color: '#1D9E75', label: 'Very Strong', hint: '' }
    ];

    if (!input) return;

    input.addEventListener('input', () => {
        const v = input.value;
        let score = 0;
        for (const r of Object.values(reqs)) {
            const met = r.test(v);
            if (met) score++;
            if (r.el) { r.el.textContent = (met ? '✓ ' : '✗ ') + r.text; r.el.style.color = met ? '#1D9E75' : 'gray'; }
        }
        if (!v) { segs.forEach(s => { if (s) s.style.background = '#ddd'; }); if (label) label.textContent = ''; if (hint) hint.textContent = ''; return; }
        const idx = Math.min(score - 1, 3);
        const lvl = levels[Math.max(idx, 0)];
        segs.forEach((s, i) => { if (s) s.style.background = i <= idx ? lvl.color : '#ddd'; });
        if (label) { label.textContent = lvl.label; label.style.color = lvl.color; }
        if (hint)  hint.textContent = lvl.hint;
    });
})();

/* ===== BIRTHDATE AGE DISPLAY ===== */

function calcAge(dateStr) {
    if (!dateStr) return -1;
    const dob = new Date(dateStr);
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

    if (age >= 18) { if (ageOkEl) ageOkEl.textContent = age; eligibleEl.classList.remove('hidden'); }
    else           { if (ageErrEl) ageErrEl.textContent = age; minorEl.classList.remove('hidden'); }
}

/* ===== FEED POST MODAL ===== */

function openPostModal() { document.getElementById('postModal')?.classList.remove('hidden'); }
function closePostModal() { document.getElementById('postModal')?.classList.add('hidden'); clearPostForm(); }

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

    document.querySelectorAll('.field-error').forEach(e => e.remove());
    document.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));

    let isValid = true;
    const missing = [];

    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!input) return;
        const isEmpty = field.id === 'post-img' ? input.files.length === 0 : input.value.trim() === '';
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

    if (!isValid) alert(`Please fill in the following required fields:\n\n• ${missing.join('\n• ')}`);
    return isValid;
}

/* ===== DOM READY ===== */

document.addEventListener('DOMContentLoaded', () => {
    loadVolunteers();
    loadDashboardSummaryMetrics();

    function restrictToLetters(el) {
        if (!el) return;
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', ' ', '-', "'"];
        el.addEventListener('keydown', e => { if (!allowed.includes(e.key) && !/^[a-zA-Z\s'\-]$/.test(e.key)) e.preventDefault(); });
        el.addEventListener('paste',   e => { if (/[^a-zA-Z\s'\-]/.test(e.clipboardData.getData('text'))) e.preventDefault(); });
        el.addEventListener('drop',    e => { if (/[^a-zA-Z\s'\-]/.test(e.dataTransfer.getData('text'))) e.preventDefault(); });
    }

    function restrictToNumbers(el) {
        if (!el) return;
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];
        el.addEventListener('keydown', e => { if (!allowed.includes(e.key) && !/^[0-9]$/.test(e.key)) e.preventDefault(); });
        el.addEventListener('paste',   e => { if (/[^0-9]/.test(e.clipboardData.getData('text'))) e.preventDefault(); });
        el.addEventListener('drop',    e => { if (/[^0-9]/.test(e.dataTransfer.getData('text'))) e.preventDefault(); });
    }

    function restrictToSlots(el) {
        if (!el) return;
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        el.addEventListener('keydown', e => { if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault(); });
        el.addEventListener('input', () => {
            const val = parseInt(el.value);
            if (isNaN(val) || val < 1) el.value = '';
            else if (val > 1000) el.value = 1000;
        });
        el.addEventListener('paste', e => {
            e.preventDefault();
            const num = parseInt((e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, ''));
            if (!isNaN(num)) el.value = Math.min(Math.max(num, 1), 1000);
        });
    }

    restrictToLetters(document.getElementById('fname'));
    restrictToLetters(document.getElementById('lname'));
    restrictToLetters(document.getElementById('ec-name'));
    restrictToNumbers(document.getElementById('contact'));
    restrictToNumbers(document.getElementById('ec-num'));
    restrictToNumbers(document.getElementById('post-fam'));
    restrictToSlots(document.getElementById('slots'));
    restrictToSlots(document.getElementById('post-vol'));

    const residentCheckbox = document.getElementById('resident');
    if (residentCheckbox) residentCheckbox.addEventListener('change', toggleResidentAddressFields);
    toggleResidentAddressFields();
    setupLiveValidation();

    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        const today = new Date();
        birthdateInput.max = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        birthdateInput.addEventListener('change', () => updateAgeFeedback(birthdateInput.value));
    }

    const schedInput = document.getElementById('sched');
    if (schedInput) {
        const now = new Date();
        schedInput.min = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    const postDateInput = document.getElementById('post-date');
    if (postDateInput) {
        const today = new Date();
        postDateInput.max = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    }

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
            document.querySelectorAll('#skill-tags input[type="checkbox"]:not([value="None"])').forEach(cb => {
                cb.checked = false;
                cb.disabled = noneCheckbox.checked;
                const tag = cb.closest('label')?.querySelector('.skill-tag');
                if (tag) tag.style.color = noneCheckbox.checked ? 'var(--text-muted)' : '';
            });
            if (noneCheckbox.checked) document.getElementById('others-div')?.classList.add('hidden');
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

    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('input',  () => { formIsDirty = true; });
        registrationForm.addEventListener('change', () => { formIsDirty = true; });
        registrationForm.addEventListener('submit', event => {
            event.preventDefault();
            if (currentStep === 3)      completeRegistration();
            else if (currentStep === 1) goToStep(2);
            else if (currentStep === 2) goToStep(3);
        });
    }

    const addPostBtn = document.getElementById('addPostBtn');
    if (addPostBtn) addPostBtn.addEventListener('click', openPostModal);

    const publishBtn = document.getElementById('publishPost');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            if (validatePostForm()) { publishPost(); closePostModal(); }
        });
    }

    const cancelBtn = document.getElementById('cancelPost');
    if (cancelBtn) cancelBtn.addEventListener('click', closePostModal);

    const closeBtn = document.querySelector('#postModal .close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closePostModal);

    ['postTitle', 'post-date', 'post-loc', 'post-img', 'post-award', 'post-cap', 'post-vol', 'post-fam'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(el.type === 'file' ? 'change' : 'input', () => {
            el.classList.remove('input-error');
            el.parentNode.querySelector('.field-error')?.remove();
        });
    });
});

/* ===== DASHBOARD METRICS ===== */

async function loadDashboardSummaryMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/operations/dashboard-stats`);
        if (!response.ok) throw new Error("Failed to fetch metrics.");
        const stats = await response.json();

        const totalVolElement     = document.querySelector('.stat-value-v');
        const activeVolSubElement = document.querySelector('.stat-card:nth-child(1) .stat-sub');
        const activeOpsElement    = document.querySelector('.stat-value-op');
        const enrolledSubElement  = document.querySelector('.stat-card:nth-child(2) .stat-sub');

        if (totalVolElement)     totalVolElement.textContent     = stats.totalVolunteers;
        if (activeVolSubElement) activeVolSubElement.textContent = `${stats.activeVolunteers} active`;
        if (activeOpsElement)    activeOpsElement.textContent    = stats.activeOperations;
        if (enrolledSubElement)  enrolledSubElement.textContent  = `${stats.enrolledVolunteers} enrolled`;

        const totalVolImpact = document.getElementById('totalVolunteers');
        const completedOpsEl = document.getElementById('completedOperations');
        const footerVolCount = document.getElementById('vol-num');

        if (totalVolImpact) totalVolImpact.textContent = stats.totalVolunteers;
        if (completedOpsEl) completedOpsEl.textContent = stats.activeOperations;
        if (footerVolCount) footerVolCount.textContent = stats.totalVolunteers;

    } catch (error) {
        console.error("Dashboard metric visualization tracking failed:", error);
    }
}

/* ===== SKILLS DISTRIBUTION ===== */

async function loadLiveSkillsDistributionGraph() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/volunteers`);
        if (!response.ok) throw new Error("Failed to fetch volunteers.");

        const volunteersList = await response.json();
        const dataMap = {};

        volunteersList.forEach(v => {
            if (v.status === 'active') {
                (Array.isArray(v.skills) ? v.skills : []).forEach(skillName => {
                    const cleanName = skillName.trim();
                    dataMap[cleanName] = (dataMap[cleanName] || 0) + 1;
                });
            }
        });

        const highestCount = Math.max(...Object.values(dataMap), 1);

        document.querySelectorAll('.skills-card .skill-row').forEach(row => {
            const labelEl = row.querySelector('.skill-label');
            const barEl   = row.querySelector('.skill-bar');
            const countEl = row.querySelector('.skill-count');
            if (!labelEl || !barEl || !countEl) return;

            const skillName = labelEl.textContent.trim();
            const count     = dataMap[skillName] || 0;
            countEl.textContent = count;
            barEl.style.width   = `${(count / highestCount) * 100}%`;
        });

    } catch (error) {
        console.error("Failed calculating skills distribution:", error);
    }
}
