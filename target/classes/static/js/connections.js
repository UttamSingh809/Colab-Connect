async function loadConnections() {
    if (!initLayout('connections', 'Connections')) return;
    const [requestsRes, sentRes, connRes] = await Promise.all([
      apiFetch('/connections/requests'),
      apiFetch('/connections/sent'),
      apiFetch('/connections')
    ]);
    const incoming = requestsRes.ok ? requestsRes.data : [];
    const sent = sentRes.ok ? sentRes.data : [];
    const connected = connRes.ok ? connRes.data : [];

    const countEl = document.getElementById('incoming-count');
    countEl.textContent = incoming.length;
    countEl.style.display = incoming.length > 0 ? 'inline-flex' : 'none';

    renderIncoming(incoming);
    renderSent(sent);
    renderConnected(connected);
  }

  function projectTag(r) {
    if (!r.projectName) return '';
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(98,100,167,.12);color:var(--teams-purple);padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> ${r.projectName}</span>`;
  }

  function renderIncoming(requests) {
    const el = document.getElementById('tab-incoming');
    if (!requests.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><box-icon name="envelope" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div><div class="empty-title">No pending requests</div><div class="empty-desc">When someone requests to join your project, it'll appear here.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="text-sm text-secondary mb-16">${requests.length} pending join request${requests.length !== 1 ? 's' : ''}</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:640px">
        ${requests.map(r => `
          <div class="request-card" id="req-${r.id}">
            <div class="user-avatar" style="cursor:pointer" onclick="window.location='/profile.html?id=${r.fromUserId}'">${getInitials(r.fromUserName || '')}</div>
            <div class="request-card-body">
              <div style="display:flex;align-items:flex-start;justify-content:space-between">
                <div>
                  <div class="request-name">${r.fromUserName || 'Unknown'}</div>
                  <div class="request-title">${r.fromUserTitle || ''}</div>
                  <div style="margin-top:6px">${projectTag(r)}</div>
                </div>
                <div class="request-time">${formatDate(r.createdAt)}</div>
              </div>
              ${r.fromUserSkills?.length ? `<div class="tags" style="margin-top:8px">${r.fromUserSkills.slice(0,4).map(s => `<span class="tag">${s}</span>`).join('')}</div>` : ''}
              ${r.message ? `<div class="request-message">"${r.message}"</div>` : ''}
              <div class="request-actions">
                <button class="btn btn-success btn-sm" onclick="respond('${r.id}', 'accept', '${(r.projectName||'').replace(/'/g,"\\'")}')"><box-icon name="check" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Accept</button>
                <button class="btn btn-secondary btn-sm" onclick="respond('${r.id}', 'reject', '')"><box-icon name="x" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Decline</button>
                <a href="/profile.html?id=${r.fromUserId}" class="btn btn-ghost btn-sm">View Profile</a>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function renderSent(requests) {
    const el = document.getElementById('tab-sent');
    if (!requests.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><box-icon name="upload" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon></div><div class="empty-title">No sent requests</div><div class="empty-desc">Requests to join projects will appear here. <a href="/projects.html">Browse projects</a>.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;max-width:640px">
        ${requests.map(r => `
          <div class="request-card">
            <div class="user-avatar" onclick="window.location='/profile.html?id=${r.toUserId}'" style="cursor:pointer">${getInitials(r.toUserName || '')}</div>
            <div class="request-card-body">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div>
                  <div class="request-name">${r.toUserName || 'Unknown'}</div>
                  <div class="request-title">${r.toUserTitle || ''}</div>
                  <div style="margin-top:6px">${projectTag(r)}</div>
                </div>
                <span class="badge ${r.status === 'accepted' ? 'badge-available' : r.status === 'rejected' ? 'badge-limited' : ''}"
                  style="${r.status === 'pending' ? 'background:#e8e8f0;color:var(--teams-purple)' : ''}">${r.status}</span>
              </div>
              ${r.message ? `<div class="request-message" style="margin-top:8px">"${r.message}"</div>` : ''}
              <div class="request-time" style="margin-top:6px">${formatDate(r.createdAt)}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function renderConnected(connections) {
    const el = document.getElementById('tab-connected');
    if (!connections.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon"><box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div class="empty-title">No connections yet</div><div class="empty-desc">Accept join requests on your projects, or <a href="/projects.html">browse projects</a> to send one.</div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="text-sm text-secondary mb-16">${connections.length} connection${connections.length !== 1 ? 's' : ''}</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:680px">
        ${connections.map(u => `
          <div class="request-card">
            <div class="user-avatar" onclick="window.location='/profile.html?id=${u.id}'" style="cursor:pointer">${getInitials(u.name)}</div>
            <div class="request-card-body">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div style="flex:1">
                  <div class="request-name">${u.name}</div>
                  <div class="request-title">${u.title || ''}</div>
                  <div style="margin-top:6px">${u.projectName ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(98,100,167,.12);color:var(--teams-purple);padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> ${u.projectName}</span>` : ''}</div>
                </div>
                <span class="badge badge-available" style="flex-shrink:0">Connected</span>
              </div>
              <div class="tags" style="margin-top:8px">${(u.skills || []).slice(0,4).map(s => `<span class="tag">${s}</span>`).join('')}</div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <a href="/chat.html?dm=${u.id}" class="btn btn-primary btn-sm"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Message</a>
                ${u.projectId ? `<a href="/chat.html?project=${u.projectId}" class="btn btn-ghost btn-sm"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Project Chat</a>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="openAddToProject('${u.id}','${u.name.replace(/'/g,"\\'")}')"><box-icon name="plus" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Add to Project</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function switchTab(tab) {
    ['incoming','sent','connected'].forEach(t => {
      document.getElementById(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
      document.getElementById(`tab-${t}-btn`).classList.toggle('active', t === tab);
    });
  }

  async function respond(requestId, action, projectName) {
    const { ok, data } = await apiFetch(`/connections/respond/${requestId}`, { method:'PUT', body:JSON.stringify({ action }) });
    if (ok) {
      if (action === 'accept' && projectName) Toast.show(`Accepted! They've been added to ${projectName}`, 'success');
      else Toast.show(action === 'accept' ? '<box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Accepted!' : 'Request declined', action === 'accept' ? 'success' : 'info');
      loadConnections(); loadPendingCount();
    } else {
      Toast.show(data.message || 'Failed', 'error');
    }
  }

  loadConnections();