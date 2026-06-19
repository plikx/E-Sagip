// js/vol_operations.js



let allOperations = [];
let pendingJoinOpId = null;

// ── Load & render active operations ─────────────────────────────
async function loadOperations() {
  const container = document.getElementById('operationsContainer');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE_URL}/operations/active`);
    allOperations = await res.json();
    renderOperations(allOperations);
    updateTicker(allOperations);
  } catch (err) {
    console.error('Failed to load operations:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load operations</h3>
        <p>Please check your connection and try again.</p>
      </div>`;
  }
}

function renderOperations(ops) {
  const container = document.getElementById('operationsContainer');
  const countEl   = document.querySelector('.ops-count');
  if (!container) return;

  if (countEl) countEl.textContent = `${ops.length} active operation${ops.length !== 1 ? 's' : ''}`;

  if (ops.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v8"/><path d="M8 12h8"/>
          </svg>
        </div>
        <h3>No Active Operations</h3>
        <p>There are currently no active disaster response or community
           operations. Please check back later for new volunteer opportunities.</p>
        <button class="empty-btn" onclick="window.location.href='community.html'">
          Community Information
        </button>
      </div>`;
    return;
  }

  // Get current user to check if already enrolled
  let currentUser = null;
  try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}

  container.innerHTML = ops.map(op => {
    const dateObj      = new Date(op.scheduled_at);
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const enrolled     = op.enrolled_count || 0;
    const slots        = op.volunteer_slots;
    const pct          = slots > 0 ? Math.round((enrolled / slots) * 100) : 0;
    const isFull       = enrolled >= slots;

    return `
      <div class="op-card" data-op-id="${op.id}">
        <div class="op-header">
          <span class="op-name">${op.title}</span>
          <span class="op-count ${isFull ? 'full' : ''}">
            ${isFull ? 'FULL' : `${enrolled}/${slots}`}
          </span>
        </div>
        <div class="meta-container">
          <div class="op-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              ${op.location}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              ${formattedDate} · ${formattedTime}
            </span>
          </div>
        </div>
        <div class="op-progress-bar">
          <div class="op-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="comp-container"><span style="flex: 1;"></span>
          <button
            class="btn-join ${isFull ? 'btn-full' : ''}"
            onclick="handleJoinClick(${op.id}, '${op.title.replace(/'/g, "\\'")}')"
            ${isFull ? 'disabled' : ''}>
            ${isFull ? 'Slots Full' : 'Join Operation'}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Marquee ticker ───────────────────────────────────────────────
function updateTicker(ops) {
  const ticker = document.getElementById('activeOperationTicker');
  if (!ticker) return;

  if (ops.length === 0) {
    ticker.textContent = '🚨 No active operations at the moment.';
    return;
  }

  ticker.textContent = ops
    .map(op => `🚨 ${op.title} — ${op.location}`)
    .join('     ·     ');
}

// ── Filter buttons ───────────────────────────────────────────────
function setFilter(btn) {
  document.querySelectorAll('.ops-filters button')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filter = btn.textContent.trim();

  if (filter === 'All') {
    renderOperations(allOperations);
    return;
  }

  // Filter by skill name match in title (or add skill fetching later)
  const filtered = allOperations.filter(op =>
    op.title.toLowerCase().includes(filter.toLowerCase())
  );
  renderOperations(filtered);
}

// ── Search ───────────────────────────────────────────────────────
function initOpsSearch() {
  const searchInput = document.querySelector('#vtab-operations .ops-search input');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { renderOperations(allOperations); return; }

    const filtered = allOperations.filter(op =>
      op.title.toLowerCase().includes(q) ||
      op.location.toLowerCase().includes(q)
    );
    renderOperations(filtered);
  });
}

// ── Join flow ────────────────────────────────────────────────────
function handleJoinClick(opId, opTitle) {
  let user = null;
  try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}

  if (!user) {
    alert('Please log in to join an operation.');
    window.location.href = 'index.html';
    return;
  }

  // Check approval status from the user object saved at login
  if (user.status === 'pending') {
    showNotApprovedModal();
    return;
  }

  // Store which op we're joining, then open the disclaimer modal
  pendingJoinOpId = opId;
  openJoinModal(opTitle);
}

// ── confirmJoin: override the one in script2.js ──────────────────
async function confirmJoin() {
  closeJoinModal();

  if (!pendingJoinOpId) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}

  if (!user) return;

  try {
    const res = await fetch(`${API_BASE_URL}/operations/${pendingJoinOpId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerId: user.id })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'Could not complete enrollment.');
      return;
    }

    alert('✅ You have successfully joined the operation. Thank you!');

    // Refresh the list so slot count updates
    await loadOperations();

  } catch (err) {
    console.error('Enrollment error:', err);
    alert('Connection error. Please try again.');
  } finally {
    pendingJoinOpId = null;
  }
}

async function loadMyTasks() {
  const container = document.getElementById('taskContainer');
  if (!container) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem('currentUser')); } catch (e) {}
  if (!user) return;

  try {
    const res = await fetch(`${API_BASE_URL}/operations/my-tasks/${user.id}`);
    const tasks = await res.json();

    if (!tasks.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Assigned Tasks</h3>
          <p>You haven't joined any volunteer operations yet. Once assigned, your tasks will appear here.</p>
          <button class="empty-btn" onclick="switchVolunteerTab(document.querySelector('[onclick*=feed]'),'feed')">Browse Feed</button>
        </div>`;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const dateObj = new Date(t.scheduled_at);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `
        <div class="op-card" style=" border-right: 5px solid #800020;">
          <div class="op-header">
            <span class="op-name" style="font-weight: 600; color: #800020;">${t.title}</span>
          </div>
          <div class="op-meta">
            <span style="font-size: 15px;"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="20">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/><p style="font-size: 15px;">Location:</p>
              </svg>${t.location}</span>
            <span style="font-size: 15px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/><p style="font-size: 15px;">Schedule: </p>
              </svg>${formattedDate} · ${formattedTime}</span>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Failed to load tasks:', err);
    container.innerHTML = `<div class="empty-state"><h3>Could not load tasks</h3></div>`;
  }
}
// ── Init on page load ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadOperations();
  initOpsSearch();
});
