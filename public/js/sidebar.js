const navCategories = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Dashboard', url: 'dashboard.html' },
      { label: 'Production', url: 'production.html' },
      { label: 'Inventory', url: 'inventory.html' }
    ]
  },
  {
    title: 'COMMERCE',
    items: [
      { label: 'Supply', url: 'supply.html' },
      { label: 'Sales Orders', url: 'sales.html' }
    ]
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Human Resources', url: 'hr.html' },
      { label: 'Tasks / Reports', url: 'tasks.html' }
    ]
  }
];

function renderNavCategory(category, currentPath) {
  const wrapper = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'nav-category';
  title.textContent = category.title || '';

  const list = document.createElement('div');
  list.className = 'nav-links';

  (category.items || []).forEach((item) => {
    const anchor = document.createElement('a');
    const itemUrl = item.url || '#';
    anchor.href = itemUrl;
    anchor.className = 'nav-item' + (currentPath.endsWith(itemUrl) ? ' active' : '');
    anchor.textContent = item.label || 'Untitled';
    list.appendChild(anchor);
  });

  wrapper.appendChild(title);
  wrapper.appendChild(list);
  return wrapper;
}

function initSidebar() {
  const sidebar = document.getElementById('dynamic-sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  navCategories.forEach((category) => {
    sidebar.appendChild(renderNavCategory(category, currentPath));
  });

  const profile = document.createElement('div');
  profile.className = 'sidebar-profile';
  profile.innerHTML = `
    <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg, #10B981, #059669); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">OS</div>
    <div>
      <div style="font-size:13px; font-weight:600; color:#fff;">Om Saraiya</div>
      <div style="font-size:11px; color:#94A3B8;">Plant Manager</div>
    </div>
  `;
  sidebar.appendChild(profile);

  const activeLink = sidebar.querySelector('a.active');
  if (activeLink) {
    activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

if (typeof window !== 'undefined') {
  window.initSidebar = initSidebar;
}
