<!-- ============================================================
     AUDIT LOG TAB  —  add this subnav button after the Feed button
     ============================================================ -->

<!-- 1.  SUBNAV BUTTON  (paste after the Feed <button>) -->
<button class="subnav-btn" data-tab="auditlog" onclick="switchSubNav(this, 'auditlog')">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
  Audit Log
</button>


<!-- ============================================================
     2.  TAB CONTENT  (paste before the closing </body> tag,
         after the delete-post modal)
     ============================================================ -->
<div id="tab-auditlog" class="dashboard-content hidden">

  <div class="section-title">Audit Log</div>

  <!-- Toolbar -->
  <div class="audit-toolbar">

    <!-- Search -->
    <div class="audit-search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" id="audit-search" placeholder="Search by admin, action, or target…" oninput="filterAuditLogs()" />
    </div>

    <!-- Action-type filter -->
    <div class="audit-filter-row" id="audit-filter-row">
      <button class="vfilter-btn active" data-action="all"      onclick="setAuditFilter(this,'all')">All</button>
      <button class="vfilter-btn" data-action="DEPLOY_OPERATION" onclick="setAuditFilter(this,'DEPLOY_OPERATION')">Deploy Op</button>
      <button class="vfilter-btn" data-action="COMPLETE_OPERATION" onclick="setAuditFilter(this,'COMPLETE_OPERATION')">Complete Op</button>
      <button class="vfilter-btn" data-action="APPROVE_VOLUNTEER"  onclick="setAuditFilter(this,'APPROVE_VOLUNTEER')">Approve Vol.</button>
      <button class="vfilter-btn" data-action="REMOVE_VOLUNTEER"   onclick="setAuditFilter(this,'REMOVE_VOLUNTEER')">Remove Vol.</button>
      <button class="vfilter-btn" data-action="EDIT_VOLUNTEER"     onclick="setAuditFilter(this,'EDIT_VOLUNTEER')">Edit Vol.</button>
      <button class="vfilter-btn" data-action="ADD_ADMIN"          onclick="setAuditFilter(this,'ADD_ADMIN')">Add Admin</button>
      <button class="vfilter-btn" data-action="EDIT_ADMIN"         onclick="setAuditFilter(this,'EDIT_ADMIN')">Edit Admin</button>
      <button class="vfilter-btn" data-action="DELETE_ADMIN"       onclick="setAuditFilter(this,'DELETE_ADMIN')">Delete Admin</button>
      <button class="vfilter-btn" data-action="PUBLISH_POST"       onclick="setAuditFilter(this,'PUBLISH_POST')">Post</button>
      <button class="vfilter-btn" data-action="EDIT_POST"          onclick="setAuditFilter(this,'EDIT_POST')">Edit Post</button>
      <button class="vfilter-btn" data-action="DELETE_POST"        onclick="setAuditFilter(this,'DELETE_POST')">Delete Post</button>
    </div>

    <!-- Count + Clear -->
    <div class="audit-meta-row">
      <p class="vol-count" id="audit-count">0 entries</p>
      <button class="audit-clear-btn" onclick="clearAuditLogs()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        </svg>
        Clear All Logs
      </button>
    </div>
  </div>

  <!-- Log list -->
  <div class="audit-list" id="audit-list">
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <h3>No Activity Yet</h3>
      <p>Admin actions will be recorded here automatically.</p>
    </div>
  </div>

</div>


<!-- ============================================================
     3.  CSS  (paste into style.css or a new <style> block)
     ============================================================ -->
<style>
/* ---------- Audit toolbar ---------- */
.audit-toolbar {
  padding: 0 16px;
}

.audit-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
}

.audit-search-wrap input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 13px;
  background: transparent;
}

.audit-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.audit-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.audit-clear-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1.5px solid #c0392b;
  color: #c0392b;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.15s, color 0.15s;
}

.audit-clear-btn:hover {
  background: #c0392b;
  color: #fff;
}

/* ---------- Audit list & card ---------- */
.audit-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 16px 32px;
}

.audit-entry {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  animation: fadeInDown 0.25s ease;
}

@keyframes fadeInDown {
  from { opacity:0; transform:translateY(-6px); }
  to   { opacity:1; transform:translateY(0); }
}

.audit-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 15px;
}

/* colour-code by action family */
.audit-dot.op      { background: #fff3e0; }
.audit-dot.vol     { background: #e8f5e9; }
.audit-dot.admin   { background: #e3f2fd; }
.audit-dot.post    { background: #fce4ec; }
.audit-dot.auth    { background: #f3e5f5; }

.audit-body {
  flex: 1;
  min-width: 0;
}

.audit-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.audit-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.audit-badge.op      { background: #fff3e0; color: #e65100; }
.audit-badge.vol     { background: #e8f5e9; color: #1b5e20; }
.audit-badge.admin   { background: #e3f2fd; color: #0d47a1; }
.audit-badge.post    { background: #fce4ec; color: #880e4f; }
.audit-badge.auth    { background: #f3e5f5; color: #4a148c; }

.audit-actor {
  font-size: 13px;
  font-weight: 600;
  color: #222;
}

.audit-desc {
  font-size: 12.5px;
  color: #555;
  margin-bottom: 2px;
  word-break: break-word;
}

.audit-time {
  font-size: 11px;
  color: #999;
}
</style>


<!-- ============================================================
     4.  SCRIPT TAG  (add this alongside your other <script> tags)
     ============================================================ -->
<script src="audit_log.js"></script>
