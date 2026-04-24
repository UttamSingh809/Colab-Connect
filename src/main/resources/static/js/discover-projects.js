let allProjects = [];
  let joinProjectId = null;
  let joinOwnerId = null;
  let activeSkill = null;

  async function loadDiscoverProjects() {
    if (!initLayout('discover-projects', 'Discover Projects')) return;
    const { ok, data } = await apiFetch('/projects?scope=all');
    allProjects = ok ? data : [];
    filterProjects();
  }

  function filterProjects() {
    const q = document.getElementById('proj-search').value.toLowerCase();
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;

    const filtered = allProjects.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description||'').toLowerCase().includes(q) &&
          !(p.requiredSkills||[]).some(s => s.toLowerCase().includes(q))) return false;
      if (type && p.type !== type) return false;
      if (status && p.status !== status) return false;
      if (activeSkill && !(p.requiredSkills||[]).some(s => s.toLowerCase() === activeSkill.toLowerCase())) return false;
      return true;
    });

    document.getElementById('projects-count').textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;
    const grid = document.getElementById('discover-grid');
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><box-icon name="folder-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div><div class="empty-title">No projects found</div><div class="empty-desc">Try adjusting your filters.</div></div>`;
      return;
    }
    grid.innerHTML = filtered.map(renderCard).join('');
  }

  function filterBySkill(skill) {
    if (activeSkill === skill) {
      activeSkill = null;
      document.querySelectorAll('#skill-filters .tag').forEach(el => el.style.background = '');
    } else {
      activeSkill = skill;
      document.querySelectorAll('#skill-filters .tag').forEach(el => {
        el.style.background = el.textContent === skill ? 'var(--brand-blue)' : '';
        el.style.color = el.textContent === skill ? 'white' : '';
      });
    }
    filterProjects();
  }

  function statusPill(status) {
    const labels = { open: '🟢 Open', in_progress: '<box-icon name="circle" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;" type="solid"></box-icon> In Progress', completed: '<box-icon name="trophy" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Completed' };
    return `<span class="status-pill ${status}">${labels[status] || status}</span>`;
  }

  function renderCard(p) {
    const myId = Session.getUserId();
    const isMember = p.members && p.members.some(m => m.id === myId);
    const skillsHtml = (p.requiredSkills||[]).slice(0,3).map(s => `<span class="tag tag-muted">${s}</span>`).join('') +
      (p.requiredSkills?.length > 3 ? `<span class="tag tag-muted">+${p.requiredSkills.length-3}</span>` : '');
    const memberAvatars = (p.members||[]).slice(0,4).map(m =>
      `<div class="member-avatar" title="${m.name}">${getInitials(m.name)}</div>`).join('');

    return `<div class="proj-card" onclick="openDetail('${p.id}')">
      <div class="proj-card-top">
        <span class="proj-type-badge">${p.type||'Project'}</span>
        ${statusPill(p.status)}
      </div>
      <div class="proj-card-name">${p.name}</div>
      <div class="proj-card-desc">${p.description||'No description.'}</div>
      ${skillsHtml ? `<div class="tags" style="margin-bottom:10px">${skillsHtml}</div>` : ''}
      <div class="proj-card-meta">
        <div class="member-list" style="display:flex;gap:4px">${memberAvatars}</div>
        <span><box-icon name="group" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> ${p.memberCount} member${p.memberCount!==1?'s':''}</span>
        ${p.ownerName ? `<span>by ${p.ownerName}</span>` : ''}
        ${isMember ? `<span class="badge badge-available" style="font-size:10px;padding:2px 8px">You're a member</span>` : ''}
      </div>
    </div>`;
  }

  function openDetail(projectId) {
    const p = allProjects.find(x => x.id === projectId);
    if (!p) return;
    const myId = Session.getUserId();
    const isMember = p.members && p.members.some(m => m.id === myId);

    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-type-badge').textContent = p.type || 'Project';
    document.getElementById('detail-status-pill').outerHTML = `<span id="detail-status-pill">${statusPill(p.status)}</span>`;
    document.getElementById('detail-desc').textContent = p.description || 'No description.';
    document.getElementById('detail-owner').textContent = p.ownerName || 'Unknown';
    document.getElementById('detail-member-count').textContent = p.memberCount;

    const skills = p.requiredSkills || [];
    document.getElementById('detail-skills-section').style.display = skills.length ? 'block' : 'none';
    document.getElementById('detail-skills').innerHTML = skills.map(s => `<span class="tag tag-muted">${s}</span>`).join('');

    document.getElementById('detail-members').innerHTML = (p.members||[]).map(m => `
      <div class="member-chip" onclick="window.location='/profile.html?id=${m.id}';event.stopPropagation()" style="cursor:pointer" title="View profile">
        <div class="member-chip-avatar">${getInitials(m.name)}</div>
        <div><div class="member-chip-name">${m.name}</div><div class="member-chip-role">${m.isOwner ? 'Owner' : 'Member'}</div></div>
      </div>`).join('');

    let joinHtml = '';
    if (p.status === 'completed') {
      joinHtml = `<div class="join-req-section"><p style="color:var(--text-muted);font-size:13px;margin:0"><box-icon name="trophy" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> This project is completed and no longer accepting new members.</p></div>`;
    } else if (isMember) {
      joinHtml = `<div class="join-req-section" style="display:flex;align-items:center;gap:10px">
        <span style="font-size:20px"><box-icon name="check-circle" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;" type="solid"></box-icon></span>
        <div><div style="font-weight:700;font-size:13px">You're a member of this project</div>
        <a href="/chat.html?project=${p.id}" class="btn btn-primary btn-sm" style="margin-top:8px;display:inline-flex"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Open Project Chat</a></div></div>`;
    } else {
      joinHtml = `<div class="join-req-section">
        <div class="join-req-title"><box-icon name="envelope-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Request to Join</div>
        <p style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">Send a join request to the project owner. They'll review your profile and message before accepting.</p>
        <button class="btn btn-primary btn-sm" onclick="openJoinRequest('${p.id}','${p.ownerId}','${p.name.replace(/'/g,"\\'")}')">Request to Join</button>
      </div>`;
    }
    document.getElementById('join-section').innerHTML = joinHtml;
    openModal('project-detail-modal');
  }

  function openJoinRequest(projectId, ownerId, projectName) {
    joinProjectId = projectId;
    joinOwnerId = ownerId;
    document.getElementById('join-project-name').textContent = projectName;
    document.getElementById('join-message').value = '';
    closeModal('project-detail-modal');
    openModal('join-request-modal');
  }

  async function confirmJoin() {
    const message = document.getElementById('join-message').value.trim();
    const btn = document.getElementById('join-confirm-btn');
    btn.disabled = true; btn.textContent = 'Sending…';

    const { ok, data } = await apiFetch(`/connections/request/${joinOwnerId}`, {
      method: 'POST',
      body: JSON.stringify({ projectId: joinProjectId, message })
    });
    btn.disabled = false; btn.textContent = '<box-icon name="envelope-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Send Request';
    if (ok && data.success) {
      closeModal('join-request-modal');
      Toast.show(data.message || 'Request sent!', 'success');
      const { ok: ok2, data: data2 } = await apiFetch('/projects?scope=all');
      if (ok2) { allProjects = data2; filterProjects(); }
    } else {
      Toast.show(data.message || 'Failed to send request', 'error');
    }
  }

  loadDiscoverProjects();
