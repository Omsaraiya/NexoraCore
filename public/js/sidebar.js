const navGroups = [
  {
    label: "Overview", icon: "layout-dashboard",
    items: [ { label: "Executive Dashboard", url: "dashboard.html" }, { label: "Task Manager", url: "tasks.html" } ]
  },
  {
    label: "Supply & Inventory", icon: "boxes",
    items: [ { label: "Supply Chain", url: "supply.html" }, { label: "Inventory Manager", url: "inventory.html" } ]
  },
  {
    label: "Production & Quality", icon: "factory",
    items: [ { label: "Production Logs", url: "production.html" }, { label: "Quality & Lab", url: "qc.html" } ]
  },
  {
    label: "Financial Core", icon: "indian-rupee",
    items: [ { label: "Finance Ledger", url: "finance.html" } ]
  },
  {
    label: "Administration", icon: "settings",
    items: [ { label: "HR & Access", url: "hr.html" }, { label: "System Settings", url: "settings.html" } ]
  }
];

function renderNavGroup(group, currentPath) {
  const details = document.createElement('details');
  details.className = 'nav-group';

  const groupLabel = group.label || group.group || '';
  const groupIcon = group.icon || '';
  const itemList = Array.isArray(group.items) ? group.items : [];

  const isMatch = currentPath.includes((groupLabel || '').toLowerCase().replace(/[^a-z]/g, '')) || itemList.some((item) => currentPath.endsWith(item.url || item.to || '#'));

  if (isMatch) {
    details.open = true;
  }

  const summary = document.createElement('summary');
  summary.innerHTML = `
    <span class="nav-summary-label">
      <i data-lucide="${(groupIcon || '').toLowerCase()}"></i>
      <span>${groupLabel}</span>
    </span>
  `;

  const navLinks = document.createElement('div');
  navLinks.className = 'nav-links';

  itemList.forEach((item) => {
    const anchor = document.createElement('a');
    const itemUrl = item.url || item.to || '#';
    const isActive = currentPath.endsWith(itemUrl) && itemUrl !== '#';
    anchor.href = itemUrl === '#' ? '#' : itemUrl;
    anchor.className = isActive ? 'active' : '';
    anchor.textContent = item.label || 'Untitled';

    if (itemUrl === '#') {
      anchor.setAttribute('aria-disabled', 'true');
      anchor.addEventListener('click', (event) => event.preventDefault());
    }

    navLinks.appendChild(anchor);
  });

  details.appendChild(summary);
  details.appendChild(navLinks);
  return details;
}

function initSidebar() {
  const sidebar = document.getElementById('dynamic-sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

  navGroups.forEach((group) => {
    sidebar.appendChild(renderNavGroup(group, currentPath));
  });

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  const activeLink = sidebar.querySelector('a.active');
  if (activeLink) {
    activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

if (typeof window !== 'undefined') {
  window.initSidebar = initSidebar;
}
