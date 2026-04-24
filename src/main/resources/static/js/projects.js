let allProjects = [];
  let currentScope = 'mine';
  let joinTargetProjectId = null;
  let joinTargetOwnerId = null;

  async function loadProjects() {
    if (!initLayout('projects', 'Projects')) return;
    await fetchProjects();
  }

  async function fetchProjects() {
    document.getElementById('projects-grid').innerHTML = '<div class="loading"><div class="spinner"></div> Loading...</div>';
    const { ok, data } = await apiFetch(`/projects?scope=${currentScope}`);
    allProjects = ok ? data : [];
    filterProjects();
  }

  function filterProjects() {
    const query = document.getElementById('project-search').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    const type = document.getElementById('filter-type').value;
    let filtered = allProjects.filter(p => {
      if (query && !p.name.toLowerCase().includes(query) && !p.description?.toLowerCase().includes(query)) return false;
      if (status && p.status !== status) return false;
      if (type && p.type !== type) return false;
      return true;
    });
    document.getElementById('projects-count').textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;
    if (!filtered.length) {
      document.getElementById('projects-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon"><box-icon name="folder-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div>
          <div class="empty-title">No projects found</div>
          <div class="empty-desc">${currentScope === 'mine' ? 'Create your first project to get started.' : 'No projects match your filters.'}</div>
          ${currentScope === 'mine' ? `<button class="btn btn-primary" style="margin-top:16px" onclick="openModal('new-project-modal')">+ Create Project</button>` : ''}
        </div>`;
      return;
    }
    document.getElementById('projects-grid').innerHTML = filtered.map(p => renderProjectCard(p)).join('');
  }

  function renderProjectCard(p) {
    const myId = Session.getUserId();
    const isMember = p.isMember || (p.members && p.members.some(m => m.id === myId));
    const membersHtml = (p.members || []).slice(0, 5).map(m =>
      `<div class="member-avatar" title="${m.name}">${getInitials(m.name)}</div>`).join('');

    const isCompleted = p.status === 'completed';
    let completionBar = '';
    if (isMember && !isCompleted) {
      const voteProgress = `${p.completionVotes || 0}/${p.memberCount}`;
      completionBar = p.hasVotedComplete
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">⏳ Waiting for all members to confirm completion (${voteProgress})</div>`
        : '';
    }

    let actionBtns = '';
    if (isCompleted) {
      actionBtns = `
        <a href="/chat.html?project=${p.id}" class="btn btn-ghost btn-sm"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Archive Chat</a>
        ${isMember && p.canRateTeammates ? `<button class="btn btn-primary btn-sm" onclick="openRatingModal('${p.id}','${p.name.replace(/'/g,"\\'")}')"><box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Rate Teammates</button>` : ''}
        ${p.isOwner ? `<button class="btn btn-secondary btn-sm" onclick="reopenProject('${p.id}')"><box-icon name="lock-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Reopen</button>` : ''}`;
    } else if (isMember) {
      actionBtns = `
        <a href="/chat.html?project=${p.id}" class="btn btn-secondary btn-sm"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Chat</a>
        ${!p.hasVotedComplete ? `<button class="btn btn-ghost btn-sm" onclick="voteComplete('${p.id}')"><box-icon name="check-circle" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;" type="solid"></box-icon> Vote to Complete</button>` : ''}`;
    } else {
      actionBtns = `
        <button class="btn btn-primary btn-sm" onclick="openJoinModal('${p.id}', '${p.ownerId}', '${p.name.replace(/'/g, "\\'")}')"><box-icon name="envelope-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Request to Join</button>
        <a href="/chat.html?project=${p.id}" class="btn btn-ghost btn-sm"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Chat</a>`;
    }

    return `
      <div class="project-card" style="cursor:pointer" onclick="openProjectDetail('${p.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="project-type-badge">${p.type || 'Project'}</span>
          <span class="project-status ${p.status}">${isCompleted ? '<box-icon name="trophy" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Completed' : p.status}</span>
        </div>
        <div class="project-name">${p.name}</div>
        <div class="project-desc">${p.description || 'No description provided.'}</div>
        ${p.requiredSkills?.length ? `<div class="tags">${p.requiredSkills.slice(0,4).map(s => `<span class="tag tag-muted">${s}</span>`).join('')}</div>` : ''}
        <div class="project-meta" style="margin-top:auto">
          <div class="member-list">${membersHtml}</div>
          <span><box-icon name="group" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> ${p.memberCount} member${p.memberCount !== 1 ? 's' : ''}</span>
          ${p.ownerName ? `<span>by ${p.ownerName}</span>` : ''}
        </div>
        ${completionBar}
        <div onclick="event.stopPropagation()" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${actionBtns}
        </div>
      </div>`;
  }

  async function voteComplete(projectId) {
    const { ok, data } = await apiFetch(`/projects/${projectId}/complete`, { method: 'POST' });
    if (ok) {
      Toast.show(data.message, data.completed ? 'success' : 'info', 5000);
      await fetchProjects();
    } else Toast.show(data.message || 'Failed', 'error');
  }

  async function reopenProject(projectId) {
    const { ok, data } = await apiFetch(`/projects/${projectId}/reopen`, { method: 'POST' });
    if (ok) { Toast.show('Project reopened', 'success'); await fetchProjects(); }
    else Toast.show(data.message || 'Failed', 'error');
  }

  function openJoinModal(projectId, ownerId, projectName) {
    joinTargetProjectId = projectId;
    joinTargetOwnerId = ownerId;
    document.getElementById('join-project-name').textContent = projectName;
    document.getElementById('join-message').value = '';
    openModal('join-modal');
  }

  async function submitJoinRequest() {
    const btn = document.getElementById('join-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const message = document.getElementById('join-message').value.trim();
    const { ok, data } = await apiFetch(`/connections/request/${joinTargetOwnerId}`, {
      method: 'POST',
      body: JSON.stringify({ projectId: joinTargetProjectId, message })
    });
    btn.disabled = false; btn.textContent = 'Send Request';
    if (ok) {
      closeModal('join-modal');
      Toast.show('Join request sent!', 'success');
      await fetchProjects();
    } else {
      Toast.show(data.message || 'Failed to send request', 'error');
    }
  }

  async function toggleScope() {
    currentScope = currentScope === 'mine' ? 'all' : 'mine';
    document.getElementById('scope-btn').textContent = currentScope === 'mine' ? '<box-icon name="globe" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Browse All' : '<box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> My Projects';
    await fetchProjects();
  }

  async function createProject() {
    const btn = document.getElementById('create-btn');
    btn.disabled = true; btn.textContent = 'Creating...';
    const name = document.getElementById('new-name').value.trim();
    if (!name) { Toast.show('Project name is required', 'warning'); btn.disabled = false; btn.textContent = 'Create Project'; return; }
    const skills = document.getElementById('new-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const body = {
      name, description: document.getElementById('new-desc').value,
      type: document.getElementById('new-type').value,
      status: document.getElementById('new-status').value,
      requiredSkills: skills
    };
    const { ok, data } = await apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) });
    btn.disabled = false; btn.textContent = 'Create Project';
    if (ok) {
      closeModal('new-project-modal');
      document.getElementById('new-name').value = '';
      document.getElementById('new-desc').value = '';
      document.getElementById('new-skills').value = '';
      Toast.show('Project created!', 'success');
      currentScope = 'mine';
      document.getElementById('scope-btn').textContent = '<box-icon name="globe" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Browse All';
      await fetchProjects();
    } else {
      Toast.show(data.message || 'Failed to create project', 'error');
    }
  }

  async function editProjectStatus(id, currentStatus) {
    const statuses = ['open', 'in_progress'];
    const next = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    const { ok } = await apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({ status: next }) });
    if (ok) { Toast.show(`Status updated to "${next}"`, 'success'); await fetchProjects(); }
    else Toast.show('Failed to update status', 'error');
  }

  let ratingProjectId = null;
  let ratingTeammates = [];

  async function openRatingModal(projectId, projectName) {
    ratingProjectId = projectId;
    const { ok, data } = await apiFetch(`/projects/${projectId}/ratings`);
    if (!ok) { Toast.show('Failed to load ratings', 'error'); return; }
    ratingTeammates = data.rateableTeammates || [];
    if (!ratingTeammates.length) { Toast.show('You\'ve already rated all teammates on this project!', 'info'); return; }
    document.getElementById('rating-project-name').textContent = projectName;
    renderRatingForm();
    openModal('rate-modal');
  }

  function renderRatingForm() {
    const container = document.getElementById('rating-teammates-list');
    if (!ratingTeammates.length) {
      container.innerHTML = `<div class="text-muted text-sm">All teammates have been rated.</div>`;
      return;
    }
    const t = ratingTeammates[0];
    container.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px">Rating: ${t.name}</div>
      <div style="margin-bottom:10px">
        <div class="form-label">Stars (1–5)</div>
        <div style="display:flex;gap:6px" id="star-row">
          ${[1,2,3,4,5].map(n => `<button onclick="selectStar(${n})" id="star-${n}" class="btn btn-ghost btn-sm" style="font-size:18px;padding:4px 8px"><box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></button>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Endorsement note (optional)</label>
        <textarea class="form-input" id="rating-note" rows="2" placeholder="Great communicator, delivered on time…" maxlength="300" style="resize:vertical"></textarea>
      </div>
      ${ratingTeammates.length > 1 ? `<div class="text-sm text-muted">${ratingTeammates.length - 1} more teammate${ratingTeammates.length > 2 ? 's' : ''} to rate after this.</div>` : ''}`;
    window._selectedStars = 0;
  }

  function selectStar(n) {
    window._selectedStars = n;
    for (let i = 1; i <= 5; i++) {
      document.getElementById(`star-${i}`).textContent = i <= n ? '<box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>' : '<box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon>';
    }
  }

  async function submitRating() {
    const stars = window._selectedStars || 0;
    if (!stars) { Toast.show('Please select a star rating', 'warning'); return; }
    const note = document.getElementById('rating-note').value.trim();
    const teammate = ratingTeammates[0];
    const btn = document.getElementById('rating-submit-btn');
    btn.disabled = true; btn.textContent = 'Submitting…';
    const { ok, data } = await apiFetch(`/projects/${ratingProjectId}/rate/${teammate.id}`, {
      method: 'POST', body: JSON.stringify({ stars, note })
    });
    btn.disabled = false; btn.textContent = 'Submit Rating';
    if (ok) {
      ratingTeammates.shift();
      Toast.show(data.message || 'Rating submitted!', 'success');
      if (!ratingTeammates.length) { closeModal('rate-modal'); await fetchProjects(); }
      else renderRatingForm();
    } else Toast.show(data.message || 'Failed', 'error');
  }

  loadProjects();