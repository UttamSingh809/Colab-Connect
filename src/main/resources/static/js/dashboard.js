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
    
    // Calculate project stats
    const inProgress = myProjects.filter(p => p.status === 'in-progress' || p.status === 'active').length;
    const completed = myProjects.filter(p => p.status === 'completed').length;
    const notStarted = myProjects.filter(p => p.status === 'planning' || p.status === 'idea').length;
    const totalProjects = myProjects.length || 1;
    
    // Generate task colors based on project
    const taskColors = ['task-peach', 'task-blue', 'task-pink', 'task-mint'];
    
    const html = `
      <!-- Top Stats Row -->
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

      <!-- Main Widget Grid -->
      <div class="dashboard-widgets">
        
        <!-- MODULE 1: My Tasks (Left Column) -->
        <div class="widget-card" style="grid-row: span 2;">
          <div class="widget-header">
            <div class="widget-title">My Tasks</div>
            <button class="btn-icon btn-sm" onclick="openProjectModal()" title="Add Task"><box-icon name="plus" style="width: 16px; height: 16px;"></box-icon></button>
          </div>
          
          <div class="time-filter-tabs mb-12">
            <button class="time-filter-tab active">Today</button>
            <button class="time-filter-tab">Tomorrow</button>
          </div>
          
          <div class="task-status-filter mb-12">
            <span class="pill-badge">${myProjects.length} Active Projects</span>
          </div>
          
          <div class="task-list">
            ${myProjects.length === 0 ? `
              <div class="empty-state">
                <box-icon name="inbox" animation="tada-hover" color="var(--text-muted)" style="width: 32px; height: 32px;"></box-icon>
                <p>No tasks yet. Create your first project!</p>
              </div>
            ` : myProjects.slice(0, 5).map((p, idx) => `
              <div class="task-card ${taskColors[idx % taskColors.length]}" onclick="openProjectDetail('${p.id}')">
                <div class="task-status-icon">
                  ${p.status === 'completed' ? '<box-icon name="check-circle" type="solid" color="var(--success)" style="width: 18px; height: 18px;"></box-icon>' : 
                    p.status === 'in-progress' || p.status === 'active' ? '<box-icon name="time-five" type="solid" color="var(--orange)" style="width: 18px; height: 18px;"></box-icon>' :
                    '<box-icon name="circle" type="solid" color="var(--text-muted)" style="width: 18px; height: 18px;"></box-icon>'}
                </div>
                <div class="task-content">
                  <div class="task-project-name">${p.name}</div>
                  <div class="task-desc">${p.description || 'No description'}</div>
                </div>
                <div class="task-check">
                  <box-icon name="${p.status === 'completed' ? 'check-square' : 'square'}" style="width: 20px; height: 20px; color: var(--text-secondary); cursor: pointer;"></box-icon>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- MODULE 2: Projects Overview (Center Top) -->
        <div class="widget-card">
          <div class="widget-header">
            <div class="widget-title">Projects Overview</div>
            <a href="/projects.html" class="widget-action"><box-icon name="arrow-to-right" style="width: 18px; height: 18px;"></box-icon></a>
          </div>
          
          <div class="chart-container">
            <div class="donut-chart">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="circle orange" stroke-dasharray="${(inProgress / totalProjects) * 100}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="circle blue" stroke-dasharray="${(completed / totalProjects) * 100}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" transform="rotate(-90 18 18)"/>
              </svg>
              <div class="chart-center">
                <div class="chart-value">${myProjects.length}</div>
                <div class="chart-label">Total</div>
              </div>
            </div>
            
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-dot orange"></span>
                <span>In Progress: ${inProgress}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot blue"></span>
                <span>Completed: ${completed}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot gray"></span>
                <span>Not Started: ${notStarted}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- MODULE 3: Collaboration Activity (Center Top Right) -->
        <div class="widget-card">
          <div class="widget-header">
            <div class="widget-title">Connection Activity</div>
            <a href="/connections.html" class="widget-action"><box-icon name="arrow-to-right" style="width: 18px; height: 18px;"></box-icon></a>
          </div>
          
          <div class="activity-chart">
            <div class="activity-bars">
              ${(() => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                return months.map((m, i) => {
                  const height = Math.floor(Math.random() * 60) + 20;
                  return `<div class="activity-bar-wrapper">
                    <div class="activity-bar" style="height: ${height}%"></div>
                    <div class="activity-label">${m}</div>
                  </div>`;
                }).join('');
              })()}
            </div>
            <div class="activity-stats">
              <div class="activity-stat">
                <span class="stat-dot blue"></span>
                <span>New Connections: ${connections.length}</span>
              </div>
              <div class="activity-stat">
                <span class="stat-dot orange"></span>
                <span>Pending: ${requests.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- MODULE 4: My Meetings (Right Column Top) -->
        <div class="widget-card" style="grid-row: span 2;">
          <div class="widget-header">
            <div class="widget-title">Upcoming Meetings</div>
            <a href="/chat.html" class="widget-action"><box-icon name="arrow-to-right" style="width: 18px; height: 18px;"></box-icon></a>
          </div>
          
          <div class="meeting-list">
            ${connections.length === 0 ? `
              <div class="empty-state">
                <p>No upcoming meetings</p>
              </div>
            ` : connections.slice(0, 3).map(conn => `
              <div class="meeting-card" onclick="window.location.href='/chat.html?user=${encodeURIComponent(conn.toUserName || conn.fromUserName)}'">
                <div class="meeting-icon meet">
                  <box-icon name="video" type="solid" style="width: 16px; height: 16px;"></box-icon>
                </div>
                <div class="meeting-info">
                  <div class="meeting-title">${conn.toUserName || conn.fromUserName}</div>
                  <div class="meeting-time">Project Discussion</div>
                </div>
                <box-icon name="chevron-right" style="width: 18px; height: 18px; color: var(--text-muted);"></box-icon>
              </div>
            `).join('')}
          </div>
          
          <div class="see-all-link">
            <a href="/chat.html">See All Meetings ></a>
          </div>
        </div>
        
        <!-- MODULE 5: Project Status (Left Column Middle) -->
        <div class="widget-card">
          <div class="widget-header">
            <div class="widget-title">Project Status</div>
            <button class="btn-icon btn-sm"><box-icon name="filter-alt" style="width: 16px; height: 16px;"></box-icon></button>
          </div>
          
          <div class="status-bars">
            ${(() => {
              const statuses = [
                { label: 'Active', color: 'blue', count: inProgress },
                { label: 'Completed', color: 'green', count: completed },
                { label: 'Planning', color: 'orange', count: notStarted },
                { label: 'On Hold', color: 'purple', count: 0 }
              ];
              return statuses.map(s => {
                const percentage = totalProjects > 0 ? Math.round((s.count / totalProjects) * 100) : 0;
                return `<div class="status-bar-item">
                  <div class="status-bar-label">${s.label}</div>
                  <div class="status-bar-track">
                    <div class="status-bar-fill ${s.color}" style="width: ${percentage}%"></div>
                  </div>
                  <div class="status-bar-value">${s.count} projects</div>
                </div>`;
              }).join('');
            })()}
          </div>
        </div>
        
        <!-- MODULE 6: Open Requests (Right Column Middle) -->
        <div class="widget-card">
          <div class="widget-header">
            <div class="widget-title">Connection Requests</div>
            <a href="/connections.html" class="widget-action"><box-icon name="arrow-to-right" style="width: 18px; height: 18px;"></box-icon></a>
          </div>
          
          <div class="tickets-list">
            ${requests.length === 0 ? `
              <div class="empty-state">
                <box-icon name="inbox" animation="tada-hover" color="var(--text-muted)" style="width: 24px; height: 24px;"></box-icon>
                <p>No pending requests</p>
              </div>
            ` : requests.slice(0, 3).map(req => `
              <div class="ticket-card">
                <div class="ticket-avatar">${getInitials(req.fromUserName || '')}</div>
                <div class="ticket-content">
                  <div class="ticket-name">${req.fromUserName || 'Someone'}</div>
                  <div class="ticket-message">${req.message || 'Wants to connect with you'}</div>
                </div>
                <button class="btn-check" onclick="respond('${req.id}', 'accept', this.closest('.ticket-card'))">Check ></button>
              </div>
            `).join('')}
          </div>
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
