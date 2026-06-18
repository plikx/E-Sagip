


/* ===== CLIENT: COMMUNITY INFORMATION PAGE ===== */

/**
 * Switch between Info Hub / Map / Bulletin / Contacts tabs
 * on the Community Information page.
 * @param {string} tab - 'infohub' | 'map' | 'bulletin' | 'contacts'
 */
function switchCommunityTab(tab) {
  const tabs = ['infohub', 'map', 'bulletin', 'contacts'];

  tabs.forEach(id => {
    const btn   = document.getElementById('ctab-' + id);
    const panel = document.getElementById('cpanel-' + id);
    if (!btn || !panel) return;

    if (id === tab) {
      btn.classList.add('active');
      panel.classList.add('active');
    } else {
      btn.classList.remove('active');
      panel.classList.remove('active');
    }
  });

  // When switching to the map tab, invalidate size so Leaflet renders correctly
  if (tab === 'map' && window._brgyMap) {
    setTimeout(() => window._brgyMap.invalidateSize(), 100);
  }

  window.scrollTo(0, 0);
}

/* ===== LEAFLET MAP INITIALISATION ===== */

/**
 * Build a circular SVG div-icon for Leaflet.
 * @param {string} colorClass - CSS class: 'maroon' | 'green' | 'red' | 'blue'
 * @param {string} svgPath    - Inner SVG path/shape markup
 */
function makePinIcon(colorClass, svgPath) {
  return L.divIcon({
    className: 'brgy-map-pin',
    html: `<div class="pin-icon ${colorClass}">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               ${svgPath}
             </svg>
           </div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
    popupAnchor:[0, -16]
  });
}

/**
 * Initialise the Leaflet map centred on Barangay 628, Sta. Mesa, Manila.
 * Called once on DOMContentLoaded.
 */
function initBrgyMap() {
  const mapEl = document.getElementById('brgy-map');
  if (!mapEl || typeof L === 'undefined') return;   // not on this page / Leaflet not loaded
  if (window._brgyMap) return;                       // already initialised

  // Centre: Barangay 628, Sta. Mesa, Manila
  const center = [14.5995, 121.0082];

  const map = L.map('brgy-map', {
    center: center,
    zoom:   16,
    zoomControl: true,
    attributionControl: true
  });

  // OpenStreetMap tile layer (free, no API key needed)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // ── SVG snippets for each category ──────────────────────────────
  const homeIcon   = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>';
  const shieldIcon = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>';
  const flameIcon  = '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>';
  const crossIcon  = '<path d="M22 12h-4"/><path d="M6 12H2"/><path d="M12 6V2"/><path d="M12 22v-4"/><rect x="9" y="9" width="6" height="6" rx="1"/>';
  const dropIcon   = '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>';

  // ── Location data ────────────────────────────────────────────────
  const locations = [
    // Barangay Hall
    {
      lat: 14.5998, lng: 121.0078,
      color: 'maroon', svg: homeIcon,
      name: 'Barangay 628 Hall',
      desc: 'Barangay Hall · Mon–Fri 8 AM–5 PM'
    },
    // Evacuation centres
    {
      lat: 14.6012, lng: 121.0095,
      color: 'green', svg: homeIcon,
      name: 'Sta. Mesa National High School',
      desc: 'Primary Evacuation Center · Capacity: 500 persons'
    },
    {
      lat: 14.5990, lng: 121.0065,
      color: 'green', svg: homeIcon,
      name: 'Brgy. 628 Covered Court',
      desc: 'Secondary Evacuation Center · Capacity: 200 persons'
    },
    {
      lat: 14.5975, lng: 121.0110,
      color: 'green', svg: homeIcon,
      name: 'Manila Science High School',
      desc: 'Tertiary Evacuation Center · Capacity: 300 persons'
    },
    // Fire station
    {
      lat: 14.6005, lng: 121.0055,
      color: 'red', svg: flameIcon,
      name: 'BFP Sta. Mesa Fire Station',
      desc: 'Bureau of Fire Protection · (02) 8714-0000'
    },
    // Health facility
    {
      lat: 14.5985, lng: 121.0100,
      color: 'blue', svg: crossIcon,
      name: 'Barangay Health Center',
      desc: 'Health Facility · Barangay 628'
    },
    // Water / Estero
    {
      lat: 14.5970, lng: 121.0075,
      color: 'blue', svg: dropIcon,
      name: 'Estero de Paco',
      desc: 'Water / Estero · High flood-risk area'
    }
  ];

  locations.forEach(loc => {
    const icon = makePinIcon(loc.color, loc.svg);
    L.marker([loc.lat, loc.lng], { icon })
      .addTo(map)
      .bindTooltip(loc.name, {
        className: 'brgy-map-tooltip',
        permanent: false,
        direction: 'top',
        offset: [0, -14]
      })
      .bindPopup(
        `<div class="brgy-map-popup"><strong>${loc.name}</strong><br>${loc.desc}</div>`,
        { maxWidth: 200 }
      );
  });

  // Store reference so switchCommunityTab can call invalidateSize()
  window._brgyMap = map;
}

// Initialise map after DOM is ready (Leaflet must already be loaded)
document.addEventListener('DOMContentLoaded', () => {
  // Existing DOMContentLoaded listeners are defined earlier in the file;
  // this one handles only the map, which is safe to add separately.
  initBrgyMap();
}); 




 //Volunteer Logout with confirm alert

function handleVolunteerLogout() {
    const isSure = confirm("Are you sure you want to log out?");
    if (isSure) {
        window.location.href = 'index.html'; // Adjust this to your actual login page filename
    }
}


//Tab switching for Volunteer Portal
function switchVolunteerTab(btn, tabId) {
    // Nav buttons update
    document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Panel update
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('vtab-' + tabId);
    if (target) target.classList.remove('hidden');

    window.scrollTo(0, 0);
}


//para sa month
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const leaderboardMonth = document.getElementById("leaderboardMonth");

if (leaderboardMonth) {
    const today = new Date();
    leaderboardMonth.textContent =
        `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
}


// Keep track of which account we're recovering across steps
let recoveryState = {
  email: "",
  securityQuestion: "",
  securityAnswer: ""
};
 
/* ---------- Step navigation ---------- */
function showStep(stepId) {
  document.querySelectorAll(".recovery-step").forEach((step) => {
    step.classList.add("hidden");
  });
  document.getElementById(stepId).classList.remove("hidden");
}
 
/* ---------- Show / hide password ---------- */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.classList.toggle("active", isHidden);
}
 
/* ---------- Helpers ---------- */
function showFieldError(errorId) {
  document.getElementById(errorId).classList.remove("hidden");
}
 
function hideFieldError(errorId) {
  document.getElementById(errorId).classList.add("hidden");
}
 
/* ============================================================
   STEP 1: Find account by email
   ============================================================ */
function handleFindAccount() {
  const emailInput = document.getElementById("rec-email");
  const email = emailInput.value.trim();
  hideFieldError("email-error");
 
  if (!email) {
    document.getElementById("email-error").textContent =
      "Please enter your registered email address.";
    showFieldError("email-error");
    return;
  }
 
  // ---- TODO: Replace with real lookup (API call) ----
  // Demo "database" of registered accounts and their security questions.
  const demoAccounts = {
    "juan@email.com": {
      question: "What is your mother's maiden name?"
    }
  };
 
  const account = demoAccounts[email.toLowerCase()];
 
  if (!account) {
    document.getElementById("email-error").textContent =
      "No account found with that email address.";
    showFieldError("email-error");
    return;
  }
  // ---- end TODO ----
 
  recoveryState.email = email;
  recoveryState.securityQuestion = account.question;
 
  document.getElementById("security-question-text").textContent =
    account.question;
 
  showStep("step-security");
}
 
/* ============================================================
   STEP 2: Verify security question answer
   ============================================================ */
function handleVerifyAnswer() {
  const answerInput = document.getElementById("rec-answer");
  const answer = answerInput.value.trim();
  hideFieldError("answer-error");
 
  if (!answer) {
    document.getElementById("answer-error").textContent =
      "Please enter your answer.";
    showFieldError("answer-error");
    return;
  }
 
  // ---- TODO: Replace with real verification (API call) ----
  // For demo purposes, any non-empty answer is accepted.
  const isCorrect = true;
  // ---- end TODO ----
 
  if (!isCorrect) {
    document.getElementById("answer-error").textContent =
      "That answer doesn't match our records.";
    showFieldError("answer-error");
    return;
  }
 
  recoveryState.securityAnswer = answer;
  showStep("step-reset");
}
 
/* ============================================================
   STEP 3: Set a new password
   ============================================================ */
function handleResetPassword() {
  const newPasswordInput = document.getElementById("rec-new-password");
  const confirmPasswordInput = document.getElementById("rec-confirm-password");
 
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;
 
  hideFieldError("new-password-error");
  hideFieldError("confirm-password-error");
 
  let hasError = false;
 
  if (newPassword.length < 8) {
    showFieldError("new-password-error");
    hasError = true;
  }
 
  if (confirmPassword !== newPassword || confirmPassword === "") {
    showFieldError("confirm-password-error");
    hasError = true;
  }
 
  if (hasError) return;
 
  // ---- TODO: Replace with real password update (API call) ----
  // e.g. send recoveryState.email + newPassword to your backend.
  // ---- end TODO ----
 
  showStep("step-success");
}
 

function setFilter(button){

    document.querySelectorAll(".ops-filters button")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

}


// ===== Join modal & approval check =====
function openJoinModal(operationName) {
  const modal = document.getElementById('joinModal');
  const nameEl = document.getElementById('joinOperationName');
  if (nameEl) nameEl.textContent = operationName || 'Operation';
  if (modal) modal.classList.remove('hidden');
}

function closeJoinModal() {
  const modal = document.getElementById('joinModal');
  if (modal) modal.classList.add('hidden');
}

function showNotApprovedModal() {
  const modal = document.getElementById('notApprovedModal');
  if (modal) modal.classList.remove('hidden');
}

function closeNotApprovedModal() {
  const modal = document.getElementById('notApprovedModal');
  if (modal) modal.classList.add('hidden');
}

function confirmJoin() {
  // check localStorage flag set during registration
  let approved = false;
  try {
    approved = localStorage.getItem('userApproved') === 'true';
  } catch (e) {
    approved = false;
  }

  if (!approved) {
    closeJoinModal();
    showNotApprovedModal();
    return;
  }

  // proceed to join - demo behaviour: close modal and show success
  closeJoinModal();
  alert('You have successfully joined the operation. Thank you!');
}






