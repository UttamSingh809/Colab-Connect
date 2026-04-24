let currentMode = null;   // 'dm' or 'project'
  let currentTarget = null; // userId or projectId
  let currentItemData = {};
  let stompClient = null;
  let currentSubscription = null;
  let canSendUnlimited = false;
  let guestMessageUsed = false;
  let allProjects = [];

  async function loadSidebar() {
    if (!initLayout('chat', 'Chat')) return;
    const [dmRes, projRes] = await Promise.all([
      apiFetch('/dm'),
      apiFetch('/projects?scope=mine')
    ]);
    const dms = dmRes.ok ? dmRes.data : [];
    allProjects = projRes.ok ? projRes.data : [];
    renderSidebar(dms, allProjects);

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const dmUser = params.get('dm');
    if (dmUser) {
      selectDm(dmUser, dmUser);
    } else if (projectId && allProjects.find(p => p.id === projectId)) {
      selectProject(projectId);
    } else if (dms.length > 0) {
      selectDm(dms[0].userId, dms[0].userId);
    } else if (allProjects.length > 0) {
      selectProject(allProjects[0].id);
    }
    
    connectWebSocket();
  }

  /* WebSocket Setup */
  function connectWebSocket() {
    if (stompClient) return;
    const socket = new SockJS('/cc/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
      console.log('STOMP Connected!');
      if (currentTarget) subscribeToCurrent();
    });
  }
  
  function subscribeToCurrent() {
    if (!stompClient || !stompClient.connected) {
       setTimeout(subscribeToCurrent, 300);
       return;
    }
    if (currentMode === 'dm') {
      const mId = Session.getUserId();
      const minId = mId < currentTarget ? mId : currentTarget;
      const maxId = mId > currentTarget ? mId : currentTarget;
      currentSubscription = stompClient.subscribe(`/topic/dm/${minId}_${maxId}`, function (msg) {
        if (currentMode === 'dm' && currentTarget) fetchDm(currentTarget, true);
      });
    } else if (currentMode === 'project') {
      currentSubscription = stompClient.subscribe(`/topic/project/${currentTarget}`, function (msg) {
        if (currentMode === 'project' && currentTarget) fetchProject(currentTarget, true);
      });
    }
  }

  function renderSidebar(dms, projects) {
    const myId = Session.getUserId();
    let html = '';

    html += `<div class="chat-section-label">Direct Messages</div>`;
    if (dms.length === 0) {
      html += `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">No conversations yet. <a href="/discover.html">Find people</a></div>`;
    } else {
      html += dms.map(d => `
        <div class="chat-item" id="dm-item-${d.userId}" onclick="selectDm('${d.userId}', '${d.userId}')">
          <div class="chat-item-icon">${getInitials(d.name)}</div>
          <div class="chat-item-info">
            <div class="chat-item-name">${d.name}</div>
            <div class="chat-item-preview">${d.lastMessage ? (d.lastMessageIsOwn ? 'You: ' : '') + d.lastMessage.substring(0, 35) + (d.lastMessage.length > 35 ? '…' : '') : d.title || ''}</div>
          </div>
          ${d.connected ? '' : '<div title="Not connected" style="width:8px;height:8px;border-radius:50%;background:#ffc107;flex-shrink:0"></div>'}
        </div>`).join('');
    }

    html += `<div class="chat-section-label" style="margin-top:8px">Project Chats</div>`;
    if (projects.length === 0) {
      html += `<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">No projects. <a href="/projects.html">Create one</a></div>`;
    } else {
      html += projects.map(p => `
        <div class="chat-item" id="proj-item-${p.id}" onclick="selectProject('${p.id}')">
          <div class="chat-item-icon project"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div>
          <div class="chat-item-info">
            <div class="chat-item-name">${p.name}</div>
            <div class="chat-item-preview">${p.type} · ${p.memberCount} member${p.memberCount !== 1 ? 's' : ''}</div>
          </div>
        </div>`).join('');
    }

    document.getElementById('chat-list').innerHTML = html;
  }

  function setActiveItem(mode, id) {
    document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById((mode === 'dm' ? 'dm-item-' : 'proj-item-') + id);
    if (el) el.classList.add('active');
  }

  /* ── DM ── */
  async function selectDm(userId, _) {
    if (currentSubscription) currentSubscription.unsubscribe();
    currentMode = 'dm';
    currentTarget = userId;
    setActiveItem('dm', userId);
    renderChatLoading();
    await fetchDm(userId);
    subscribeToCurrent();
  }

  async function fetchDm(userId, isPoll = false) {
    const { ok, data } = await apiFetch(`/dm/${userId}`);
    if (!ok || currentMode !== 'dm' || currentTarget !== userId) return;
    canSendUnlimited = data.canSendUnlimited;
    guestMessageUsed = data.guestMessageUsed;
    currentItemData = data;
    if (!isPoll) renderDmChat(data);
    else updateMessages(data.messages, 'dm');
  }

  function renderDmChat(data) {
    const connected = data.connected;
    const badge = connected
      ? `<span class="badge badge-available" style="font-size:11px">Connected</span>`
      : `<span class="badge" style="background:#fff3cd;color:#856404;font-size:11px"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Not Connected</span>`;
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header">
        <div class="chat-header-icon">${getInitials(data.partnerName)}</div>
        <div><div class="chat-header-name">${data.partnerName}</div><div class="chat-header-sub">${data.partnerTitle || ''}</div></div>
        <div class="chat-header-badge">${badge}</div>
      </div>
      <div class="chat-messages" id="messages-container"></div>
      <div class="chat-footer" id="chat-footer"></div>`;
    updateMessages(data.messages, 'dm');
    renderFooter('dm');
  }

  /* ── Project ── */
  async function selectProject(projectId) {
    if (currentSubscription) currentSubscription.unsubscribe();
    currentMode = 'project';
    currentTarget = projectId;
    setActiveItem('project', projectId);
    renderChatLoading();
    await fetchProject(projectId);
    subscribeToCurrent();
  }

  async function fetchProject(projectId, isPoll = false) {
    const { ok, data } = await apiFetch(`/chat/${projectId}`);
    if (!ok || currentMode !== 'project' || currentTarget !== projectId) return;
    canSendUnlimited = data.canSendUnlimited;
    guestMessageUsed = data.guestMessageUsed;
    currentItemData = data;
    if (!isPoll) renderProjectChat(data);
    else updateMessages(data.messages, 'project');
  }

  function renderProjectChat(data) {
    const project = allProjects.find(p => p.id === currentTarget) || {};
    const badge = data.isMember
      ? `<span class="badge badge-available" style="font-size:11px">Member</span>`
      : data.canSendUnlimited
        ? `<span class="badge" style="background:#e8f5e9;color:#2e7d32;font-size:11px">Connected</span>`
        : `<span class="badge" style="background:#f3f0ff;color:var(--teams-purple);font-size:11px">Guest</span>`;
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header">
        <div class="chat-header-icon project"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div>
        <div><div class="chat-header-name" style="cursor:pointer" onclick="openProjectDetail('${currentTarget}')">${data.projectName}</div><div class="chat-header-sub">${project.memberCount || 0} members · ${project.type || ''}</div></div>
        <div class="chat-header-badge">${badge}</div>
      </div>
      <div class="chat-messages" id="messages-container"></div>
      <div class="chat-footer" id="chat-footer"></div>`;
    updateMessages(data.messages, 'project');
    renderFooter('project');
  }

  /* ── Shared rendering ── */
  function renderChatLoading() {
    document.getElementById('chat-main').innerHTML = `
      <div class="chat-header"><div class="chat-header-icon">…</div><div><div class="chat-header-name">Loading…</div></div></div>
      <div class="chat-messages"><div class="loading"><div class="spinner"></div></div></div>
      <div class="chat-footer"></div>`;
  }

  function updateMessages(messages, mode) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;
    const myId = Session.getUserId();
    let lastDate = null; let html = '';
    if (!messages || messages.length === 0) {
      html = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:40px;margin-bottom:8px"><box-icon name="message-square" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div>No messages yet. Say hello!</div></div>`;
    } else {
      messages.forEach(msg => {
        const d = new Date(msg.timestamp);
        const dateStr = d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });
        if (dateStr !== lastDate) { html += `<div class="date-divider">${dateStr}</div>`; lastDate = dateStr; }
        const isOwn = msg.isOwn !== undefined ? msg.isOwn : msg.fromUserId === myId || msg.senderId === myId;
        const name = msg.senderName || (isOwn ? 'You' : 'Unknown');
        const time = d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
        html += `<div class="msg-group ${isOwn ? 'own' : ''}">
          <div class="msg-avatar">${getInitials(name)}</div>
          <div class="msg-body">
            <div class="msg-meta"><span class="msg-sender">${name}</span><span class="msg-time">${time}</span></div>
            <div class="msg-bubble">${escapeHtml(msg.content)}</div>
          </div></div>`;
      });
    }
    container.innerHTML = html;
    if (atBottom) container.scrollTop = container.scrollHeight;
  }

  function renderFooter(mode) {
    const footer = document.getElementById('chat-footer');
    if (!footer) return;

    if (!canSendUnlimited && guestMessageUsed) {
      const linkLabel = mode === 'dm' ? 'a shared project connection' : 'a project member connection';
      const linkHref = mode === 'dm' ? '/connections.html' : '/projects.html';
      footer.innerHTML = `<div class="guest-blocked"><box-icon name="lock" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> You've used your 1 introductory message. Get a <a href="${linkHref}">${linkLabel}</a> to chat freely.</div>`;
      return;
    }

    const warn = !canSendUnlimited && !guestMessageUsed
      ? `<div class="guest-warning"><span style="font-size:16px"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></span>
          <div>You can send <strong>1 message</strong> before being connected.
          ${mode === 'dm' ? '<a href="/projects.html" style="color:#856404;font-weight:700">Join a shared project</a> to chat freely.' : '<a href="/projects.html" style="color:#856404;font-weight:700">Join this project</a> to chat freely.'}</div>
        </div>` : '';

    footer.innerHTML = `${warn}
      <div class="chat-input-row">
        <textarea class="chat-input" id="msg-input" placeholder="Type a message… (Enter to send)" rows="1"
          onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
        <button class="chat-send-btn" id="send-btn" onclick="sendMessage()"><box-icon name="right-arrow-alt" animation="fade-right-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></button>
      </div>`;
    document.getElementById('msg-input')?.focus();
  }

  async function sendMessage() {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');
    if (!input || !currentTarget) return;
    const content = input.value.trim();
    if (!content) return;
    input.disabled = true; sendBtn.disabled = true;

    const endpoint = currentMode === 'dm' ? `/dm/${currentTarget}` : `/chat/${currentTarget}`;
    const { ok, data } = await apiFetch(endpoint, { method:'POST', body:JSON.stringify({ content }) });

    if (ok && data.success) {
      input.value = ''; input.style.height = '';
      canSendUnlimited = data.canSendUnlimited ?? canSendUnlimited;
      guestMessageUsed = data.guestMessageUsed ?? guestMessageUsed;
      if (currentMode === 'dm') await fetchDm(currentTarget, true);
      else await fetchProject(currentTarget, true);
      renderFooter(currentMode);
    } else {
      Toast.show(data.message || 'Failed to send', 'error');
    }
    input.disabled = false; sendBtn.disabled = false;
    input?.focus();
  }

  function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  window.addEventListener('beforeunload', () => { if (stompClient) stompClient.disconnect(); });
  loadSidebar();