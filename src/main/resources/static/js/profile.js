let viewedUserId = null;
  let isOwnProfile = false;
  let profileData = null;

  async function loadProfile() {
    if (!initLayout('profile', 'Profile')) return;

    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id');
    const myId = Session.getUserId();
    isOwnProfile = !targetId || targetId === myId;
    viewedUserId = targetId || myId;

    document.getElementById('page-title-text').textContent = isOwnProfile ? 'My Profile' : 'Profile';

    const { ok, data } = await apiFetch(`/users/${viewedUserId}`);
    if (!ok) {
      document.getElementById('profile-content').innerHTML = `<div class="empty-state"><div class="empty-icon"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div>User not found</div></div>`;
      return;
    }
    profileData = data;

    // Set up actions
    const actionsEl = document.getElementById('profile-actions');
    if (isOwnProfile) {
      actionsEl.innerHTML = `<button class="btn btn-primary" onclick="openEditModal()"><box-icon name="pencil" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon>️ Edit Profile</button>`;
    } else {
      actionsEl.innerHTML = `<a href="/projects.html?browse=all" class="btn btn-primary"><box-icon name="folder" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Request to Join a Project</a>`;
    }

    renderProfile(data);
  }

  function renderProfile(u) {
    const avClass = u.availability === 'available' ? 'available' : u.availability === 'weekends' ? 'weekends' : 'limited';
    const avLabel = availabilityLabel(u.availability);
    const workStyleLabels = { 'async-friendly': '<box-icon name="globe" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Async-Friendly', 'collaborative': '<box-icon name="network-chart" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Collaborative', 'structured': '<box-icon name="clipboard" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Structured', 'flexible': '<box-icon name="bolt" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Flexible' };

    document.getElementById('profile-content').innerHTML = `
      <div style="max-width:800px">
        <!-- Hero -->
        <div class="profile-hero">
          <div class="profile-info">
            <div class="user-avatar user-avatar-xl">${getInitials(u.name)}</div>
            <div class="profile-meta">
              <div class="profile-name">${u.name}</div>
              <div class="profile-title-text">${u.title || 'Developer'}</div>
              <div style="display:flex;align-items:center;gap:12px;margin-top:10px;font-size:13px;opacity:0.9">
                <span><span class="availability-dot ${avClass}"></span>${avLabel}</span>
                ${u.workStyle ? `<span>${workStyleLabels[u.workStyle] || u.workStyle}</span>` : ''}
              </div>
            </div>
            <div class="profile-stats-row">
              ${u.reliabilityScore > 0 ? `<div class="profile-stat"><div class="profile-stat-value">${u.reliabilityScore}%</div><div class="profile-stat-label">Reliability</div></div>` : ''}
              <div class="profile-stat"><div class="profile-stat-value">${u.collaborations || 0}</div><div class="profile-stat-label">Collabs</div></div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="profile-body">
          ${u.bio ? `
            <div class="mb-16">
              <div class="card-title mb-16">About</div>
              <p style="line-height:1.7;color:var(--text-secondary)">${u.bio}</p>
            </div>
            <div class="divider"></div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px" class="mb-16">
            <div>
              <div class="card-title mb-16">Skills</div>
              ${u.skills?.length ? `<div class="tags">${u.skills.map(s => `<span class="tag">${s}</span>`).join('')}</div>`
                : `<div class="text-muted text-sm">No skills listed</div>`}
            </div>
            <div>
              <div class="card-title mb-16">Looking for Projects</div>
              ${u.projectTypes?.length ? `<div class="tags">${u.projectTypes.map(t => `<span class="tag tag-muted">${t}</span>`).join('')}</div>`
                : `<div class="text-muted text-sm">Not specified</div>`}
            </div>
          </div>

          ${u.reliabilityScore > 0 ? `
            <div class="divider"></div>
            <div class="mb-16">
              <div class="card-title mb-16">Reliability Score</div>
              <div style="display:flex;align-items:center;gap:12px">
                <div class="score-bar" style="flex:1"><div class="score-fill" style="width:${u.reliabilityScore}%"></div></div>
                <span class="fw-600 text-purple">${u.reliabilityScore}%</span>
              </div>
              <div class="text-sm text-muted mt-8">Based on ${u.collaborations || 0} completed collaboration${u.collaborations !== 1 ? 's' : ''}</div>
            </div>` : ''}

          ${(u.githubUrl || u.portfolioUrl) ? `
            <div class="divider"></div>
            <div>
              <div class="card-title mb-16">Links</div>
              <div style="display:flex;gap:12px;flex-wrap:wrap">
                ${u.githubUrl ? `<a href="${u.githubUrl}" target="_blank" class="btn btn-secondary btn-sm"><box-icon name="github" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;" type="logo"></box-icon> GitHub</a>` : ''}
                ${u.portfolioUrl ? `<a href="${u.portfolioUrl}" target="_blank" class="btn btn-secondary btn-sm"><box-icon name="globe" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> Portfolio</a>` : ''}
              </div>
            </div>` : ''}

          ${u.ratingCount > 0 ? `
            <div class="divider"></div>
            <div class="mb-16">
              <div class="card-title mb-16"><box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon> Peer Ratings</div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="font-size:32px;font-weight:800;color:var(--teams-purple)">${u.avgRating.toFixed(1)}</div>
                <div>
                  <div style="font-size:18px;letter-spacing:2px">${'<box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>'.repeat(Math.round(u.avgRating))}${'<box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon>'.repeat(5-Math.round(u.avgRating))}</div>
                  <div class="text-sm text-muted">${u.ratingCount} rating${u.ratingCount !== 1 ? 's' : ''} from completed projects</div>
                </div>
              </div>
              ${(u.endorsements||[]).length ? `
                <div class="card-title mb-8" style="font-size:12px">Recent Endorsements</div>
                ${u.endorsements.map(e => `
                  <div style="background:var(--bg-secondary);border-radius:10px;padding:12px 14px;margin-bottom:10px">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                      <span style="font-weight:700;font-size:13px">${e.fromName}</span>
                      <span style="font-size:12px;letter-spacing:1px">${'<box-icon name="star" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon>'.repeat(e.stars)}</span>
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);font-style:italic">"${e.note}"</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">via ${e.projectName}</div>
                  </div>`).join('')}` : ''}
            </div>` : ''}

          ${u.email ? `
            <div class="divider"></div>
            <div class="text-sm text-muted"><box-icon name="envelope" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px; vertical-align: middle;"></box-icon> ${u.email} · Joined ${formatDate(u.joinedAt)}</div>` : ''}
        </div>
      </div>`;
  }

  function openEditModal() {
    if (!profileData) return;
    document.getElementById('edit-name').value = profileData.name || '';
    document.getElementById('edit-title').value = profileData.title || '';
    document.getElementById('edit-bio').value = profileData.bio || '';
    document.getElementById('edit-github').value = profileData.githubUrl || '';
    document.getElementById('edit-portfolio').value = profileData.portfolioUrl || '';
    document.getElementById('edit-avail').value = profileData.availability || 'available';
    document.getElementById('edit-style').value = profileData.workStyle || 'flexible';
    document.getElementById('edit-skills').value = (profileData.skills || []).join(', ');
    document.getElementById('edit-project-types').value = (profileData.projectTypes || []).join(', ');
    updateSkillsPreview();
    openModal('edit-modal');
  }

  function updateSkillsPreview() {
    const val = document.getElementById('edit-skills').value;
    const skills = val.split(',').map(s => s.trim()).filter(Boolean);
    const preview = document.getElementById('skills-preview');
    preview.innerHTML = skills.map(s => `<span class="tag">${s}</span>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const si = document.getElementById('edit-skills');
    if (si) si.addEventListener('input', updateSkillsPreview);
  });

  async function saveProfile() {
    const btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = 'Saving...';
    const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const projectTypes = document.getElementById('edit-project-types').value.split(',').map(s => s.trim()).filter(Boolean);
    const body = {
      name: document.getElementById('edit-name').value,
      title: document.getElementById('edit-title').value,
      bio: document.getElementById('edit-bio').value,
      githubUrl: document.getElementById('edit-github').value,
      portfolioUrl: document.getElementById('edit-portfolio').value,
      availability: document.getElementById('edit-avail').value,
      workStyle: document.getElementById('edit-style').value,
      skills, projectTypes
    };
    const { ok, data } = await apiFetch('/users/me', { method: 'PUT', body: JSON.stringify(body) });
    btn.disabled = false; btn.textContent = 'Save Changes';
    if (ok) {
      profileData = data;
      Session.set(Session.getToken(), Session.getUserId(), data.name);
      closeModal('edit-modal');
      renderProfile(data);
      Toast.show('Profile updated!', 'success');
    } else {
      Toast.show(data.message || 'Failed to save', 'error');
    }
  }

  loadProfile();