async function loadDashboard() {
    if (!initLayout('dashboard', 'Dashboard')) return;

    const userName = Session.getUserName();
    document.getElementById('welcome-msg').innerHTML = `Welcome back, ${userName ? userName.split(' ')[0] : 'there'}! <box-icon name="hand" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>`;

    const [meRes, projectsRes, connRes, requestsRes] = await Promise.all([
      apiFetch('/users/me'),
      apiFetch('/projects?scope=mine'),
      apiFetch('/connections'),
      apiFetch('/connections/requests')
    ]);

    const me = meRes.ok ? meRes.data : {};
    const myProjects = projectsRes.ok ? projectsRes.data : [];
    const connections = connRes.ok ? connRes.data : [];
    const requests = requestsRes.ok ? requestsRes.data : [];

    const html = `
      <div class="stats-row mb-16">
        <div class="stat-card">
          <div class="stat-value">${connections.length}</div>
          <div class="stat-label">Connections</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myProjects.length}</div>
          <div class="stat-label">Projects</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${requests.length}</div>
          <div class="stat-label">Pending Requests</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${me.collaborations || 0}</div>
          <div class="stat-label">Collaborations</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Profile Completion -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><box-icon name="user" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Your Profile</div>
            <a href="/profile.html" class="btn btn-ghost btn-sm">Edit</a>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
            <div class="user-avatar user-avatar-lg">${getInitials(me.name || '')}</div>
            <div>
              <div style="font-size:16px;font-weight:700">${me.name || 'Your Name'}</div>
              <div style="color:var(--text-secondary);font-size:13px">${me.title || 'Add your title'}</div>
              <div style="margin-top:6px">
                ${me.availability ? `<span class="badge badge-${me.availability === 'available' ? 'available' : me.availability === 'weekends' ? 'weekends' : 'limited'}">${availabilityLabel(me.availability)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="tags mb-16">
            ${(me.skills || []).slice(0,6).map(s => `<span class="tag">${s}</span>`).join('')}
            ${!me.skills?.length ? '<span class="text-muted text-sm">No skills added yet</span>' : ''}
          </div>
          ${me.reliabilityScore > 0 ? `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
                <span class="text-secondary">Reliability Score</span>
                <span class="fw-600 text-purple">${me.reliabilityScore}%</span>
              </div>
              <div class="score-bar"><div class="score-fill" style="width:${me.reliabilityScore}%"></div></div>
            </div>` : ''}
        </div>

        <!-- Pending Requests -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Pending Requests</div>
            ${requests.length > 0 ? `<a href="/connections.html" class="btn btn-ghost btn-sm">View all</a>` : ''}
          </div>
          ${requests.length === 0 ? `
            <div style="text-align:center;padding:24px;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px"><box-icon name="envelope" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div>
              <div>No pending requests</div>
            </div>` : requests.slice(0,3).map(req => `
            <div class="request-card" style="margin-bottom:10px">
              <div class="user-avatar">${getInitials(req.fromUserName || '')}</div>
              <div class="request-card-body">
                <div class="request-name">${req.fromUserName || 'Someone'}</div>
                <div class="request-title">${req.fromUserTitle || ''}</div>
                ${req.message ? `<div class="request-message">"${req.message}"</div>` : ''}
                <div class="request-actions">
                  <button class="btn btn-success btn-sm" onclick="respond('${req.id}', 'accept', this.closest('.request-card'))">Accept</button>
                  <button class="btn btn-secondary btn-sm" onclick="respond('${req.id}', 'reject', this.closest('.request-card'))">Decline</button>
                </div>
              </div>
            </div>`).join('')
          }
        </div>

        <!-- My Projects -->
        <div class="card" style="grid-column:1/-1">
          <div class="card-header">
            <div class="card-title"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> My Projects</div>
            <a href="/projects.html" class="btn btn-ghost btn-sm">View all</a>
          </div>
          ${myProjects.length === 0 ? `
            <div style="text-align:center;padding:24px;color:var(--text-muted)">
              <div style="font-size:32px;margin-bottom:8px"><box-icon name="folder-open" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div>
              <div>No projects yet. <a href="/projects.html">Create one!</a></div>
            </div>` : `
            <div class="project-grid">
              ${myProjects.slice(0,4).map(p => `
                <div class="project-card" style="cursor:pointer" onclick="openProjectDetail('${p.id}')">
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <span class="project-type-badge">${p.type || 'Project'}</span>
                    <span class="project-status ${p.status}">${p.status}</span>
                  </div>
                  <div class="project-name">${p.name}</div>
                  <div class="project-desc">${p.description || 'No description'}</div>
                  <div class="tags">${(p.requiredSkills || []).slice(0,3).map(s => `<span class="tag tag-muted">${s}</span>`).join('')}</div>
                  <div class="project-meta">
                    <span><box-icon name="group" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> ${p.memberCount} member${p.memberCount !== 1 ? 's' : ''}</span>
                    ${p.isOwner ? '<span><box-icon name="crown" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Owner</span>' : '<span>Member</span>'}
                  </div>
                </div>`).join('')}
            </div>`}
        </div>
      </div>`;

    document.getElementById('dashboard-content').innerHTML = html;
  }

  async function respond(requestId, action, card) {
    const { ok, data } = await apiFetch(`/connections/respond/${requestId}`, {
      method: 'PUT', body: JSON.stringify({ action })
    });
    if (ok) {
      Toast.show(action === 'accept' ? 'Connection accepted!' : 'Request declined', action === 'accept' ? 'success' : 'info');
      card.remove();
      loadPendingCount();
    } else {
      Toast.show(data.message || 'Failed', 'error');
    }
  }

  loadDashboard();