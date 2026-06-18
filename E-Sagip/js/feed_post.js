/* ===== FEED POST PUBLISHER ===== */

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function parseTags(rawInput) {
  return rawInput
    .split(/[\s,]+/)
    .map(t => t.trim().replace(/^#*/, ''))
    .filter(t => t.length > 0)
    .map(t => `<span class="recent-op-tag">#${t}</span>`)
    .join('');
}

function createPostCard({ title, date, location, imgSrc, award, caption, volunteers, families, tags }) {
  const formattedDate = formatDate(date);
  const tagHTML       = parseTags(tags);

  return `
    <div class="recent-op-card">

      <div class="recent-op-img">
        <div class="recent-op-img-placeholder">
          <img src="${imgSrc}" alt="${title}">
        </div>
        <div class="recent-op-date">${formattedDate}</div>
        <div class="recent-op-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" width="12" height="12">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14
                             18.18 21.02 12 17.77 5.82 21.02
                             7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          ${award}
        </div>
      </div>

      <div class="recent-op-body">
        <p class="recent-op-name">${title}</p>
        <div class="recent-op-loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" width="12" height="12">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
          ${location}
        </div>

        <div class="recent-op-badges">
          <span class="badge-vol">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" width="13" height="13">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            ${volunteers} volunteer${volunteers != 1 ? 's' : ''}
          </span>
          <span class="badge-helped">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" width="13" height="13">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
                       a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78
                       1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${families} helped
          </span>
        </div>

        <p class="recent-op-desc">${caption}</p>

        ${tagHTML ? `<div class="recent-op-tags">${tagHTML}</div>` : ''}
      </div>

      <div class="recent-op-footer">
        <label class="recent-op-like" title="Like operation">
          <input type="checkbox" class="recent-op-like-input" aria-label="Like" />
          <span class="recent-op-icon-btn recent-op-like-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" width="16" height="16">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06
                       a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78
                       1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="like-count">0</span>
          </span>
        </label>
        <button class="recent-op-icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" width="16" height="16">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Comment
        </button>
        <button class="recent-op-icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" width="16" height="16">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <span style="flex:1"></span>
    <button class="post-edit" id="post-edit"> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg><span class="post-edit-span">Edit</span></button>
    <button class="post-remove" id="post-remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg></button>
    </div>
      </div>

    </div>
  `;
}

function bindLikeButtons(card) {
  const likeInput = card.querySelector('.recent-op-like-input');
  const likeCount = card.querySelector('.like-count');
  if (!likeInput || !likeCount) return;

  likeInput.addEventListener('change', () => {
    const current = parseInt(likeCount.textContent) || 0;
    likeCount.textContent = likeInput.checked ? current + 1 : Math.max(current - 1, 0);
  });
}

function bindCardActions(card) {
  const editBtn   = card.querySelector('.post-edit');
  const deleteBtn = card.querySelector('.post-remove');
  if (editBtn)   editBtn.addEventListener('click',   () => openPostEditModal(card));
  if (deleteBtn) deleteBtn.addEventListener('click', () => openPostDeleteModal(card));
}

function publishPost() {
  const title      = document.getElementById('postTitle')?.value.trim();
  const date       = document.getElementById('post-date')?.value;
  const location   = document.getElementById('post-loc')?.value.trim();
  const imgFile    = document.getElementById('post-img')?.files[0];
  const award      = document.getElementById('post-award')?.value.trim();
  const caption    = document.getElementById('post-cap')?.value.trim();
  const volunteers = document.getElementById('post-vol')?.value.trim();
  const families   = document.getElementById('post-fam')?.value.trim();
  const tags       = document.getElementById('post-tags')?.value.trim() || '';

  const imgSrc = imgFile ? URL.createObjectURL(imgFile) : '';

  const cardHTML = createPostCard({ title, date, location, imgSrc, award, caption, volunteers, families, tags });

  const list = document.getElementById('recent-op-list');
  if (!list) return;

  const emptyState = list.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = cardHTML;
  const newCard = wrapper.firstElementChild;

  list.prepend(newCard);
  bindLikeButtons(newCard);
  bindCardActions(newCard);  
}
