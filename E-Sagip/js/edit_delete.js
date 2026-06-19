/* ===== VOLUNTEER MODALS ===== */

let _activeCard = null;

function openEditModal(btn) {
  _activeCard = btn.closest('.vol-card');

  const rawName = _activeCard.querySelector('.vol-name').childNodes[0].textContent.trim();
  const meta    = _activeCard.querySelector('.vol-meta').textContent.trim();

  const parts   = meta.split(' · ');
  const address = parts[0]?.trim() || '';
  const contact = parts[1]?.trim() || '';

  document.getElementById('edit-name').value    = rawName;
  document.getElementById('edit-contact').value = contact;
  document.getElementById('edit-address').value = address;
  document.getElementById('edit-status').value  =
    _activeCard.querySelector('.vol-badge')?.textContent.trim() || '';

  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-name').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  _activeCard = null;
}

function saveEditModal() {
  const name    = document.getElementById('edit-name').value.trim();
  const contact = document.getElementById('edit-contact').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const status  = document.getElementById('edit-status').value.trim();

  if (!name || !contact || !address) {
    alert('Please fill in all required fields.');
    return;
  }

  if (_activeCard) {
    const nameNode = _activeCard.querySelector('.vol-name');
    nameNode.childNodes[0].textContent = name + ' ';

    const badge = nameNode.querySelector('.vol-badge');
    if (badge && status) {
      badge.textContent = status;
      badge.className   = 'vol-badge ' + status.toLowerCase();
    }

    _activeCard.querySelector('.vol-meta').textContent = address + ' · ' + contact;

    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const avatar   = _activeCard.querySelector('.vol-avatar');
    if (avatar) avatar.textContent = initials;
  }

  closeEditModal();
}

function openRemoveModal(btn) {
  _activeCard = btn.closest('.vol-card');

  const rawName = _activeCard.querySelector('.vol-name').childNodes[0].textContent.trim();
  document.getElementById('remove-vol-name').textContent = rawName;

  document.getElementById('remove-modal').classList.remove('hidden');
}

function closeRemoveModal() {
  document.getElementById('remove-modal').classList.add('hidden');
  _activeCard = null;
}

function confirmRemoveModal() {
  if (_activeCard) _activeCard.remove();
  closeRemoveModal();
}


/* ===== ADMIN MODALS ===== */

let _activeAdminCard = null;

function openAdminEditModal(btn) {
  _activeAdminCard = btn.closest('.admin-card');

  const name  = _activeAdminCard.querySelector('.admin-name').textContent.trim();
  const email = _activeAdminCard.querySelector('.admin-email').textContent.trim();

  document.getElementById('admin-edit-name').value     = name;
  document.getElementById('admin-edit-email').value    = email;
  document.getElementById('admin-edit-password').value = '';

  document.getElementById('admin-edit-modal').classList.remove('hidden');
  document.getElementById('admin-edit-name').focus();
}

function closeAdminEditModal() {
  document.getElementById('admin-edit-modal').classList.add('hidden');
  _activeAdminCard = null;
}

function saveAdminEditModal() {
  const name     = document.getElementById('admin-edit-name').value.trim();
  const email    = document.getElementById('admin-edit-email').value.trim();
  const password = document.getElementById('admin-edit-password').value.trim();

  if (!name || !email) {
    alert('Please fill in all required fields.');
    return;
  }

  if (_activeAdminCard) {
    _activeAdminCard.querySelector('.admin-name').textContent  = name;
    _activeAdminCard.querySelector('.admin-email').textContent = email;
  }

  closeAdminEditModal();
}

function openAdminDeleteModal(btn) {
  _activeAdminCard = btn.closest('.admin-card');

  const name = _activeAdminCard.querySelector('.admin-name').textContent.trim();
  document.getElementById('admin-delete-name').textContent = name;

  document.getElementById('admin-delete-modal').classList.remove('hidden');
}

function closeAdminDeleteModal() {
  document.getElementById('admin-delete-modal').classList.add('hidden');
  _activeAdminCard = null;
}

function confirmAdminDeleteModal() {
  if (_activeAdminCard) _activeAdminCard.remove();
  closeAdminDeleteModal();
}


/* ===== FEED POST MODALS ===== */

let currentEditCard   = null;
let currentDeleteCard = null;

function openPostEditModal(card) {
  currentEditCard = card;

  const title    = card.querySelector('.recent-op-name')?.textContent || '';
  const date     = card.querySelector('.recent-op-date')?.textContent || '';
  const location = card.querySelector('.recent-op-loc')?.lastChild?.textContent?.trim() || '';
  const img      = card.querySelector('.recent-op-img-placeholder img');
  const award    = card.querySelector('.recent-op-label')?.lastChild?.textContent?.trim() || '';
  const caption  = card.querySelector('.recent-op-desc')?.textContent || '';
  const vol      = card.querySelector('.badge-vol')?.textContent?.trim().replace(/\D/g, '') || '';
  const fam      = card.querySelector('.badge-helped')?.textContent?.trim().replace(/\D/g, '') || '';

  document.getElementById('edit-title').value = title;
  document.getElementById('edit-date').value  = date;
  document.getElementById('edit-loc').value   = location;
  document.getElementById('edit-img').value   = img ? img.src : '';
  document.getElementById('edit-award').value = award;
  document.getElementById('edit-cap').value   = caption;
  document.getElementById('edit-vol').value   = vol;
  document.getElementById('edit-fam').value   = fam;

  document.getElementById('editPostModal').classList.remove('hidden');
}

function closePostEditModal() {
  document.getElementById('editPostModal').classList.add('hidden');
  currentEditCard = null;
}

// ── Edit date: no future dates ──────────────────────────────────
const editDateInput = document.getElementById('edit-date');
if (editDateInput) {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, '0');
  const dd    = String(today.getDate()).padStart(2, '0');
  editDateInput.max = `${yyyy}-${mm}-${dd}`;
}

function openPostDeleteModal(card) {
  currentDeleteCard = card;
  const title = card.querySelector('.recent-op-name')?.textContent || 'this post';
  document.getElementById('delete-post-title').textContent = `"${title}"`;
  document.getElementById('deletePostModal').classList.remove('hidden');
}

function closePostDeleteModal() {
  document.getElementById('deletePostModal').classList.add('hidden');
  currentDeleteCard = null;
}


/* ===== DOM READY ===== */

document.addEventListener('DOMContentLoaded', () => {

  // ── Volunteer modals ────────────────────────────────────────────
  document.getElementById('edit-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
  document.getElementById('remove-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeRemoveModal();
  });
  document.getElementById('admin-edit-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeAdminEditModal();
  });
  document.getElementById('admin-delete-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeAdminDeleteModal();
  });

  // ── Feed post edit modal ────────────────────────────────────────
  document.getElementById('closeEditModal')?.addEventListener('click', closePostEditModal);
  document.getElementById('cancelEditPost')?.addEventListener('click', closePostEditModal);
  document.getElementById('editPostModal')?.addEventListener('click', function(e) {
    if (e.target === this) closePostEditModal();
  });

  document.getElementById('saveEditPost')?.addEventListener('click', () => {
    if (!currentEditCard) return;

    const newTitle = document.getElementById('edit-title').value.trim();
    const newCap   = document.getElementById('edit-cap').value.trim();

    if (!newTitle || !newCap) {
      alert('Operation Title and Caption are required.');
      return;
    }

    const newDate  = document.getElementById('edit-date').value.trim();
    const newLoc   = document.getElementById('edit-loc').value.trim();
    const newImg   = document.getElementById('edit-img').value.trim();
    const newAward = document.getElementById('edit-award').value.trim();
    const newVol   = document.getElementById('edit-vol').value.trim();
    const newFam   = document.getElementById('edit-fam').value.trim();

    currentEditCard.querySelector('.recent-op-name').textContent            = newTitle;
    currentEditCard.querySelector('.recent-op-date').textContent            = newDate;
    currentEditCard.querySelector('.recent-op-loc').lastChild.textContent   = ' ' + newLoc;
    currentEditCard.querySelector('.recent-op-label').lastChild.textContent = ' ' + newAward;
    currentEditCard.querySelector('.recent-op-desc').textContent            = newCap;
    currentEditCard.querySelector('.badge-vol').lastChild.textContent       = ` ${newVol} volunteer${newVol != 1 ? 's' : ''}`;
    currentEditCard.querySelector('.badge-helped').lastChild.textContent    = ` ${newFam} helped`;
    if (newImg) currentEditCard.querySelector('.recent-op-img-placeholder img').src = newImg;

    closePostEditModal();
  });

  // ── Feed post delete modal ──────────────────────────────────────
  document.getElementById('cancelDeletePost')?.addEventListener('click', closePostDeleteModal);
  document.getElementById('deletePostModal')?.addEventListener('click', function(e) {
    if (e.target === this) closePostDeleteModal();
  });

  document.getElementById('confirmDeletePost')?.addEventListener('click', () => {
    if (!currentDeleteCard) return;

    currentDeleteCard.remove();
    closePostDeleteModal();

    const list = document.getElementById('recent-op-list');
    if (list && list.querySelectorAll('.recent-op-card').length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🚨</div>
          <h3>No Feed Posts</h3>
          <p>There are currently no feed posts.</p>
        </div>`;
    }
  });

  // ── Escape key closes all modals ───────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeRemoveModal();
      closeAdminEditModal();
      closeAdminDeleteModal();
      closePostEditModal();
      closePostDeleteModal();
    }
  });

});
