document.getElementById('sidebar-container').innerHTML = (`
  <aside id="sidebar" class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark">N</div>
      <div class="sidebar-logo-text">
        <span class="sidebar-app-name">NexoraCore</span>
        <span class="sidebar-app-tag">ERP Suite</span>
      </div>
    </div>

    <div class="sidebar-divider"></div>

    <!-- Nav -->
    <nav class="sidebar-nav" id="sidebar-nav">

      <p class="sidebar-group-label">Operations</p>
      <a href="/dashboard.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="1" width="7" height="7" rx="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5"/></svg>
        Dashboard
      </a>
      <a href="/production.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="9" r="3"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.22 3.22l1.41 1.41M13.37 13.37l1.41 1.41M3.22 14.78l1.41-1.41M13.37 4.63l1.41-1.41"/></svg>
        Production
      </a>
      <a href="/inventory.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="14" height="11" rx="1.5"/><path d="M5 5V3.5A2.5 2.5 0 0 1 13 3.5V5"/><line x1="2" y1="9" x2="16" y2="9"/></svg>
        Inventory
      </a>

      <p class="sidebar-group-label">Commerce</p>
      <a href="/supply.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 1h2.5l2 9h8l2-6H5"/><circle cx="7" cy="15" r="1.5"/><circle cx="13" cy="15" r="1.5"/></svg>
        Supply Chain
      </a>
      <a href="/finance.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="14" height="12" rx="1.5"/><path d="M6 7h6M6 10h4"/></svg>
        Financial Core
      </a>

      <p class="sidebar-group-label">Management</p>
      <a href="/hr.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="6" r="3"/><path d="M1 16c0-3.3 2.7-6 6-6"/><circle cx="14" cy="11" r="2"/><path d="M11.5 16c0-1.93 1.12-3.5 2.5-3.5s2.5 1.57 2.5 3.5"/></svg>
        Human Resources
      </a>
      <a href="/tasks.html" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="14" height="14" rx="1.5"/><path d="M6 12V9M9 12V7M12 12V10"/></svg>
        Tasks & Reports
      </a>
    </nav>

    <!-- User -->
    <div class="sidebar-user">
      <div class="sidebar-user-inner">
        <div class="sidebar-avatar">OS</div>
        <div class="sidebar-user-info">
          <span class="sidebar-user-name">Om Saraiya</span>
          <span class="sidebar-user-role">Plant Manager</span>
        </div>
        <span class="status-dot status-dot--green"></span>
      </div>
    </div>
  </aside>
`);
// Auto-highlight the active tab based on current URL
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && currentPath.includes(href)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
});