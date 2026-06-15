/* ===== LOGIN PAGE ===== */

/**
 * Switch between Volunteer and Admin tabs on the login page.
 */
function switchTab(tab) {
  const formVolunteer = document.getElementById('form-volunteer');
  const formAdmin     = document.getElementById('form-admin');
  const tabVolunteer  = document.getElementById('tab-volunteer');
  const tabAdmin      = document.getElementById('tab-admin');

  if (!formVolunteer) return; // not on login page

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

/**
 * Toggle password visibility.
 * @param {string} inputId  - ID of the password input
 * @param {HTMLElement} btn - The toggle button element
 */
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

/**
 * Handle volunteer login form submission.
 */
function handleVolunteerLogin() {
  const email    = document.getElementById('v-email')?.value.trim();
  const password = document.getElementById('v-password')?.value;

  if (!email || !password) {
    alert('Please enter your email and password.');
    return;
  }

  // Demo: accept any non-empty credentials for volunteers
  alert('Volunteer sign-in successful!');
}

/**
 * Handle admin login form submission.
 * Redirects to admin.html on success.
 */
function handleAdminLogin() {
  const email    = document.getElementById('a-email')?.value.trim();
  const password = document.getElementById('a-password')?.value;

  if (!email || !password) {
    alert('Please enter your admin credentials.');
    return;
  }

  // Demo: any credentials redirect to admin dashboard
  window.location.href = 'admin_page.html';
}


/* ===== ADMIN DASHBOARD ===== */

/**
 * Switch between sub-nav tabs on the admin dashboard.
 * @param {HTMLElement} btn  - Clicked button
 * @param {string}      tab  - Tab identifier
 */
function switchSubNav(btn, tab) {
  // Update button states
  document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Show/hide panels
  const panels = ['dashboard', 'newop', 'volunteers', 'feed'];
  panels.forEach(id => {
    const el = document.getElementById('tab-' + id);
    if (el) {
      el.classList.toggle('hidden', id !== tab);
    }
  });
}

/**
 * Toggle the expanded details section of an operation card.
 * @param {HTMLElement} chevronEl - The chevron span that was clicked
 */
function toggleOp(chevronEl) {
  const card    = chevronEl.closest('.op-card');
  const details = card.querySelector('.op-details');
  const svg     = chevronEl.querySelector('svg');

  if (!details) return;

  const isOpen = details.classList.toggle('open');
  if (svg) {
    svg.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

/**
 * Logout – redirect back to the login page.
 */
function handleLogout() {
  if (confirm('Sign out of the admin portal?')) {
    window.location.href = 'index.html';
  }
}

/* ===== REGISTRATION PAGE ===== */

let currentStep = 1;

/**
 * Navigate to a registration step.
 */
function goToStep(step) {
  if (step === 2) {
    // Validate step 1 required fields
    const fname   = document.getElementById('fname')?.value.trim();
    const lname   = document.getElementById('lname')?.value.trim();
    const birthdate = document.getElementById('birthdate')?.value;
    const contact = document.getElementById('contact')?.value.trim();
    const email   = document.getElementById('email')?.value.trim();
    const resident = document.getElementById('resident')?.value;
    const residentAddress = document.getElementById('resident-address')?.value.trim();
    const outsideAddress  = document.getElementById('outside-address')?.value.trim();

    if (!fname || !lname || !birthdate || !contact || !email || !resident) {
      alert('Please fill in all required fields (First Name, Last Name, Birthdate, Contact Number, Email, and residency confirmation).');
      return;
    }

    const birth = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0);

    if (age < 18) {
      alert('You must be at least 18 years old to register.');
      return;
    }
    if (age > 120) {
      alert('Please enter a valid birthdate. Age cannot be greater than 120 years.');
      return;
    }

    if (resident === 'yes' && !residentAddress) {
      alert('Please enter your home address in Brgy. 628.');
      return;
    }
    if (resident === 'no' && !outsideAddress) {
      alert('Please enter the barangay you are from.');
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

/**
 * Update step circles, labels, connectors, and topbar dots.
 */
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
      circle.innerHTML = "✓";
    } else if (i === step) {
      circle.classList.add('active');
      circle.textContent = i;
      label.classList.add('active');
      if (dot) dot.classList.add('active');
    } else {
      circle.textContent = i;
    }
  }

  // Connectors
  for (let c = 1; c <= 2; c++) {
    const conn = document.getElementById('conn-' + c);
    if (conn) conn.classList.toggle('done', step > c);
  }
}

/**
 * Go back one step or to login if on step 1.
 */
function goBack() {
  if (currentStep <= 1) {
    window.location.href = 'index.html';
  } else {
    goToStep(currentStep - 1);
  }
}

/**
 * Go back to previous step from Step 2+.
 */
function backtoS1() {
  if (currentStep <= 1) {
    window.location.href = 'index.html';
  } else {
    goToStep(currentStep - 1);
  }
}

/**
 * Show the correct address field based on resident selection.
 */
function toggleResidentAddressFields() {
  const resident = document.getElementById('resident')?.value;
  const div1 = document.querySelector('.address-div1');
  const div2 = document.querySelector('.address-div2');
  const input1 = document.getElementById('resident-address');
  const input2 = document.getElementById('outside-address');
  if (!div1 || !div2 || !input1 || !input2) return;

  const showDiv1 = resident === 'yes';
  const showDiv2 = resident === 'no';

  div1.classList.toggle('active', showDiv1);
  div2.classList.toggle('active', showDiv2);
  input1.required = showDiv1;
  input2.required = showDiv2;

  if (!showDiv1) input1.value = '';
  if (!showDiv2) input2.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const residentSelect = document.getElementById('resident');
  if (residentSelect) {
    residentSelect.addEventListener('change', toggleResidentAddressFields);
  }
  toggleResidentAddressFields();

  const registrationForm = document.getElementById('registration-form');
  if (registrationForm) {
    registrationForm.addEventListener('submit', event => {
      event.preventDefault();
      if (currentStep === 3) {
        completeRegistration();
      } else if (currentStep === 1) {
        goToStep(2);
      } else if (currentStep === 2) {
        goToStep(3);
      }
    });
  }

  const birthdateInput = document.getElementById('birthdate');
  if (birthdateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    birthdateInput.max = `${yyyy}-${mm}-${dd}`;
  }

  const othersCheckbox = document.getElementById('skill-others');
  const othersDiv = document.getElementById('others-div');
  if (othersCheckbox && othersDiv) {
    othersCheckbox.addEventListener('change', () => {
      othersDiv.classList.toggle('hidden', !othersCheckbox.checked);
    });
  }
});

/**
 * Toggle a skill category accordion.
 */
function toggleCategory(headerEl) {
  const body    = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.skill-cat-chevron');
  const isOpen  = body.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
}

/**
 * Update the registration summary on Step 3.
 */
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

/**
 * Final registration submission.
 */
function completeRegistration() {
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

  document.querySelectorAll('.reg-step-panel').forEach(p => p.classList.remove('active'));
  const success = document.getElementById('reg-success');
  if (success) success.classList.add('active');
  window.scrollTo(0, 0);
}
