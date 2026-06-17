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

    // Update avatar initials
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('edit-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });
  document.getElementById('remove-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeRemoveModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeEditModal(); closeRemoveModal(); }
  });
});
