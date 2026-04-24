// ColabConnect - Shared App Utilities

const API_BASE = '/cc';

// Session management (now entirely handled by HttpOnly cookies)
const Session = {
  getToken: () => null, // Cookies are sent natively
  getUserId: () => localStorage.getItem('cc_user_id'),
  getUserName: () => localStorage.getItem('cc_user_name'),
  set: (token, userId, name) => {
    localStorage.setItem('cc_user_id', userId);
    localStorage.setItem('cc_user_name', name);
  },
  clear: () => {
    localStorage.removeItem('cc_user_id');
    localStorage.removeItem('cc_user_name');
  }
};

// API helper
async function apiFetch(path, options = {}) {
  const token = Session.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
    Session.clear();
    const currentPath = window.location.pathname;
    if (currentPath !== '/index.html' && currentPath !== '/' && !currentPath.endsWith('/index.html')) {
      window.location.href = '/index.html';
    }
  }

  return { ok: res.ok, status: res.status, data };
}

// Toast notifications
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 3000) {
    this.init();
    const icons = { info: '<box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>', success: '<box-icon name="check-circle" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;" type="solid"></box-icon>', error: '<box-icon name="x" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>', warning: '<box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || '<box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>'}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }
};

// Auth guard (Handled by server now, these functions are deprecated)
function requireAuth() { return true; }
function redirectIfLoggedIn() { }

// Get user initials for avatar
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff/86400000)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format availability label
function availabilityLabel(availability) {
  const labels = { available: 'Available', weekends: 'Weekends only', limited: 'Limited availability' };
  return labels[availability] || availability;
}

// Layout and nav are now Server-Side Rendered by Thymeleaf

async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  Session.clear();
  window.location.href = '/index.html';
}

// Load pending request count for badge
async function loadPendingCount() {
  const { ok, data } = await apiFetch('/connections/requests');
  if (ok && Array.isArray(data)) {
    const count = data.length;
    const badge = document.getElementById('panel-conn-badge');
    const railBadge = document.getElementById('rail-conn-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (railBadge) {
      railBadge.textContent = count;
      railBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }
}

// Initialize app logic (Layout and Auth are rendered by server)
function initLayout(activePage, title) {
  document.title = `${title} — ColabConnect`;
  loadPendingCount();
  return true;
}

// Skill tag chip with optional remove
function skillChip(skill, onRemove) {
  const el = document.createElement('span');
  el.className = 'tag';
  el.textContent = skill;
  if (onRemove) {
    const btn = document.createElement('button');
    btn.style.cssText = 'background:none;border:none;cursor:pointer;margin-left:4px;font-size:11px;padding:0;line-height:1;color:var(--teams-purple);';
    btn.textContent = '×';
    btn.onclick = (e) => { e.stopPropagation(); onRemove(skill); };
    el.appendChild(btn);
  }
  return el;
}

// Modal helpers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// User card renderer (connections are project-scoped — use View Profile to find shared projects)
function renderUserCard(user) {
  const initials = getInitials(user.name);
  const avClass = user.availability === 'available' ? 'available' : user.availability === 'weekends' ? 'weekends' : 'limited';
  const avLabel = availabilityLabel(user.availability);
  const skillsHtml = (user.skills || []).slice(0, 4).map(s => `<span class="tag">${s}</span>`).join('') +
    ((user.skills || []).length > 4 ? `<span class="tag tag-muted">+${user.skills.length - 4}</span>` : '');

  return `
    <div class="user-card" onclick="window.location='/profile.html?id=${user.id}'">
      <div class="user-card-header">
        <div class="user-avatar">${initials}</div>
        <div style="flex:1">
          <div class="user-name">${user.name}</div>
          <div class="user-title">${user.title || 'Developer'}</div>
          <div class="mt-8 text-sm">
            <span class="availability-dot ${avClass}"></span>
            <span class="text-muted">${avLabel}</span>
          </div>
        </div>
        <div class="user-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;" onclick="event.stopPropagation()">
          <a href="/profile.html?id=${user.id}" class="btn btn-secondary btn-sm">View Profile</a>
          <button class="btn btn-secondary btn-sm" onclick="openAddToProject('${user.id}','${user.name.replace(/'/g,"\\'")}')"><box-icon name="plus" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Add to Project</button>
        </div>
      </div>
      <div class="tags">${skillsHtml}</div>
      ${user.bio ? `<div class="text-sm text-secondary" style="line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${user.bio}</div>` : ''}
      <div class="text-sm text-muted" style="display:flex;align-items:center;gap:12px">
        ${user.reliabilityScore > 0 ? `<span><box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> ${user.reliabilityScore}% reliability</span>` : ''}
        ${user.collaborations > 0 ? `<span><box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> ${user.collaborations} collabs</span>` : ''}
      </div>
    </div>`;
}

  /* ===================== GLOBAL PROJECT MODAL LOGIC ===================== */
  let activeProjectIdForModal = null;
  let activeProjectMembers = [];
  
  async function openProjectDetail(projectId) {
    activeProjectIdForModal = projectId;
    const { ok, data } = await apiFetch(`/projects/${projectId}`);
    if (!ok) {
      Toast.show('Failed to fetch project details', 'error');
      return;
    }
    
    const p = data;
    activeProjectMembers = (p.members || []).map(m => m.id);
    document.getElementById('pm-title').textContent = p.name;
  
  const statusEl = document.getElementById('pm-status');
  statusEl.className = 'text-sm ' + (p.status === 'completed' ? 'text-secondary' : p.status === 'active' ? 'text-purple' : 'text-success');
  statusEl.textContent = p.status === 'completed' ? '<box-icon name="trophy" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Completed' : p.status.charAt(0).toUpperCase() + p.status.slice(1);
  
  document.getElementById('pm-desc').textContent = p.description || 'No description provided.';
  
  const tagsEl = document.getElementById('pm-tags');
  tagsEl.innerHTML = `
    <span class="tag">${p.type || 'Project'}</span>
    ${(p.requiredSkills || []).map(s => `<span class="tag tag-muted">${s}</span>`).join('')}
  `;
  
  document.getElementById('pm-member-count').textContent = p.memberCount;
  
  const membersList = document.getElementById('pm-members-list');
  membersList.innerHTML = (p.members || []).map(m => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--surface-alt);border-radius:var(--radius);border:1px solid var(--border)">
      <div class="user-avatar" style="width:36px;height:36px;font-size:14px">${getInitials(m.name)}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${m.name} ${m.isOwner ? '<span title="Owner"><box-icon name="crown" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></span>' : ''}</div>
        <div class="text-sm text-secondary">${m.title || ''}</div>
      </div>
      <div class="text-xs text-muted" style="cursor:help" title="User ID">ID: ${m.id}</div>
    </div>
  `).join('');
  
  const addBlock = document.getElementById('pm-add-member-block');
  if (p.isOwner && p.status !== 'completed') {
    addBlock.style.display = 'block';
  } else {
    addBlock.style.display = 'none';
  }
  document.getElementById('pm-add-user-id').value = '';
  document.getElementById('pm-add-user-search').value = '';
  
  const chatBtn = document.getElementById('pm-chat-btn');
  if (p.isMember) {
    chatBtn.style.display = 'inline-flex';
    chatBtn.onclick = () => window.location.href = '/chat?project=' + p.id;
  } else {
    chatBtn.style.display = 'none';
  }
  
  openModal('global-project-modal');
}

async function addMemberToProject() {
  const input = document.getElementById('pm-add-user-id');
  const btn = document.getElementById('pm-add-btn');
  const userId = input.value.trim();
  
  if (!userId) {
    Toast.show('Please enter a User ID', 'warning');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '...';
  
  const { ok, data } = await apiFetch(`/connections/request/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ projectId: activeProjectIdForModal, message: 'You have been invited to join this project.' })
  });
  
  btn.disabled = false;
  btn.textContent = 'Add';
  
  if (ok) {
    Toast.show(data.message || 'Invitation sent successfully', 'success');
    input.value = '';
    document.getElementById('pm-add-user-search').value = '';
    document.getElementById('pm-add-btn').disabled = true;
    
    // Refresh modal to show new member
    openProjectDetail(activeProjectIdForModal);
    
    // Also try to refresh the parent page if it has fetchProjects
    if (typeof fetchProjects === 'function') {
      fetchProjects();
    }
  } else {
    Toast.show(data.message || 'Failed to send invitation', 'error');
  }
}
  
  /* Add Member Autocomplete Logic */
  let addMemberSearchTimeout;
  document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('pm-add-user-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(addMemberSearchTimeout);
      const query = e.target.value.trim();
      const suggBox = document.getElementById('pm-user-suggestions');
      const idInput = document.getElementById('pm-add-user-id');
      const addBtn = document.getElementById('pm-add-btn');
      
      idInput.value = '';
      addBtn.disabled = true;

      if (query.length < 2) {
        suggBox.style.display = 'none';
        return;
      }
      
      addMemberSearchTimeout = setTimeout(async () => {
        const { ok, data } = await apiFetch(`/users?query=${encodeURIComponent(query)}`);
        if (ok && data.length > 0) {
          const validUsers = data.filter(u => !activeProjectMembers.includes(u.id));
          if (validUsers.length === 0) {
            suggBox.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">No new users found</div>';
            suggBox.style.display = 'block';
            return;
          }

          suggBox.innerHTML = validUsers.map(u => `
            <div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;transition:background 0.15s" 
                 onmouseover="this.style.background='var(--surface-alt)'" 
                 onmouseout="this.style.background=''" 
                 onclick="selectUserForProject('${u.id}', '${u.name.replace(/'/g, "\\'")}')">
              <div class="user-avatar" style="width:28px;height:28px;font-size:11px">${getInitials(u.name)}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${u.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${u.title || 'Developer'}</div>
              </div>
            </div>
          `).join('');
          suggBox.style.display = 'block';
        } else {
          suggBox.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text-muted)">No users found</div>';
          suggBox.style.display = 'block';
        }
      }, 300);
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      const suggBox = document.getElementById('pm-user-suggestions');
      const searchBox = document.getElementById('pm-add-user-search');
      if (suggBox && !suggBox.contains(e.target) && e.target !== searchBox) {
        suggBox.style.display = 'none';
      }
    });
  });

  window.selectUserForProject = function(userId, userName) {
    document.getElementById('pm-add-user-id').value = userId;
    document.getElementById('pm-add-user-search').value = userName;
    document.getElementById('pm-user-suggestions').style.display = 'none';
    document.getElementById('pm-add-btn').disabled = false;
  };

  /* ===================== GLOBAL ADD TO PROJECT MODAL LOGIC ===================== */
  let atpUserId = null;
  let atpUserName = '';

  window.openAddToProject = async function(userId, userName) {
    atpUserId = userId;
    atpUserName = userName;
    document.getElementById('atp-user-name').textContent = userName;
    const sel = document.getElementById('atp-project-select');
    sel.innerHTML = `<option value="">Loading projects...</option>`;
    document.getElementById('atp-already-member').style.display = 'none';
    openModal('add-to-project-modal');

    const { ok, data } = await apiFetch('/projects?scope=mine');
    if (ok) {
      const myProjects = data.filter(p => p.isOwner);
      if (myProjects.length === 0) {
        sel.innerHTML = `<option value="">You don't own any projects</option>`;
      } else {
        sel.innerHTML = `<option value="">Choose a project...</option>` +
          myProjects.map(p => `<option value="${p.id}">${p.name} (${p.memberCount} members)</option>`).join('');
      }
    } else {
      sel.innerHTML = `<option value="">Failed to load projects</option>`;
    }
  };

  window.confirmAddToProject = async function() {
    const projectId = document.getElementById('atp-project-select').value;
    if (!projectId) { Toast.show('Please select a project', 'warning'); return; }
    const btn = document.getElementById('atp-confirm-btn');
    btn.disabled = true; btn.textContent = 'Sending Invite...';
    
    const { ok, data } = await apiFetch(`/connections/request/${atpUserId}`, {
      method: 'POST', body: JSON.stringify({ projectId: projectId, message: 'You have been invited to join this project.' })
    });
    
    btn.disabled = false; btn.textContent = 'Add Member';
    if (ok) {
      closeModal('add-to-project-modal');
      Toast.show(data.message || `Invitation sent to ${atpUserName}!`, 'success');
      if (typeof loadConnections === 'function') loadConnections();
      if (typeof doSearch === 'function') doSearch();
    } else {
      const info = document.getElementById('atp-already-member');
      info.textContent = data.message || 'Failed to send invitation';
      info.style.display = 'block';
    }
  };
