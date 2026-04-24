let searchTimeout;
  let activeSkill = null;

  async function loadUsers() {
    if (!initLayout('discover', 'Discover')) return;
    await doSearch();
  }

  async function doSearch() {
    const query = document.getElementById('search-input').value.trim();
    const avail = document.getElementById('filter-avail').value;
    const style = document.getElementById('filter-style').value;
    const skill = activeSkill;

    let url = '/users?';
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (skill) params.push(`skills=${encodeURIComponent(skill)}`);
    url += params.join('&');

    document.getElementById('users-grid').innerHTML = '<div class="loading"><div class="spinner"></div> Searching...</div>';

    const { ok, data } = await apiFetch(url);
    if (!ok) { document.getElementById('users-grid').innerHTML = '<div class="empty-state"><div class="empty-icon"><box-icon name="error" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div><div>Failed to load users</div></div>'; return; }

    let users = data;
    if (avail) users = users.filter(u => u.availability === avail);
    if (style) users = users.filter(u => u.workStyle === style);

    document.getElementById('result-count').textContent = `${users.length} collaborator${users.length !== 1 ? 's' : ''} found`;

    if (users.length === 0) {
      document.getElementById('users-grid').innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon"><box-icon name="group" animation="tada-hover" color="currentColor" style="width: 16px; height: 16px;"></box-icon></div>
          <div class="empty-title">No results found</div>
          <div class="empty-desc">Try adjusting your search or filters</div>
        </div>`;
      return;
    }

    document.getElementById('users-grid').innerHTML = users.map(u => renderUserCard(u)).join('');
  }

  function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 350);
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
    doSearch();
  }

  function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-avail').value = '';
    document.getElementById('filter-style').value = '';
    activeSkill = null;
    document.querySelectorAll('#skill-filters .tag').forEach(el => { el.style.background = ''; el.style.color = ''; });
    doSearch();
  }

  loadUsers();
