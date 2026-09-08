// Global Application State
let currentUser = null;
let currentTab = 'dashboard';

// Categories mapping helper
const categories = ['Web Development', 'Design', 'Writing', 'Marketing'];

// Global Mobile Menu Toggle Handler
window.toggleMobileMenu = function() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('menu-open');
  }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupEventListeners();
});

// 1. Authentication Check
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/profile');
    if (!res.ok) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    currentUser = data.user;
    
    // Set Sidebar User Details
    document.getElementById('sidebar-username').textContent = currentUser.username;
    const roleBadge = document.getElementById('sidebar-role');
    roleBadge.textContent = currentUser.role;
    roleBadge.className = `badge role-badge badge-${currentUser.role}`;

    // Render Side Menu options based on role
    renderSidebarMenu();

    // Fetch Wallet Balance & Notifications
    await fetchHeaderWalletBalance();
    await fetchNotifications();

    // Start background notification polling every 10s
    setInterval(fetchNotifications, 10000);

    // Default tab: Explorer on mobile (< 768px), Dashboard on desktop/tablet
    const defaultTab = window.innerWidth < 768 ? 'marketplace-explorer' : 'dashboard';
    switchTab(defaultTab);
  } catch (err) {
    console.error(err);
    window.location.href = '/login';
  }
}

const NAV_ICONS = {
  dashboard: `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>`,
  'marketplace-explorer': `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`,
  'my-applications': `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  'sales-orders': `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
  purchases: `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  'employer-post-job': `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
  'admin-moderation': `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>`,
  messages: `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
  profile: `<svg class="nav-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
};

function createNavItem(id, tab, label) {
  const icon = NAV_ICONS[tab] || '';
  return `<li id="${id}"><a href="#" onclick="switchTab('${tab}'); return false;" title="${label}" aria-label="${label}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></a></li>`;
}

function renderSidebarMenu() {
  const menu = document.getElementById('sidebar-nav');
  if (!menu) return;
  let html = '';

  if (currentUser.role === 'jobseeker') {
    html = `
      ${createNavItem('menu-dashboard', 'dashboard', 'Dashboard')}
      ${createNavItem('menu-marketplace-explorer', 'marketplace-explorer', 'Explorer')}
      ${createNavItem('menu-my-applications', 'my-applications', 'Applications')}
      ${createNavItem('menu-sales-orders', 'sales-orders', 'Sales')}
      ${createNavItem('menu-purchases', 'purchases', 'Purchases')}
      ${createNavItem('menu-messages', 'messages', 'Messages')}
      ${createNavItem('menu-profile', 'profile', 'Profile')}
    `;
  } else if (currentUser.role === 'employer') {
    html = `
      ${createNavItem('menu-dashboard', 'dashboard', 'Dashboard')}
      ${createNavItem('menu-marketplace-explorer', 'marketplace-explorer', 'Explorer')}
      ${createNavItem('menu-employer-post-job', 'employer-post-job', 'Post Job')}
      ${createNavItem('menu-purchases', 'purchases', 'Purchases')}
      ${createNavItem('menu-messages', 'messages', 'Messages')}
      ${createNavItem('menu-profile', 'profile', 'Profile')}
    `;
  } else if (currentUser.role === 'admin') {
    html = `
      ${createNavItem('menu-dashboard', 'dashboard', 'Stats')}
      ${createNavItem('menu-admin-moderation', 'admin-moderation', 'Moderate')}
      ${createNavItem('menu-messages', 'messages', 'Messages')}
      ${createNavItem('menu-profile', 'profile', 'Profile')}
    `;
  }

  menu.innerHTML = html;
}

// 3. Tab Switching Router
async function switchTab(tabName) {
  if (window.innerWidth < 768 && tabName === 'dashboard') {
    tabName = 'marketplace-explorer';
  }
  currentTab = tabName;

  if (typeof resetPostJobForm === 'function') {
    resetPostJobForm();
  }

  // Close mobile sidebar menu if open
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('menu-open');
  }
  
  // Hide all dashboard views
  document.querySelectorAll('.dashboard-view').forEach(view => {
    view.style.display = 'none';
  });

  // Remove active highlights in sidebar menu
  document.querySelectorAll('.sidebar-nav li, .sidebar-menu li').forEach(item => {
    item.classList.remove('active');
  });

  // Clear dashboard alerts
  clearAlert();

  // Add active class to selected menu
  const activeMenu = document.getElementById(`menu-${tabName}`);
  if (activeMenu) {
    activeMenu.classList.add('active');
  }

  // Update Welcome Subtitle
  const welcomeTitle = document.getElementById('welcome-title');
  const welcomeSubtitle = document.getElementById('welcome-subtitle');

  if (tabName === 'dashboard') {
    welcomeTitle.textContent = `Welcome Back, ${currentUser.username}!`;
    welcomeSubtitle.textContent = `Monitor your performance, orders, and stats below.`;
    
    // Load dashboard content based on role
    if (currentUser.role === 'jobseeker') {
      document.getElementById('view-jobseeker-dashboard').style.display = 'block';
      await loadJobseekerDashboard();
    } else if (currentUser.role === 'employer') {
      document.getElementById('view-employer-dashboard').style.display = 'block';
      await loadEmployerDashboard();
    } else if (currentUser.role === 'admin') {
      document.getElementById('view-admin-dashboard').style.display = 'block';
      await loadAdminDashboard();
    }
  } else if (tabName === 'my-applications') {
    welcomeTitle.textContent = `My Applications`;
    welcomeSubtitle.textContent = `Track status of job applications you have submitted.`;
    document.getElementById('view-my-applications').style.display = 'block';
    await loadMyApplications();
  } else if (tabName === 'purchases') {
    welcomeTitle.textContent = `Purchased Gigs`;
    welcomeSubtitle.textContent = `Manage services you bought and track delivery statuses.`;
    document.getElementById('view-purchases').style.display = 'block';
    await loadPurchases();
  } else if (tabName === 'sales-orders') {
    welcomeTitle.textContent = `Orders Received`;
    welcomeSubtitle.textContent = `Deliver on gigs purchased from you and record payments.`;
    document.getElementById('view-sales-orders').style.display = 'block';
    await loadSalesOrders();
  } else if (tabName === 'employer-post-job') {
    welcomeTitle.textContent = `Post a Job Listing`;
    welcomeSubtitle.textContent = `Create a requirement to find the ideal freelancer.`;
    document.getElementById('view-employer-post-job').style.display = 'block';
    await loadEmployerManageJobs();
  } else if (tabName === 'jobseeker-post-gig') {
    welcomeTitle.textContent = `Create Freelance Gig`;
    welcomeSubtitle.textContent = `Offer your services to employers searching for help.`;
    document.getElementById('view-jobseeker-post-gig').style.display = 'block';
  } else if (tabName === 'admin-moderation') {
    welcomeTitle.textContent = `Platform Moderation`;
    welcomeSubtitle.textContent = `Suspend accounts or delete job/gig contents to keep platform clean.`;
    document.getElementById('view-admin-moderation').style.display = 'block';
    await loadAdminModeration();
  } else if (tabName === 'marketplace-explorer') {
    welcomeTitle.textContent = `Marketplace Explorer`;
    welcomeSubtitle.textContent = `Search jobs or services and find them based on proximity on the map.`;
    document.getElementById('view-marketplace-explorer').style.display = 'block';
    await initMarketplaceExplorer();
  } else if (tabName === 'profile') {
    welcomeTitle.textContent = `My Profile Settings`;
    welcomeSubtitle.textContent = `View and update your credentials and base search location.`;
    document.getElementById('view-profile').style.display = 'block';
    await initProfileView();
  } else if (tabName === 'messages') {
    welcomeTitle.textContent = `Direct Messages & WhatsApp Logs`;
    welcomeSubtitle.textContent = `Direct messages route to WhatsApp for real-time chat, and all conversation logs are tracked below.`;
    document.getElementById('view-messages').style.display = 'block';
    await loadCommunicationRecords();
  }
}

// 4. Jobseeker Dashboard Loaders
async function loadJobseekerDashboard() {
  try {
    currentMarketType = 'jobs';
    if (window.innerWidth <= 1024) {
      await loadMarketplaceData();
    }

    // Load seeker stats (applications, purchases, sales)
    const appsRes = await fetch('/api/jobs/my-applications');
    const apps = await appsRes.json();
    document.getElementById('seeker-stat-apps').textContent = apps.length;

    const purchasesRes = await fetch('/api/gigs/orders/purchases');
    const purchases = await purchasesRes.json();
    document.getElementById('seeker-stat-orders-bought').textContent = purchases.length;

    const salesRes = await fetch('/api/gigs/orders/sales');
    const sales = await salesRes.json();
    document.getElementById('seeker-stat-orders-sold').textContent = sales.length;

    // Calculate Earnings (Completed Sales)
    const earnings = sales
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.price), 0);
    document.getElementById('seeker-stat-earnings').textContent = `BND ${earnings.toFixed(2)}`;

    // Load seeker's own gigs
    const gigsRes = await fetch('/api/gigs/my-gigs');
    const gigs = await gigsRes.json();
    const tableBody = document.getElementById('seeker-gigs-table');
    
    if (gigs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">You haven't posted any freelance services yet.</td></tr>`;
    } else {
      tableBody.innerHTML = gigs.map(gig => `
        <tr>
          <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(gig.title)}</td>
          <td data-label="Category">${getCategoryBadgeHtml(gig.category)}</td>
          <td data-label="Price" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(gig.price).toFixed(2)}</td>
          <td data-label="Delivery">${gig.delivery_days} Days</td>
          <td data-label="Posted Date" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(gig.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }

    // Render Seeker's Applied Jobs
    const appliedJobsTable = document.getElementById('seeker-applied-jobs-table');
    if (apps.length === 0) {
      appliedJobsTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No job applications submitted yet.</td></tr>`;
    } else {
      appliedJobsTable.innerHTML = apps.map(app => {
        const isAccepted = app.status === 'accepted';
        const statusBadge = (isAccepted && app.employer_id) ? `
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="badge badge-accepted" style="font-size: 0.7rem; background: rgba(34, 197, 94, 0.15); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 700;">approved</span>
            <button class="btn btn-small" style="background: #25d366; color: white; border: none; font-size: 0.7rem; padding: 2px 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 2px;" onclick="openChatAndNavigate(${app.employer_id}, 'Application Approved: ${escapeHtml(app.job_title).replace(/'/g, "\\'")}', 'Hi ${escapeHtml(app.employer_name || 'Employer').replace(/'/g, "\\'")}, thank you for approving my application for \\'${escapeHtml(app.job_title).replace(/'/g, "\\'")}\\'!')" title="Connect with Employer on WhatsApp">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              WhatsApp
            </button>
          </div>
        ` : `<span class="badge badge-${app.status}" style="font-size: 0.7rem;">${app.status}</span>`;

        return `
        <tr>
          <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(app.job_title)}</td>
          <td data-label="Employer" style="font-size: 0.85rem;">${escapeHtml(app.employer_name || 'Employer')}</td>
          <td data-label="My Bid" style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">BND ${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td data-label="Status">${statusBadge}</td>
        </tr>
      `;
      }).join('');
    }

    // Render Seeker's Ordered Gigs
    const orderedGigsTable = document.getElementById('seeker-ordered-gigs-table');
    if (purchases.length === 0) {
      orderedGigsTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No gigs ordered yet.</td></tr>`;
    } else {
      orderedGigsTable.innerHTML = purchases.map(order => `
        <tr>
          <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(order.gig_title)}</td>
          <td data-label="Seller" style="font-size: 0.85rem;">${escapeHtml(order.seller_name)}</td>
          <td data-label="Price" style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">BND ${parseFloat(order.price).toFixed(2)}</td>
          <td data-label="Status"><span class="badge badge-${order.status}" style="font-size: 0.7rem;">${order.status}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Error loading dashboard data.', 'error');
  }
}

// 5. Employer Dashboard Loaders
async function loadEmployerDashboard() {
  try {
    currentMarketType = 'gigs';
    if (window.innerWidth <= 1024) {
      await loadMarketplaceData();
    }

    // Load employer stats (jobs, orders)
    const jobsRes = await fetch('/api/jobs/my-jobs');
    const jobs = await jobsRes.json();
    document.getElementById('employer-stat-jobs').textContent = jobs.length;

    const purchasesRes = await fetch('/api/gigs/orders/purchases');
    const purchases = await purchasesRes.json();
    document.getElementById('employer-stat-gigs').textContent = purchases.length;

    // Calculate Spending (Purchased orders)
    const spend = purchases
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.price), 0);
    document.getElementById('employer-stat-spend').textContent = `BND ${spend.toFixed(2)}`;

    // Render Employer's Posted Jobs
    const tableBody = document.getElementById('employer-jobs-table');
    if (jobs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">You haven't posted any job listings yet.</td></tr>`;
    } else {
      tableBody.innerHTML = jobs.map(job => `
        <tr>
          <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(job.title)}</td>
          <td data-label="Category">${getCategoryBadgeHtml(job.category)}</td>
          <td data-label="Budget" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(job.budget).toFixed(2)}</td>
          <td data-label="Applicants">
            <a href="#" onclick="openApplicantsModal(${job.id}, '${job.title.replace(/'/g, "\\'")}')" class="btn btn-secondary btn-small">
              ${job.applicants_count} Applicants
            </a>
          </td>
          <td data-label="Status"><span class="badge badge-${job.status}">${job.status}</span></td>
          <td data-label="Action">
            ${job.status === 'open' ? 
              `<button class="btn btn-danger btn-small" onclick="closeJobListing(${job.id})">Close Job</button>` : 
              `<span style="font-size: 0.85rem; color: var(--text-dark);">Filled</span>`}
          </td>
        </tr>
      `).join('');
    }

    // Render Employer's Ordered Gigs
    const orderedGigsTable = document.getElementById('employer-ordered-gigs-table');
    if (purchases.length === 0) {
      orderedGigsTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No gigs ordered yet.</td></tr>`;
    } else {
      orderedGigsTable.innerHTML = purchases.map(order => `
        <tr>
          <td data-label="Order ID" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">#ORD-${order.id}</td>
          <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(order.gig_title)}</td>
          <td data-label="Seller" style="font-size: 0.85rem;">${escapeHtml(order.seller_name)}</td>
          <td data-label="Price" style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">BND ${parseFloat(order.price).toFixed(2)}</td>
          <td data-label="Order Date" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
          <td data-label="Status"><span class="badge badge-${order.status}" style="font-size: 0.7rem;">${order.status}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Error loading dashboard data.', 'error');
  }
}

// 6. Admin Dashboard Loaders
async function loadAdminDashboard() {
  try {
    const res = await fetch('/api/admin/stats');
    const stats = await res.json();

    document.getElementById('admin-stat-users').textContent = stats.totalUsers;
    document.getElementById('admin-stat-jobs').textContent = stats.totalJobs;
    document.getElementById('admin-stat-gigs').textContent = stats.totalGigs;
    document.getElementById('admin-stat-orders').textContent = stats.totalOrders;
    document.getElementById('admin-stat-volume').textContent = `BND ${parseFloat(stats.salesVolume).toFixed(2)}`;

    // Load users list
    const usersRes = await fetch('/api/admin/users');
    const users = await usersRes.json();
    const tableBody = document.getElementById('admin-users-table');

    if (users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    } else {
      tableBody.innerHTML = users.map(user => `
        <tr>
          <td data-label="Username" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(user.username)}</td>
          <td data-label="Email">${escapeHtml(user.email)}</td>
          <td data-label="Role"><span class="badge badge-in-progress">${user.role}</span></td>
          <td data-label="Status"><span class="badge badge-${user.status}">${user.status}</span></td>
          <td data-label="Joined" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(user.created_at).toLocaleDateString()}</td>
          <td data-label="Action">
            <button class="btn ${user.status === 'active' ? 'btn-danger' : 'btn-primary'} btn-small" onclick="toggleUserStatus(${user.id})">
              ${user.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Error loading statistics.', 'error');
  }
}



// 9. Load My Applications (seeker submitted)
async function loadMyApplications() {
  try {
    const res = await fetch('/api/jobs/my-applications');
    const apps = await res.json();
    const tableBody = document.getElementById('my-applications-table');

    if (apps.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">You have not applied for any jobs yet.</td></tr>`;
    } else {
      tableBody.innerHTML = apps.map(app => {
        const isAccepted = app.status === 'accepted';
        const statusHtml = (isAccepted && app.employer_id) ? `
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="badge badge-accepted" style="background: rgba(34, 197, 94, 0.15); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 700;">Approved</span>
            <button class="btn btn-small" style="background: #25d366; color: white; border: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.75rem;" onclick="openChatAndNavigate(${app.employer_id}, 'Application Approved: ${escapeHtml(app.job_title).replace(/'/g, "\\'")}', 'Hi ${escapeHtml(app.employer_name || 'Employer').replace(/'/g, "\\'")}, thank you for approving my application for \\'${escapeHtml(app.job_title).replace(/'/g, "\\'")}\\'!')" title="Connect with Employer on WhatsApp">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              WhatsApp
            </button>
          </div>
        ` : `<span class="badge badge-${app.status}">${app.status}</span>`;

        return `
        <tr>
          <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(app.job_title)}</td>
          <td data-label="Employer">${escapeHtml(app.employer_name || 'Employer')}</td>
          <td data-label="Budget" style="color: var(--color-success); font-weight: 600;">BND ${parseFloat(app.job_budget).toFixed(2)}</td>
          <td data-label="My Bid" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td data-label="Applied Date" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(app.created_at).toLocaleDateString()}</td>
          <td data-label="Status">${statusHtml}</td>
        </tr>
      `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 10. Load Purchases (Gig orders placed)
async function loadPurchases() {
  try {
    const res = await fetch('/api/gigs/orders/purchases');
    const orders = await res.json();
    const tableBody = document.getElementById('purchases-table');

    if (orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">You haven't purchased any freelance services.</td></tr>`;
    } else {
      tableBody.innerHTML = orders.map(order => `
        <tr>
          <td data-label="Order ID" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">#ORD-${order.id}</td>
          <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(order.gig_title)}</td>
          <td data-label="Seller">
            ${escapeHtml(order.seller_name)}
            <button class="btn btn-secondary btn-small" style="padding: 2px 8px; font-size: 0.75rem; margin-left: 5px; color: #25d366; font-weight: 600;" onclick="openChatAndNavigate(${order.seller_id}, 'Order #${order.id} Discussion', 'Hi, I am messaging you on WhatsApp regarding KerjaLu Order #${order.id}.')">WhatsApp</button>
          </td>
          <td data-label="Price" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(order.price).toFixed(2)}</td>
          <td data-label="Order Date" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
          <td data-label="Status"><span class="badge badge-${order.status}">${order.status}</span></td>
          <td data-label="Action">
            <div style="display: flex; gap: 6px; align-items: center;">
              ${order.status === 'pending' ? 
                `<button class="btn btn-danger btn-small" onclick="updateOrderStatus(${order.id}, 'cancelled')">Cancel Order</button>` : ''}
              ${order.status === 'completed' ? 
                `<button class="btn btn-primary btn-small" style="padding: 4px 10px;" onclick="openReviewModal(${order.id})">Review</button>` : ''}
              ${order.status !== 'pending' && order.status !== 'completed' ? 
                `<span style="font-size: 0.85rem; color: var(--text-muted);">In Progress</span>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 11. Load Sales Orders (Gig orders received by Seeker)
async function loadSalesOrders() {
  try {
    const res = await fetch('/api/gigs/orders/sales');
    const orders = await res.json();
    const tableBody = document.getElementById('sales-orders-table');

    if (orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">You haven't received any orders for your gigs yet.</td></tr>`;
    } else {
      tableBody.innerHTML = orders.map(order => {
        let actionButtons = '';
        if (order.status === 'pending') {
          actionButtons = `
            <button class="btn btn-primary btn-small" onclick="updateOrderStatus(${order.id}, 'in_progress')">Accept & Start</button>
            <button class="btn btn-danger btn-small" onclick="updateOrderStatus(${order.id}, 'cancelled')">Reject</button>
          `;
        } else if (order.status === 'in_progress') {
          actionButtons = `
            <button class="btn btn-primary btn-small" style="background: var(--color-success); border-color: var(--color-success);" onclick="updateOrderStatus(${order.id}, 'completed')">Deliver & Complete</button>
            <button class="btn btn-danger btn-small" onclick="updateOrderStatus(${order.id}, 'cancelled')">Cancel</button>
          `;
        } else {
          actionButtons = `<span style="font-size: 0.85rem; color: var(--text-muted);">Settled</span>`;
        }

        return `
          <tr>
            <td data-label="Order ID" style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">#ORD-${order.id}</td>
            <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(order.gig_title)}</td>
            <td data-label="Buyer">
              ${escapeHtml(order.buyer_name)}
              <button class="btn btn-secondary btn-small" style="padding: 2px 8px; font-size: 0.75rem; margin-left: 5px; color: #25d366; font-weight: 600;" onclick="openChatAndNavigate(${order.buyer_id}, 'Order #${order.id} Discussion', 'Hi, I am messaging you on WhatsApp regarding your order #${order.id}.')">WhatsApp</button>
            </td>
            <td data-label="Price" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(order.price).toFixed(2)}</td>
            <td data-label="Order Date" style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
            <td data-label="Status"><span class="badge badge-${order.status}">${order.status}</span></td>
            <td data-label="Action"><div style="display: flex; gap: 8px;">${actionButtons}</div></td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 12. Load Admin Moderation Views (All active Jobs/Gigs)
async function loadAdminModeration() {
  try {
    // Fetch all jobs
    const jobsRes = await fetch('/api/jobs');
    const jobs = await jobsRes.json();
    const jobsTable = document.getElementById('admin-jobs-table');

    if (jobs.length === 0) {
      jobsTable.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No active jobs in system.</td></tr>`;
    } else {
      jobsTable.innerHTML = jobs.map(job => `
        <tr>
          <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(job.title)}</td>
          <td data-label="Employer">${escapeHtml(job.employer_name)}</td>
          <td data-label="Budget" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(job.budget).toFixed(2)}</td>
          <td data-label="Category">${getCategoryBadgeHtml(job.category)}</td>
          <td data-label="Status"><span class="badge badge-${job.status}">${job.status}</span></td>
          <td data-label="Action">
            <button class="btn btn-danger btn-small" onclick="adminDeleteJob(${job.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    }

    // Fetch all gigs
    const gigsRes = await fetch('/api/gigs');
    const gigs = await gigsRes.json();
    const gigsTable = document.getElementById('admin-gigs-table');

    if (gigs.length === 0) {
      gigsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No gigs in system.</td></tr>`;
    } else {
      gigsTable.innerHTML = gigs.map(gig => `
        <tr>
          <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(gig.title)}</td>
          <td data-label="Freelancer">${escapeHtml(gig.jobseeker_name)}</td>
          <td data-label="Price" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(gig.price).toFixed(2)}</td>
          <td data-label="Category">${getCategoryBadgeHtml(gig.category)}</td>
          <td data-label="Action">
            <button class="btn btn-danger btn-small" onclick="adminDeleteGig(${gig.id})">Delete</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// 13. Event Listeners Configuration
function setupEventListeners() {
  // Sidebar Burger Menu Toggle (on Mobile)
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('menu-open');
    });
  }

  // Logout
  const handleLogout = async () => {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (res.ok) window.location.href = '/login';
  };
  const logoutBtn = document.getElementById('logout-sidebar-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  const profileLogoutBtn = document.getElementById('profile-logout-btn');
  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener('click', handleLogout);
  }

  // Employer - Post/Edit Job Form Submission
  const postJobForm = document.getElementById('post-job-form');
  if (postJobForm) {
    postJobForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('job-title').value;
      const category = document.getElementById('job-category').value;
      const budget = parseFloat(document.getElementById('job-budget').value);
      const description = document.getElementById('job-desc').value;
      const latitude = document.getElementById('job-lat').value ? parseFloat(document.getElementById('job-lat').value) : null;
      const longitude = document.getElementById('job-lng').value ? parseFloat(document.getElementById('job-lng').value) : null;

      try {
        let res;
        if (editingJobId) {
          res = await fetch(`/api/jobs/${editingJobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, budget, description, latitude, longitude })
          });
        } else {
          res = await fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, category, budget, description, latitude, longitude })
          });
        }
        const data = await res.json();
        if (res.ok) {
          showDashboardAlert(editingJobId ? 'Job posting updated!' : 'Job posting published!', 'success');
          resetPostJobForm();
          await loadEmployerManageJobs();
          if (!editingJobId) switchTab('dashboard');
        } else {
          showDashboardAlert(data.message || 'Failed to submit job.', 'error');
        }
      } catch (err) {
        console.error(err);
        showDashboardAlert('Network error occurred.', 'error');
      }
    });
  }

  // Jobseeker - Post Gig Form Submission
  const postGigForm = document.getElementById('post-gig-form');
  if (postGigForm) {
    postGigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('gig-title').value;
      const category = document.getElementById('gig-category').value;
      const price = parseFloat(document.getElementById('gig-price').value);
      const delivery_days = parseInt(document.getElementById('gig-delivery').value);
      const description = document.getElementById('gig-desc').value;

      try {
        const res = await fetch('/api/gigs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, category, price, delivery_days, description })
        });
        const data = await res.json();
        if (res.ok) {
          showDashboardAlert('Service gig published successfully!', 'success');
          postGigForm.reset();
          switchTab('dashboard');
        } else {
          showDashboardAlert(data.message || 'Failed to post gig.', 'error');
        }
      } catch (err) {
        console.error(err);
        showDashboardAlert('Network error occurred.', 'error');
      }
    });
  }

  // Seeker - Apply Job Form Submission
  const applyJobForm = document.getElementById('apply-job-form');
  if (applyJobForm) {
    applyJobForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const jobId = document.getElementById('modal-job-id').value;
      const bid_amount = parseFloat(document.getElementById('apply-bid').value);
      const proposal = document.getElementById('apply-proposal').value;

      try {
        const res = await fetch(`/api/jobs/${jobId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bid_amount, proposal })
        });
        const data = await res.json();
        if (res.ok) {
          showDashboardAlert('Your application and bid proposal have been sent!', 'success');
          closeModal('apply-job-modal');
          applyJobForm.reset();
          switchTab('my-applications');
        } else {
          alert(data.message || 'Could not apply.');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
}

// 14. Modals and Actions Hooks
function openApplyModal(jobId, jobTitle, budget) {
  document.getElementById('modal-job-id').value = jobId;
  document.getElementById('modal-job-title').textContent = `Apply for: ${jobTitle}`;
  document.getElementById('modal-job-budget').textContent = `BND ${parseFloat(budget).toFixed(2)}`;
  document.getElementById('apply-bid').value = budget;
  
  const modal = document.getElementById('apply-job-modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

// Employer opens applicants details
async function openApplicantsModal(jobId, jobTitle) {
  document.getElementById('modal-applicants-job-title').textContent = `Applicants for: ${jobTitle}`;
  const listContainer = document.getElementById('modal-applicants-list');
  listContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Fetching applicants...</td></tr>`;

  const modal = document.getElementById('view-applicants-modal');
  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);

  try {
    const res = await fetch(`/api/jobs/${jobId}/applications`);
    const applications = await res.json();

    if (applications.length === 0) {
      listContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No applications received yet.</td></tr>`;
      return;
    }

    listContainer.innerHTML = applications.map(app => {
      let actionHtml = '';
      if (app.status === 'pending') {
        actionHtml = `
          <button class="btn btn-primary btn-small" onclick="updateApplicationStatus(${app.id}, 'accepted', ${jobId})">Accept</button>
          <button class="btn btn-danger btn-small" onclick="updateApplicationStatus(${app.id}, 'rejected', ${jobId})">Reject</button>
        `;
      } else if (app.status === 'accepted') {
        actionHtml = `
          <span class="badge badge-accepted" style="background: rgba(34, 197, 94, 0.15); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); font-weight: 700;">Approved</span>
          <button class="btn btn-small" style="background: #25d366; color: white; border: none; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 0.75rem;" onclick="openChatAndNavigate(${app.jobseeker_id}, 'Job Approved: ${escapeHtml(jobTitle).replace(/'/g, "\\'")}', 'Hi ${escapeHtml(app.applicant_name).replace(/'/g, "\\'")}, your application for \\'${escapeHtml(jobTitle).replace(/'/g, "\\'")}\\' has been approved!')" title="Connect with Applicant on WhatsApp">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
            WhatsApp
          </button>
        `;
      } else {
        actionHtml = `<span class="badge badge-${app.status}">${app.status}</span>`;
      }

      return `
        <tr>
          <td data-label="Applicant" class="cell-primary-title">
            <strong>${escapeHtml(app.applicant_name)}</strong><br>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(app.applicant_email)}</span>
          </td>
          <td data-label="Proposal Details" style="font-size: 0.88rem; max-width: 250px; overflow-wrap: break-word;">${escapeHtml(app.proposal)}</td>
          <td data-label="Bid" style="font-weight: 700; color: var(--color-success);">BND ${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td data-label="Action"><div style="display: flex; gap: 6px; flex-wrap: wrap;">${actionHtml}</div></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    listContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Failed to load applicants.</td></tr>`;
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
  setTimeout(() => modal.style.display = 'none', 300);
}

// Employer accept/reject applicant
async function updateApplicationStatus(appId, status, jobId) {
  if (!confirm(`Are you sure you want to mark this applicant as ${status}?`)) return;
  try {
    const res = await fetch(`/api/jobs/applications/${appId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      showDashboardAlert('Application status updated successfully.', 'success');
      closeModal('view-applicants-modal');
      await loadEmployerManageJobs();
      await loadEmployerDashboard();
    } else {
      showDashboardAlert(data.message || 'Failed to update status.', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Close an open job listing manually
async function closeJobListing(jobId) {
  if (!confirm('Are you sure you want to close this job listing?')) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}/close`, {
      method: 'PUT'
    });
    const data = await res.json();
    if (res.ok) {
      showDashboardAlert('Job listing closed successfully!', 'success');
      await loadEmployerManageJobs();
      await loadEmployerDashboard();
    } else {
      showDashboardAlert(data.message || 'Failed to close job.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Network error occurred.', 'error');
  }
}

// Buyer orders a Gig service
async function orderGig(gigId, gigTitle, price) {
  if (!confirm(`Are you sure you want to purchase the service "${gigTitle}" for $${price.toFixed(2)}?`)) return;

  try {
    const res = await fetch(`/api/gigs/${gigId}/order`, {
      method: 'POST'
    });
    const data = await res.json();

    if (res.ok) {
      showDashboardAlert(`Order placed successfully! Track progress in purchases.`, 'success');
      switchTab('purchases');
    } else {
      showDashboardAlert(data.message || 'Could not place order.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Error connecting to backend.', 'error');
  }
}

// Order status updates (sales delivery / buyer cancels)
async function updateOrderStatus(orderId, status) {
  if (!confirm(`Confirm updating order #${orderId} to status: ${status}?`)) return;

  try {
    const res = await fetch(`/api/gigs/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (res.ok) {
      showDashboardAlert(`Order status updated to ${status}.`, 'success');
      if (currentUser.role === 'jobseeker') {
        switchTab('sales-orders');
      } else {
        switchTab('purchases');
      }
    } else {
      showDashboardAlert(data.message || 'Failed to update order status.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Error communicating with database.', 'error');
  }
}

// Admin suspending/activating users
async function toggleUserStatus(userId) {
  try {
    const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
      method: 'POST'
    });
    const data = await res.json();

    if (res.ok) {
      showDashboardAlert(data.message, 'success');
      await loadAdminDashboard();
    } else {
      showDashboardAlert(data.message || 'Action failed.', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Admin Moderating jobs
async function adminDeleteJob(jobId) {
  if (!confirm('Are you sure you want to permanently delete this job posting?')) return;
  try {
    const res = await fetch(`/api/admin/jobs/${jobId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok) {
      showDashboardAlert('Job listing removed successfully.', 'success');
      await loadAdminModeration();
    } else {
      showDashboardAlert(data.message || 'Delete failed.', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Admin Moderating Gigs
async function adminDeleteGig(gigId) {
  if (!confirm('Are you sure you want to permanently delete this freelance gig?')) return;
  try {
    const res = await fetch(`/api/admin/gigs/${gigId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok) {
      showDashboardAlert('Freelance gig removed successfully.', 'success');
      await loadAdminModeration();
    } else {
      showDashboardAlert(data.message || 'Delete failed.', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

// Helper alert banner in dashboard
function showDashboardAlert(message, type) {
  const alert = document.getElementById('dashboard-alert');
  alert.textContent = message;
  alert.className = `alert-box alert-box-${type}`;
  alert.style.display = 'block';

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Dismiss after 4 seconds
  setTimeout(() => {
    clearAlert();
  }, 4000);
}

function clearAlert() {
  const alert = document.getElementById('dashboard-alert');
  if (alert) {
    alert.style.display = 'none';
    alert.textContent = '';
  }
}

// // Marketplace Explorer globals
let marketplaceMap = null;
let marketplaceMarkers = [];
let marketplaceUserMarker = null;
let marketplaceUserLat = 4.9031; // default Bandar Seri Begawan, Brunei
let marketplaceUserLng = 114.9398;
let currentMarketType = 'jobs'; // 'jobs' or 'gigs'
let marketplaceSearchType = 'jobs'; // alias to stay synchronized
let currentMarketViewMode = 'map'; // 'map' or 'tinder'
let marketplaceItemsData = [];
let tinderCurrentIndex = 0;
let isDraggingCard = false;
let startTouchX = 0;
let startTouchY = 0;
let currentDeltaX = 0;
let currentDeltaY = 0;

function toggleMobileFilterPanel() {
  const filterBar = document.querySelector('.market-filter-bar');
  if (!filterBar) return;
  const isCurrentlyHidden = window.getComputedStyle(filterBar).display === 'none';
  if (isCurrentlyHidden) {
    filterBar.style.setProperty('display', 'grid', 'important');
    filterBar.classList.add('is-expanded');
  } else {
    filterBar.style.setProperty('display', 'none', 'important');
    filterBar.classList.remove('is-expanded');
  }
}

async function initMarketplaceExplorer() {
  const isMobile = window.innerWidth < 768;
  const filterBar = document.querySelector('.market-filter-bar');
  if (filterBar) {
    if (isMobile && !filterBar.classList.contains('is-expanded')) {
      filterBar.style.setProperty('display', 'none', 'important');
    } else if (!isMobile) {
      filterBar.style.setProperty('display', 'flex', 'important');
    }
  }

  // Check if user has saved coordinates
  if (currentUser && currentUser.latitude && currentUser.longitude) {
    marketplaceUserLat = parseFloat(currentUser.latitude);
    marketplaceUserLng = parseFloat(currentUser.longitude);
  }

  // Update DOM display for coordinates
  const coordsDisplay = document.getElementById('market-coords-display');
  if (coordsDisplay) {
    coordsDisplay.textContent = `Lat: ${marketplaceUserLat.toFixed(5)}, Lng: ${marketplaceUserLng.toFixed(5)}`;
  }

  // Set default view mode based on screen width
  setMarketplaceViewMode(isMobile ? 'tinder' : 'map');

  // Set default search type toggle buttons
  updateMarketplaceTypeToggle();

  // Initialize Map with short delay to allow HTML container to settle in DOM
  setTimeout(() => {
    const mapElement = document.getElementById('marketplace-map');
    if (mapElement && typeof L !== 'undefined') {
      if (!marketplaceMap) {
        marketplaceMap = L.map('marketplace-map').setView([marketplaceUserLat, marketplaceUserLng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(marketplaceMap);

        // Set position on click
        marketplaceMap.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          await updateMarketplaceUserLocation(lat, lng);
        });

        // Hook up UI listeners
        setupMarketplaceListeners();
      } else {
        marketplaceMap.setView([marketplaceUserLat, marketplaceUserLng], 13);
      }

      // Render or update draggable user base marker
      if (marketplaceUserMarker) {
        marketplaceUserMarker.setLatLng([marketplaceUserLat, marketplaceUserLng]);
      } else {
        const userIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        marketplaceUserMarker = L.marker([marketplaceUserLat, marketplaceUserLng], { icon: userIcon, draggable: true })
          .addTo(marketplaceMap)
          .bindPopup("<b>Your Search Center</b><br>Drag me or click the map to search a different area.")
          .openPopup();

        marketplaceUserMarker.on('dragend', async (e) => {
          const { lat, lng } = e.target.getLatLng();
          await updateMarketplaceUserLocation(lat, lng);
        });
      }

      // Trigger map resize since container may have just transitioned from display:none
      marketplaceMap.invalidateSize();
    }

    // Fetch and render data
    loadMarketplaceData();
  }, 200);
}

function setMarketplaceType(type) {
  currentMarketType = type;
  marketplaceSearchType = type;
  updateMarketplaceTypeToggle();
  loadMarketplaceData();
}

function updateMarketplaceTypeToggle() {
  const jobsBtn = document.getElementById('toggle-search-jobs');
  const gigsBtn = document.getElementById('toggle-search-gigs');

  if (currentMarketType === 'jobs') {
    if (jobsBtn) jobsBtn.className = 'btn btn-primary';
    if (gigsBtn) gigsBtn.className = 'btn btn-secondary';
  } else {
    if (jobsBtn) jobsBtn.className = 'btn btn-secondary';
    if (gigsBtn) gigsBtn.className = 'btn btn-primary';
  }
}

function setMarketplaceViewMode(mode) {
  const isMobile = window.innerWidth < 768;
  const effectiveMode = mode || (isMobile ? 'tinder' : 'map');
  currentMarketViewMode = effectiveMode;

  const btnMap = document.getElementById('view-mode-map');
  const btnTinder = document.getElementById('view-mode-tinder');
  const mapSplitView = document.getElementById('marketplace-map-split-view');
  const tinderView = document.getElementById('tinder-swipe-view');

  if (effectiveMode === 'map') {
    if (btnMap) btnMap.className = 'btn btn-primary btn-small';
    if (btnTinder) btnTinder.className = 'btn btn-secondary btn-small';
    if (mapSplitView) mapSplitView.style.setProperty('display', 'grid', 'important');
    if (tinderView) tinderView.style.setProperty('display', 'none', 'important');
    setTimeout(() => {
      if (marketplaceMap) {
        marketplaceMap.invalidateSize();
      }
    }, 200);
  } else {
    if (btnMap) btnMap.className = 'btn btn-secondary btn-small';
    if (btnTinder) btnTinder.className = 'btn btn-primary btn-small';
    if (mapSplitView) mapSplitView.style.setProperty('display', 'none', 'important');
    if (tinderView) tinderView.style.setProperty('display', 'block', 'important');
    renderTinderSwipeDeck();
  }
}

async function updateMarketplaceUserLocation(lat, lng) {
  marketplaceUserLat = lat;
  marketplaceUserLng = lng;
  const coordsDisplay = document.getElementById('market-coords-display');
  if (coordsDisplay) {
    coordsDisplay.textContent = `Lat: ${marketplaceUserLat.toFixed(5)}, Lng: ${marketplaceUserLng.toFixed(5)}`;
  }
  
  if (marketplaceUserMarker) {
    marketplaceUserMarker.setLatLng([lat, lng]);
  }

  // Update profile coordinates in backend
  try {
    const res = await fetch('/api/auth/profile/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng })
    });
    if (res.ok) {
      if (currentUser) {
        currentUser.latitude = lat;
        currentUser.longitude = lng;
      }
      const locStatus = document.getElementById('market-location-status');
      if (locStatus) locStatus.textContent = "Location: Pin Selected";
    }
  } catch (err) {
    console.error("Failed to sync location:", err);
  }

  await loadMarketplaceData();
}

async function loadMarketplaceData() {
  const searchInput = document.getElementById('market-search-input');
  const search = searchInput ? searchInput.value.trim() : '';
  const categorySelect = document.getElementById('market-category-filter');
  const category = categorySelect ? categorySelect.value : '';
  const radiusSelect = document.getElementById('market-radius-select');
  const radius = radiusSelect ? radiusSelect.value : 'anywhere';
  const resultsContainer = document.getElementById('marketplace-list-results');
  const listTitle = document.getElementById('market-list-title');

  if (resultsContainer) {
    resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Searching marketplace...</p>';
  }

  if (marketplaceMap) {
    marketplaceMarkers.forEach(m => marketplaceMap.removeLayer(m));
    marketplaceMarkers = [];
  }

  try {
    const isJobs = (currentMarketType === 'jobs');
    if (listTitle) {
      if (isJobs) {
        listTitle.textContent = radius === 'anywhere' ? 'All Available Jobs' : `Jobs Within ${radius} km`;
      } else {
        listTitle.textContent = radius === 'anywhere' ? 'All Freelance Gigs' : `Freelancers Within ${radius} km`;
      }
    }

    const endpoint = isJobs ? '/api/jobs' : '/api/gigs';
    let url = '';
    if (radius === 'anywhere') {
      url = `${endpoint}?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
    } else {
      url = `${endpoint}/proximity?lat=${marketplaceUserLat}&lng=${marketplaceUserLng}&radius=${radius}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to fetch marketplace data');
    }
    const items = await res.json();
    marketplaceItemsData = Array.isArray(items) ? items : [];

    // Plot markers on Leaflet map if map initialized
    if (marketplaceMap) {
      const iconUrl = isJobs 
        ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png' 
        : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png';
      
      const markerIcon = L.icon({
        iconUrl: iconUrl,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      marketplaceItemsData.forEach(item => {
        if (item.latitude && item.longitude) {
          const itemLat = parseFloat(item.latitude);
          const itemLng = parseFloat(item.longitude);
          const distVal = item.distance ? parseFloat(item.distance) : calculateDistance(marketplaceUserLat, marketplaceUserLng, itemLat, itemLng);
          const distanceStr = distVal.toFixed(2);
          const author = item.employer_name || item.jobseeker_name || 'Verified User';
          const amount = parseFloat(item.budget || item.price || 0).toFixed(2);
          const titleSafe = escapeHtml(item.title || '');
          const authorSafe = escapeHtml(author);
          const isSelf = (item.jobseeker_id === currentUser?.id || item.employer_id === currentUser?.id);

          const actionBtnHtml = isJobs ? (
            currentUser?.role === 'jobseeker' 
              ? `<button class="btn btn-primary btn-small" style="padding: 4px 8px; font-size: 0.75rem; width: 100%; margin-top: 6px;" onclick="openApplyModal(${item.id}, '${titleSafe.replace(/'/g, "\\'")}', ${item.budget})">Apply Bid</button>`
              : `<p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-dark);">Employer view</p>`
          ) : (
            isSelf
              ? `<p style="margin: 4px 0 0 0; font-size: 0.75rem; text-align: center; color: var(--text-muted);">Your Service</p>`
              : `<button class="btn btn-primary btn-small" style="padding: 4px 8px; font-size: 0.75rem; width: 100%; margin-top: 6px;" onclick="quickOrderGig(${item.id})">Order Gig</button>`
          );

          const popupContent = `
            <div style="min-width: 170px; font-family: var(--font-body); padding: 4px 0;">
              <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700;">${titleSafe}</h4>
              <p style="margin: 0 0 4px 0; font-size: 0.8rem; color: var(--text-muted);">By ${authorSafe}</p>
              <p style="margin: 0 0 4px 0; font-weight: 700; color: var(--color-success); font-size: 0.95rem;">BND ${amount}</p>
              <p style="margin: 0 0 6px 0; font-size: 0.75rem; color: var(--text-muted);">📍 ${distanceStr} km away</p>
              ${actionBtnHtml}
            </div>
          `;

          const marker = L.marker([itemLat, itemLng], { icon: markerIcon })
            .addTo(marketplaceMap)
            .bindPopup(popupContent);
          marketplaceMarkers.push(marker);
        }
      });

      marketplaceMap.invalidateSize();
    }

    // Render list results for split view
    renderMarketplaceListResults(marketplaceItemsData);

    // Render swipe deck
    tinderCurrentIndex = 0;
    renderTinderSwipeDeck();

  } catch (err) {
    console.error("Marketplace fetch error:", err);
    if (resultsContainer) {
      resultsContainer.innerHTML = `<p style="text-align: center; color: var(--color-danger); padding: 10px;">Error loading results: ${err.message}</p>`;
    }
  }
}

function renderMarketplaceListResults(items) {
  const container = document.getElementById('marketplace-list-results');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted);">No ${currentMarketType} found matching criteria.</div>`;
    return;
  }

  const isJobs = (currentMarketType === 'jobs');

  container.innerHTML = items.map(item => {
    const title = item.title;
    const author = item.employer_name || item.jobseeker_name || 'Verified User';
    const amount = item.budget || item.price;
    const category = item.category;
    const desc = item.description;
    const itemLat = item.latitude ? parseFloat(item.latitude) : null;
    const itemLng = item.longitude ? parseFloat(item.longitude) : null;
    const distVal = itemLat && itemLng ? (item.distance ? parseFloat(item.distance) : calculateDistance(marketplaceUserLat, marketplaceUserLng, itemLat, itemLng)) : null;
    const distanceBadge = distVal !== null ? `<span style="font-size: 0.75rem; color: var(--text-muted); display: inline-flex; align-items: center; gap: 3px;">📍 ${distVal.toFixed(2)} km</span>` : '';
    const isSelf = (item.jobseeker_id === currentUser?.id || item.employer_id === currentUser?.id);
    const targetUserId = item.employer_id || item.jobseeker_id;

    const actionBtn = isJobs ? (
      currentUser?.role === 'jobseeker'
        ? `<button class="btn btn-primary btn-small" style="padding: 6px 12px; font-size: 0.8rem;" onclick="event.stopPropagation(); openApplyModal(${item.id}, '${escapeHtml(title).replace(/'/g, "\\'")}', ${amount})">Apply Bid</button>`
        : ''
    ) : (
      !isSelf
        ? `<button class="btn btn-primary btn-small" style="padding: 6px 12px; font-size: 0.8rem;" onclick="event.stopPropagation(); quickOrderGig(${item.id})">Order Gig</button>`
        : `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-muted); font-size: 0.75rem;">Your Service</span>`
    );

    const focusBtn = (itemLat && itemLng) ? `
      <button class="btn btn-secondary btn-small" style="padding: 6px 10px; font-size: 0.8rem;" onclick="event.stopPropagation(); focusOnMarketplaceItem(${itemLat}, ${itemLng})" title="Locate pin on map">
        📍 Map
      </button>
    ` : '';

    return `
      <div class="glass-panel map-list-item" style="padding: 16px; border-radius: var(--radius-md); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="${(itemLat && itemLng) ? `focusOnMarketplaceItem(${itemLat}, ${itemLng})` : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div style="flex: 1; padding-right: 10px;">
            <h4 style="margin: 0; font-size: 1rem; font-weight: 700;">${escapeHtml(title)}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">by ${escapeHtml(author)}</span>
          </div>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--color-success); white-space: nowrap;">BND ${parseFloat(amount).toFixed(2)}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${escapeHtml(desc)}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge" style="background: rgba(234, 179, 8, 0.15); color: var(--text-dark);">${escapeHtml(category)}</span>
            ${distanceBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${focusBtn}
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function focusOnMarketplaceItem(lat, lng) {
  if (marketplaceMap) {
    marketplaceMap.setView([lat, lng], 15);
    marketplaceMarkers.forEach(m => {
      const pos = m.getLatLng();
      if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
        m.openPopup();
      }
    });
    const mapElement = document.getElementById('marketplace-map');
    if (mapElement && window.innerWidth < 1024) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function setupMarketplaceListeners() {
  const locateBtn = document.getElementById('market-locate-btn');
  if (locateBtn && !locateBtn.dataset.listenerAttached) {
    locateBtn.dataset.listenerAttached = 'true';
    locateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        const locStatus = document.getElementById('market-location-status');
        if (locStatus) locStatus.textContent = "Locating...";
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateMarketplaceUserLocation(latitude, longitude);
            if (marketplaceMap) marketplaceMap.setView([latitude, longitude], 13);
          },
          (err) => {
            console.warn("Geolocation failed or denied:", err);
            updateMarketplaceUserLocation(4.9031, 114.9398);
            showDashboardAlert("Unable to access current location. Defaulting to Bandar Seri Begawan, Brunei.", "warning");
          }
        );
      } else {
        showDashboardAlert("Geolocation not supported by this browser.", "error");
      }
    });
  }

  // Hook up filter inputs to instantly update results
  const searchInput = document.getElementById('market-search-input');
  if (searchInput && !searchInput.dataset.listenerAttached) {
    searchInput.dataset.listenerAttached = 'true';
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadMarketplaceData();
    });
  }

  const categorySelect = document.getElementById('market-category-filter');
  if (categorySelect && !categorySelect.dataset.listenerAttached) {
    categorySelect.dataset.listenerAttached = 'true';
    categorySelect.addEventListener('change', loadMarketplaceData);
  }

  const radiusSelect = document.getElementById('market-radius-select');
  if (radiusSelect && !radiusSelect.dataset.listenerAttached) {
    radiusSelect.dataset.listenerAttached = 'true';
    radiusSelect.addEventListener('change', loadMarketplaceData);
  }

  // Autofill button in employer post job coordinates
  const fillCoordsBtn = document.getElementById('btn-fill-job-coords');
  if (fillCoordsBtn && !fillCoordsBtn.dataset.listenerAttached) {
    fillCoordsBtn.dataset.listenerAttached = 'true';
    fillCoordsBtn.addEventListener('click', () => {
      if (currentUser && currentUser.latitude && currentUser.longitude) {
        document.getElementById('job-lat').value = parseFloat(currentUser.latitude).toFixed(6);
        document.getElementById('job-lng').value = parseFloat(currentUser.longitude).toFixed(6);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            document.getElementById('job-lat').value = position.coords.latitude.toFixed(6);
            document.getElementById('job-lng').value = position.coords.longitude.toFixed(6);
          },
          (err) => {
            showDashboardAlert("Acquire profile location first or enter manually.", "warning");
          }
        );
      } else {
        showDashboardAlert("Enter coordinates manually.", "info");
      }
    });
  }
}

// Client-side Haversine fallback calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Escape HTML to prevent injection
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCategoryBadgeHtml(category) {
  const cleanCat = (category || '').trim();
  let className = 'category-web-development';
  const catLower = cleanCat.toLowerCase();
  if (catLower === 'design') {
    className = 'category-design';
  } else if (catLower === 'writing') {
    className = 'category-writing';
  } else if (catLower === 'marketing') {
    className = 'category-marketing';
  }
  return `<span class="category-badge ${className}">${escapeHtml(cleanCat)}</span>`;
}

// Profile view globals
let profileMap = null;
let profileUserMarker = null;
let profileUserLat = 4.9031;
let profileUserLng = 114.9398;
let currentPortfolioData = null;

async function fetchAndRenderPortfolio() {
  try {
    const res = await fetch('/api/auth/profile/portfolio');
    if (!res.ok) {
      throw new Error('Failed to fetch portfolio data');
    }
    const data = await res.json();
    currentPortfolioData = data;

    const jobsHeaders = document.getElementById('profile-jobs-headers');
    const jobsTable = document.getElementById('profile-jobs-completed-table');
    const jobsEmpty = document.getElementById('profile-jobs-completed-empty');
    const jobsTitle = document.getElementById('profile-jobs-title');

    const freelanceHeaders = document.getElementById('profile-freelance-headers');
    const freelanceTable = document.getElementById('profile-freelance-completed-table');
    const freelanceEmpty = document.getElementById('profile-freelance-completed-empty');
    const freelanceTitle = document.getElementById('profile-freelance-title');

    if (!jobsHeaders || !jobsTable || !jobsEmpty || !jobsTitle ||
        !freelanceHeaders || !freelanceTable || !freelanceEmpty || !freelanceTitle) {
      return;
    }

    // Clear previous
    jobsHeaders.innerHTML = '';
    jobsTable.innerHTML = '';
    freelanceHeaders.innerHTML = '';
    freelanceTable.innerHTML = '';

    if (data.role === 'jobseeker') {
      // Jobseeker UI Header setup
      jobsTitle.innerHTML = 'Secured & Completed Jobs';
      jobsHeaders.innerHTML = `
        <th>Job Title</th>
        <th>Employer</th>
        <th>Hired Bid</th>
        <th>Date Secured</th>
        <th>Status</th>
      `;

      freelanceTitle.innerHTML = 'Freelance Work Completed (Gigs)';
      freelanceHeaders.innerHTML = `
        <th>Gig / Service Title</th>
        <th>Client / Buyer</th>
        <th>Earnings (Price in BND)</th>
        <th>Date Completed</th>
        <th>Status</th>
      `;

      // Render completed jobs
      if (!data.completedJobs || data.completedJobs.length === 0) {
        jobsEmpty.style.display = 'block';
        jobsEmpty.textContent = 'No completed jobs in your portfolio yet.';
      } else {
        jobsEmpty.style.display = 'none';
        data.completedJobs.forEach(job => {
          const tr = document.createElement('tr');
          const dateStr = new Date(job.application_date).toLocaleDateString();
          tr.innerHTML = `
            <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(job.job_title)}</td>
            <td data-label="Employer">${escapeHtml(job.employer_name)}</td>
            <td data-label="Hired Bid" style="font-weight: 600; color: var(--color-success);">BND ${parseFloat(job.bid_amount).toFixed(2)}</td>
            <td data-label="Date Secured">${dateStr}</td>
            <td data-label="Status"><span class="badge badge-completed">Hired & Closed</span></td>
          `;
          jobsTable.appendChild(tr);
        });
      }

      // Render completed freelance work
      if (!data.completedGigs || data.completedGigs.length === 0) {
        freelanceEmpty.style.display = 'block';
        freelanceEmpty.textContent = 'No completed freelance gigs in your portfolio yet.';
      } else {
        freelanceEmpty.style.display = 'none';
        data.completedGigs.forEach(gig => {
          const tr = document.createElement('tr');
          const dateStr = new Date(gig.order_date).toLocaleDateString();
          tr.innerHTML = `
            <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(gig.gig_title)}</td>
            <td data-label="Client / Buyer">${escapeHtml(gig.buyer_name)}</td>
            <td data-label="Earnings" style="font-weight: 600; color: var(--color-success);">BND ${parseFloat(gig.price).toFixed(2)}</td>
            <td data-label="Date Completed">${dateStr}</td>
            <td data-label="Status"><span class="badge badge-completed">Completed</span></td>
          `;
          freelanceTable.appendChild(tr);
        });
      }
    } else if (data.role === 'employer') {
      // Employer UI Header setup
      jobsTitle.innerHTML = 'Filled Job Postings (Completed)';
      jobsHeaders.innerHTML = `
        <th>Job Title</th>
        <th>Secured Freelancer</th>
        <th>Final Bid</th>
        <th>Hired Date</th>
        <th>Status</th>
      `;

      freelanceTitle.innerHTML = 'Freelance Services Bought (Completed)';
      freelanceHeaders.innerHTML = `
        <th>Gig / Service Title</th>
        <th>Freelancer</th>
        <th>Price Paid</th>
        <th>Completed Date</th>
        <th>Status</th>
      `;

      // Render employer closed jobs
      if (!data.completedJobs || data.completedJobs.length === 0) {
        jobsEmpty.style.display = 'block';
        jobsEmpty.textContent = 'No filled job postings yet.';
      } else {
        jobsEmpty.style.display = 'none';
        data.completedJobs.forEach(job => {
          const tr = document.createElement('tr');
          const dateStr = job.hire_date ? new Date(job.hire_date).toLocaleDateString() : new Date(job.job_date).toLocaleDateString();
          const jobseekerText = job.jobseeker_name ? escapeHtml(job.jobseeker_name) : '<span style="color: var(--text-muted);">None</span>';
          const bidText = job.bid_amount ? `BND ${parseFloat(job.bid_amount).toFixed(2)}` : `BND ${parseFloat(job.job_budget).toFixed(2)}`;
          tr.innerHTML = `
            <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(job.job_title)}</td>
            <td data-label="Secured Freelancer">${jobseekerText}</td>
            <td data-label="Final Bid" style="font-weight: 600; color: var(--color-success);">${bidText}</td>
            <td data-label="Hired Date">${dateStr}</td>
            <td data-label="Status"><span class="badge badge-completed">Closed / Filled</span></td>
          `;
          jobsTable.appendChild(tr);
        });
      }

      // Render employer completed freelance services bought
      if (!data.completedGigs || data.completedGigs.length === 0) {
        freelanceEmpty.style.display = 'block';
        freelanceEmpty.textContent = 'No completed freelance purchases yet.';
      } else {
        freelanceEmpty.style.display = 'none';
        data.completedGigs.forEach(gig => {
          const tr = document.createElement('tr');
          const dateStr = new Date(gig.order_date).toLocaleDateString();
          tr.innerHTML = `
            <td data-label="Freelance Service" class="cell-primary-title" style="font-weight: 600;">${escapeHtml(gig.gig_title)}</td>
            <td data-label="Freelancer">${escapeHtml(gig.seller_name)}</td>
            <td data-label="Price Paid" style="font-weight: 600; color: var(--color-success);">BND ${parseFloat(gig.price).toFixed(2)}</td>
            <td data-label="Completed Date">${dateStr}</td>
            <td data-label="Status"><span class="badge badge-completed">Completed</span></td>
          `;
          freelanceTable.appendChild(tr);
        });
      }
    } else {
      jobsTitle.innerHTML = 'Completed Jobs';
      freelanceTitle.innerHTML = 'Freelance Work Completed';
      jobsEmpty.style.display = 'block';
      freelanceEmpty.style.display = 'block';
      jobsEmpty.textContent = 'Portfolios are available for Jobseekers and Employers.';
      freelanceEmpty.textContent = 'Portfolios are available for Jobseekers and Employers.';
    }
  } catch (error) {
    console.error('Error rendering portfolio:', error);
  }
}

async function initProfileView() {
  // Populate text fields
  document.getElementById('profile-display-username').textContent = currentUser.username;
  document.getElementById('profile-avatar-char').textContent = currentUser.username.charAt(0).toUpperCase();
  document.getElementById('profile-display-role').textContent = currentUser.role.toUpperCase();
  document.getElementById('profile-username').value = currentUser.username;
  document.getElementById('profile-email').value = currentUser.email;
  const phoneField = document.getElementById('profile-phone');
  if (phoneField) {
    phoneField.value = currentUser.phone || '+673 8123456';
  }

  // Setup form listener (once)
  const form = document.getElementById('profile-update-form');
  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = "true";
    form.addEventListener('submit', handleProfileUpdateSubmit);
  }

  const portfolioSection = document.getElementById('profile-portfolio-section');
  const portfolioHeader = document.getElementById('profile-portfolio-header');


  if (currentUser.role === 'jobseeker' || currentUser.role === 'employer') {
    if (portfolioSection) portfolioSection.style.display = 'grid';
    if (portfolioHeader) portfolioHeader.style.display = 'flex';
    fetchAndRenderPortfolio();
  } else {
    if (portfolioSection) portfolioSection.style.display = 'none';
    if (portfolioHeader) portfolioHeader.style.display = 'none';
  }
}

async function updateProfileLocation(lat, lng) {
  profileUserLat = lat;
  profileUserLng = lng;
  document.getElementById('profile-coords-display').textContent = `Lat: ${profileUserLat.toFixed(5)}, Lng: ${profileUserLng.toFixed(5)}`;
  document.getElementById('profile-sync-status').textContent = "Saving...";
  document.getElementById('profile-sync-status').className = "badge badge-pending";

  if (profileUserMarker) {
    profileUserMarker.setLatLng([lat, lng]);
  }

  try {
    const res = await fetch('/api/auth/profile/location', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng })
    });
    if (res.ok) {
      currentUser.latitude = lat;
      currentUser.longitude = lng;
      document.getElementById('profile-sync-status').textContent = "Synced";
      document.getElementById('profile-sync-status').className = "badge badge-completed";
    } else {
      throw new Error("API responded with error");
    }
  } catch (err) {
    console.error(err);
    document.getElementById('profile-sync-status').textContent = "Sync Error";
    document.getElementById('profile-sync-status').className = "badge badge-suspended";
  }
}

async function handleProfileUpdateSubmit(e) {
  e.preventDefault();
  
  const username = document.getElementById('profile-username').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const phone = document.getElementById('profile-phone') ? document.getElementById('profile-phone').value.trim() : (currentUser.phone || '+673 8123456');
  const currentPassword = document.getElementById('profile-current-password').value;
  const newPassword = document.getElementById('profile-new-password').value;
  const confirmPassword = document.getElementById('profile-confirm-password').value;

  if (!username) {
    showDashboardAlert("Username is required.", "error");
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    showDashboardAlert("New passwords do not match.", "error");
    return;
  }

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, phone, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser.username = username;
      currentUser.email = email;
      currentUser.phone = phone;
      
      // Update UI displays in real-time
      document.getElementById('sidebar-username').textContent = username;
      document.getElementById('profile-display-username').textContent = username;
      document.getElementById('profile-avatar-char').textContent = username.charAt(0).toUpperCase();

      showDashboardAlert("Profile credentials and WhatsApp number updated successfully!", "success");
      // Clear password fields
      document.getElementById('profile-current-password').value = '';
      document.getElementById('profile-new-password').value = '';
      document.getElementById('profile-confirm-password').value = '';
    } else {
      showDashboardAlert(data.message || "Failed to update profile credentials.", "error");
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert("Server error updating profile.", "error");
  }
}

function downloadPortfolioResume() {
  if (!currentUser || !currentPortfolioData) {
    showDashboardAlert("Portfolio data is not loaded yet.", "warning");
    return;
  }

  // Create printable resume HTML
  const name = currentUser.username;
  const email = currentUser.email;
  const roleName = currentUser.role === 'jobseeker' ? 'Freelance Specialist & Jobseeker' : 'Employer / Hiring Manager';

  let locationInfo = '';
  if (currentUser.latitude && currentUser.longitude) {
    locationInfo = `Base Location: Lat ${parseFloat(currentUser.latitude).toFixed(4)}, Lng ${parseFloat(currentUser.longitude).toFixed(4)}`;
  }

  let jobsHtml = '';
  if (currentPortfolioData.completedJobs && currentPortfolioData.completedJobs.length > 0) {
    currentPortfolioData.completedJobs.forEach(job => {
      const dateVal = job.hire_date || job.application_date || job.job_date;
      const dateStr = new Date(dateVal).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const amount = job.bid_amount ? parseFloat(job.bid_amount).toFixed(2) : parseFloat(job.job_budget).toFixed(2);
      
      if (currentUser.role === 'jobseeker') {
        jobsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(job.job_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Employer: <strong>${escapeHtml(job.employer_name)}</strong> | Contract Value: <strong>BND ${amount}</strong></div>
          </div>
        `;
      } else {
        jobsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(job.job_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Hired Professional: <strong>${escapeHtml(job.jobseeker_name || 'None')}</strong> | Budget Paid: <strong>BND ${amount}</strong></div>
          </div>
        `;
      }
    });
  } else {
    jobsHtml = `<p class="empty-text">No contract listings to display.</p>`;
  }

  let gigsHtml = '';
  if (currentPortfolioData.completedGigs && currentPortfolioData.completedGigs.length > 0) {
    currentPortfolioData.completedGigs.forEach(gig => {
      const dateStr = new Date(gig.order_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const amount = parseFloat(gig.price).toFixed(2);

      if (currentUser.role === 'jobseeker') {
        gigsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(gig.gig_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Client/Buyer: <strong>${escapeHtml(gig.buyer_name)}</strong> | Earnings: <strong>BND ${amount}</strong></div>
          </div>
        `;
      } else {
        gigsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(gig.gig_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Freelancer: <strong>${escapeHtml(gig.seller_name)}</strong> | Price Paid: <strong>BND ${amount}</strong></div>
          </div>
        `;
      }
    });
  } else {
    gigsHtml = `<p class="empty-text">No completed gigs to display.</p>`;
  }

  const titleJobs = currentUser.role === 'jobseeker' ? 'Secured & Completed Contracts' : 'Filled & Completed Job Postings';
  const titleGigs = currentUser.role === 'jobseeker' ? 'Completed Freelance Gig Services' : 'Purchased Freelance Services';

  const resumeWindow = window.open('', '_blank');
  resumeWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(name)} - Portfolio Resume</title>
      <style>
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          line-height: 1.5;
          margin: 40px;
          background: #ffffff;
        }
        .resume-header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .resume-name {
          font-size: 2.2rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.03em;
        }
        .resume-role {
          font-size: 1.1rem;
          color: #2563eb;
          font-weight: 600;
          margin: 5px 0 15px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .resume-contact {
          font-size: 0.9rem;
          color: #64748b;
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .resume-section {
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .resume-item {
          margin-bottom: 18px;
          padding: 10px 0;
        }
        .resume-item-header {
          display: flex;
          justify-content: space-between;
          font-weight: 600;
          font-size: 1.05rem;
          color: #1e293b;
        }
        .item-title {
          color: #0f172a;
        }
        .item-date {
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 400;
        }
        .resume-item-sub {
          font-size: 0.9rem;
          color: #475569;
          margin-top: 5px;
        }
        .empty-text {
          color: #94a3b8;
          font-style: italic;
          font-size: 0.9rem;
        }
        @media print {
          body {
            margin: 20px;
          }
          button, .print-btn-container {
            display: none !important;
          }
        }
        .print-btn-container {
          margin-bottom: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .print-btn {
          background: #2563eb;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
        }
        .print-btn:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="print-btn-container">
        <button class="print-btn" onclick="window.print()">Save / Print PDF</button>
      </div>
      <div class="resume-header">
        <h1 class="resume-name">${escapeHtml(name)}</h1>
        <div class="resume-role">${escapeHtml(roleName)}</div>
        <div class="resume-contact">
          <span>Email: ${escapeHtml(email)}</span>
          ${locationInfo ? `<span>Location: ${escapeHtml(locationInfo)}</span>` : ''}
          <span>Platform: KerjaLu Portfolio</span>
        </div>
      </div>

      <div class="resume-section">
        <h2 class="section-title">${escapeHtml(titleJobs)}</h2>
        ${jobsHtml}
      </div>

      <div class="resume-section">
        <h2 class="section-title">${escapeHtml(titleGigs)}</h2>
        ${gigsHtml}
      </div>
    </body>
    </html>
  `);
  resumeWindow.document.close();
}

// Employer Job Management Helpers
let editingJobId = null;

async function loadEmployerManageJobs() {
  try {
    const res = await fetch('/api/jobs/my-jobs');
    const jobs = await res.json();
    const listBody = document.getElementById('post-job-manage-list');
    if (!listBody) return;

    if (jobs.length === 0) {
      listBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">You haven't posted any jobs yet.</td></tr>`;
    } else {
      listBody.innerHTML = jobs.map(job => `
        <tr>
          <td data-label="Job Title" class="cell-primary-title" style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(job.title)}</td>
          <td data-label="Category">${getCategoryBadgeHtml(job.category)}</td>
          <td data-label="Budget" style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">BND ${parseFloat(job.budget).toFixed(2)}</td>
          <td data-label="Status"><span class="badge badge-${job.status}" style="font-size: 0.7rem;">${job.status}</span></td>
          <td data-label="Action">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-primary btn-small" onclick="openApplicantsModal(${job.id}, '${job.title.replace(/'/g, "\\'")}')">Applicants</button>
              <button class="btn btn-secondary btn-small" onclick="startEditJob(${job.id}, '${job.title.replace(/'/g, "\\'")}', '${job.category.replace(/'/g, "\\'")}', ${job.budget}, '${job.description.replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}', ${job.latitude || 'null'}, ${job.longitude || 'null'})">Edit</button>
              ${job.status === 'open' ? `<button class="btn btn-warning btn-small" onclick="closeJobListing(${job.id})">Close</button>` : ''}
              <button class="btn btn-danger btn-small" onclick="deleteJobListing(${job.id})">Delete</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load employer manage jobs:', err);
  }
}

function startEditJob(id, title, category, budget, description, lat, lng) {
  editingJobId = id;
  document.getElementById('post-job-form-title').textContent = 'Edit Job Listing';
  document.getElementById('post-job-form-subtitle').textContent = 'Update your job requirements and budget.';
  
  document.getElementById('job-title').value = title;
  document.getElementById('job-category').value = category;
  document.getElementById('job-budget').value = budget;
  document.getElementById('job-desc').value = description;
  document.getElementById('job-lat').value = lat !== null ? lat : '';
  document.getElementById('job-lng').value = lng !== null ? lng : '';

  const submitBtn = document.querySelector('#post-job-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'Update Job Posting';
  }

  let cancelEditBtn = document.getElementById('btn-cancel-job-edit');
  if (!cancelEditBtn) {
    cancelEditBtn = document.createElement('button');
    cancelEditBtn.type = 'button';
    cancelEditBtn.id = 'btn-cancel-job-edit';
    cancelEditBtn.className = 'btn btn-secondary';
    cancelEditBtn.textContent = 'Cancel Edit';
    cancelEditBtn.onclick = resetPostJobForm;
    submitBtn.parentNode.insertBefore(cancelEditBtn, submitBtn.nextSibling);
  }
}

function resetPostJobForm() {
  editingJobId = null;
  document.getElementById('post-job-form-title').textContent = 'Create a New Job Listing';
  document.getElementById('post-job-form-subtitle').textContent = 'Post a requirement for freelancers to submit proposals and bid.';
  
  const form = document.getElementById('post-job-form');
  if (form) form.reset();

  const submitBtn = document.querySelector('#post-job-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = 'Publish Job Posting';
  }

  const cancelEditBtn = document.getElementById('btn-cancel-job-edit');
  if (cancelEditBtn) {
    cancelEditBtn.remove();
  }
}

async function deleteJobListing(jobId) {
  if (!confirm('Are you sure you want to delete this job listing? All applications for this job will be permanently removed. This cannot be undone.')) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok) {
      showDashboardAlert('Job listing deleted successfully!', 'success');
      await loadEmployerManageJobs();
      await loadEmployerDashboard();
    } else {
      showDashboardAlert(data.message || 'Failed to delete job.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Network error occurred.', 'error');
  }
}

/* ========================================================================== */
/* WALLET & ESCROW FUNCTIONS                                                  */
/* ========================================================================== */
async function fetchHeaderWalletBalance() {
  try {
    const res = await fetch('/api/wallet');
    if (res.ok) {
      const data = await res.json();
      const headerBal = document.getElementById('header-wallet-balance');
      if (headerBal) headerBal.textContent = `BND ${data.balance}`;
      const modalBal = document.getElementById('modal-wallet-balance');
      if (modalBal) modalBal.textContent = `BND ${data.balance}`;
    }
  } catch (err) {
    console.error('Wallet fetch error:', err);
  }
}

async function openWalletModal() {
  try {
    const res = await fetch('/api/wallet');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('modal-wallet-balance').textContent = `BND ${data.balance}`;
      const tbody = document.getElementById('wallet-transactions-list');
      if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: var(--text-muted); text-align: center;">No transaction history yet.</td></tr>';
      } else {
        tbody.innerHTML = data.transactions.map(t => `
          <tr>
            <td data-label="Type"><span class="badge badge-${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? 'active' : 'pending'}">${t.type}</span></td>
            <td data-label="Description">${escapeHtml(t.description)}</td>
            <td data-label="Amount" style="font-weight:700; color:${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? 'var(--color-success)' : 'var(--color-danger)'};">
              ${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? '+' : '-'} BND ${parseFloat(t.amount).toFixed(2)}
            </td>
            <td data-label="Date">${new Date(t.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
  openModal('wallet-modal');
}

async function submitWalletDeposit(e) {
  e.preventDefault();
  const amountInput = document.getElementById('wallet-deposit-amount');
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) return;

  try {
    const res = await fetch('/api/wallet/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    if (res.ok) {
      showDashboardAlert(data.message, 'success');
      amountInput.value = '';
      await fetchHeaderWalletBalance();
      closeModal('wallet-modal');
    } else {
      showDashboardAlert(data.message || 'Deposit failed.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Network error occurred.', 'error');
  }
}

/* ========================================================================== */
/* NOTIFICATIONS FUNCTIONS                                                   */
/* ========================================================================== */
async function fetchNotifications() {
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();

    const badge = document.getElementById('notif-badge-count');
    if (badge) {
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    const container = document.getElementById('notif-list-container');
    if (container) {
      if (!data.notifications || data.notifications.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.85rem;">No notifications yet.</div>';
      } else {
        container.innerHTML = data.notifications.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick(${n.id}, '${n.link || ''}')">
            <div style="font-weight: 600; margin-bottom: 2px;">${n.title}</div>
            <div style="color: var(--text-muted);">${n.message}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function toggleNotifDropdown() {
  const panel = document.getElementById('notif-dropdown-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  }
}

async function markAllNotificationsRead() {
  try {
    await fetch('/api/notifications/read-all', { method: 'PUT' });
    await fetchNotifications();
  } catch (err) {
    console.error(err);
  }
}

async function handleNotifClick(notifId, link) {
  try {
    await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
    fetchNotifications();
    const panel = document.getElementById('notif-dropdown-panel');
    if (panel) panel.style.display = 'none';

    if (link) {
      if (link.startsWith('messages:')) {
        const otherUserId = link.split(':')[1];
        await switchTab('messages');
        const searchInput = document.getElementById('comm-search-input');
        if (searchInput) {
          const contact = availableContacts.find(c => c.id == otherUserId);
          if (contact) {
            searchInput.value = contact.username;
            filterCommunicationRecords();
          }
        }
      } else if (link === 'orders:purchases') {
        switchTab('purchases');
      } else if (link === 'orders:sales') {
        switchTab('sales-orders');
      } else if (link === 'my-jobs') {
        switchTab('dashboard');
      } else if (link === 'my-applications') {
        switchTab('my-applications');
      } else if (link === 'wallet') {
        openWalletModal();
      }
    }
  } catch (err) {
    console.error(err);
  }
}

/* ========================================================================== */
/* DIRECT MESSAGES & WHATSAPP COMMUNICATION RECORDS                           */
/* ========================================================================== */
let allCommunicationRecords = [];
let availableContacts = [];

async function loadCommunicationRecords() {
  const tbody = document.getElementById('comm-records-tbody');
  const emptyState = document.getElementById('comm-records-empty');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding: 36px; text-align: center; color: var(--text-muted);">Loading communication records...</td></tr>`;
  }
  if (emptyState) emptyState.style.display = 'none';

  try {
    const res = await fetch('/api/messages/records');
    if (!res.ok) throw new Error('Failed to fetch communication records');
    allCommunicationRecords = await res.json();

    // Update stats counters
    const total = allCommunicationRecords.length;
    const outgoing = allCommunicationRecords.filter(r => r.direction === 'outgoing').length;
    const incoming = allCommunicationRecords.filter(r => r.direction === 'incoming').length;

    const elTotal = document.getElementById('comm-stat-total');
    const elOutgoing = document.getElementById('comm-stat-outgoing');
    const elIncoming = document.getElementById('comm-stat-incoming');
    if (elTotal) elTotal.textContent = total;
    if (elOutgoing) elOutgoing.textContent = outgoing;
    if (elIncoming) elIncoming.textContent = incoming;

    filterCommunicationRecords();
  } catch (err) {
    console.error('Error loading communication records:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--color-danger);">Failed to load communication records. Please refresh.</td></tr>`;
    }
  }
}

function filterCommunicationRecords() {
  const searchInput = document.getElementById('comm-search-input');
  const dirFilter = document.getElementById('comm-direction-filter');
  const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const dir = dirFilter ? dirFilter.value : 'all';

  let filtered = allCommunicationRecords;
  if (dir !== 'all') {
    filtered = filtered.filter(r => r.direction === dir);
  }
  if (term) {
    filtered = filtered.filter(r => {
      const partner = (r.partner_username || '').toLowerCase();
      const subject = (r.subject || '').toLowerCase();
      const content = (r.content || '').toLowerCase();
      const phone = (r.partner_phone || '').toLowerCase();
      return partner.includes(term) || subject.includes(term) || content.includes(term) || phone.includes(term);
    });
  }

  renderCommunicationRecords(filtered);
}

function renderCommunicationRecords(records) {
  const tbody = document.getElementById('comm-records-tbody');
  const emptyState = document.getElementById('comm-records-empty');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tbody.innerHTML = records.map(r => {
    const isOut = r.direction === 'outgoing';
    const dateObj = new Date(r.created_at);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const roleBadgeClass = r.partner_role === 'employer' ? 'badge-in-progress' : 'badge-completed';
    const initial = (r.partner_username || '?').charAt(0).toUpperCase();

    return `
      <tr style="border-bottom: 1px solid var(--border-color); transition: var(--transition);" class="comm-record-row" id="record-row-${r.id}">
        <td data-label="Date & Time" style="padding: 14px 18px; font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;">
          <div style="font-weight: 600; color: var(--text-main);">${dateStr}</div>
          <div style="font-size: 0.75rem;">${timeStr}</div>
        </td>
        <td data-label="Contact Person" style="padding: 14px 18px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-primary); color: #0f172a; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.88rem; flex-shrink: 0;">
              ${initial}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
                ${escapeHtml(r.partner_username)}
                <span class="badge ${roleBadgeClass}" style="font-size: 0.65rem; padding: 2px 6px;">${r.partner_role}</span>
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(r.partner_phone)}</div>
            </div>
          </div>
        </td>
        <td data-label="Direction" style="padding: 14px 18px;">
          ${isOut 
            ? `<span class="badge" style="background: rgba(37, 211, 102, 0.12); color: #25d366; border: 1px solid rgba(37, 211, 102, 0.25); font-size: 0.75rem;">↗ Outgoing</span>` 
            : `<span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25); font-size: 0.75rem;">↙ Incoming</span>`
          }
        </td>
        <td data-label="Topic" style="padding: 14px 18px;">
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main);">${escapeHtml(r.subject || 'Direct Inquiry')}</div>
        </td>
        <td data-label="Message Preview" style="padding: 14px 18px; max-width: 260px;">
          <div style="font-size: 0.85rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(r.content)}">
            ${escapeHtml(r.content)}
          </div>
        </td>
        <td data-label="Channel" style="padding: 14px 18px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; background: rgba(37, 211, 102, 0.1); color: #25d366; font-size: 0.75rem; font-weight: 600;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-2.123-.521-1.615-.672-2.658-2.316-2.738-2.424-.078-.107-.655-.873-.655-1.666 0-.793.414-1.184.561-1.345.148-.161.323-.201.431-.201.108 0 .216.002.31.007.1.006.233-.038.365.279.135.323.461 1.127.502 1.209.041.082.069.178.014.287-.054.108-.082.176-.162.272-.082.095-.172.213-.246.286-.081.081-.166.17-.071.333.095.163.422.697.906 1.128.623.555 1.149.728 1.312.809.163.081.258.072.353-.037.095-.108.406-.472.514-.634.108-.162.216-.135.365-.081.148.054.945.446 1.107.527.162.081.27.121.31.189.039.068.039.39-.105.795z"/></svg>
            WhatsApp
          </span>
        </td>
        <td data-label="Action" style="padding: 14px 18px; text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <a href="${r.whatsapp_url}" target="_blank" rel="noopener noreferrer" class="btn btn-small" style="background: #25d366; color: white; border: none; padding: 5px 12px; font-size: 0.8rem; font-weight: 600; text-decoration: none; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(37, 211, 102, 0.25);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-2.123-.521-1.615-.672-2.658-2.316-2.738-2.424-.078-.107-.655-.873-.655-1.666 0-.793.414-1.184.561-1.345.148-.161.323-.201.431-.201.108 0 .216.002.31.007.1.006.233-.038.365.279.135.323.461 1.127.502 1.209.041.082.069.178.014.287-.054.108-.082.176-.162.272-.082.095-.172.213-.246.286-.081.081-.166.17-.071.333.095.163.422.697.906 1.128.623.555 1.149.728 1.312.809.163.081.258.072.353-.037.095-.108.406-.472.514-.634.108-.162.216-.135.365-.081.148.054.945.446 1.107.527.162.081.27.121.31.189.039.068.039.39-.105.795z"/></svg>
              Chat
            </a>
            <button type="button" class="btn btn-secondary btn-small" onclick="viewCommunicationRecord(${r.id})" style="padding: 5px 10px; font-size: 0.8rem;">
              Details
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function openWhatsAppModal(contactId = null, defaultSubject = '', prefillMessage = '') {
  try {
    const res = await fetch('/api/messages/contacts');
    if (res.ok) {
      availableContacts = await res.json();
    }
  } catch (err) {
    console.error(err);
  }

  const select = document.getElementById('wa-modal-contact-select');
  const selectGroup = document.getElementById('wa-modal-select-group');
  const partnerCard = document.getElementById('wa-modal-partner-card');
  const receiverInput = document.getElementById('wa-modal-receiver-id');
  const subjectInput = document.getElementById('wa-modal-subject');
  const contentInput = document.getElementById('wa-modal-content');

  // Populate dropdown
  if (select) {
    if (availableContacts.length === 0) {
      select.innerHTML = `<option value="">-- No approved connections yet (accept an application to unlock) --</option>`;
    } else {
      select.innerHTML = `<option value="">-- Select an active contact --</option>` + 
        availableContacts.map(c => `
          <option value="${c.id}">
            ${c.username} (${c.role.toUpperCase()}) - ${c.phone}
          </option>
        `).join('');
    }
  }

  if (contactId) {
    // Find contact info from list or fetch from API
    let contact = availableContacts.find(c => c.id == contactId);
    if (!contact) {
      try {
        const uRes = await fetch(`/api/messages/user-details/${contactId}`);
        if (uRes.ok) contact = await uRes.json();
      } catch(e){}
    }

    if (!contact) {
      showDashboardAlert("Direct WhatsApp communication unlocks once a job application is approved.", "warning");
      return;
    }

    receiverInput.value = contactId;
    if (selectGroup) selectGroup.style.display = 'none';
    if (partnerCard) partnerCard.style.display = 'block';

    document.getElementById('wa-modal-partner-name').textContent = contact.username;
    document.getElementById('wa-modal-partner-phone').textContent = contact.phone || '+673 8123456';
    document.getElementById('wa-modal-partner-role-badge').textContent = contact.role.toUpperCase();
    document.getElementById('wa-modal-partner-role-badge').className = `badge ${contact.role === 'employer' ? 'badge-in-progress' : 'badge-completed'}`;
    document.getElementById('wa-modal-partner-avatar').textContent = contact.username.charAt(0).toUpperCase();
  } else {
    receiverInput.value = '';
    if (selectGroup) selectGroup.style.display = 'block';
    if (partnerCard) partnerCard.style.display = 'none';
    if (select) select.value = '';
  }

  if (subjectInput) subjectInput.value = defaultSubject || 'Direct Inquiry';
  if (contentInput) contentInput.value = prefillMessage || '';

  openModal('whatsapp-message-modal');
}

function onWhatsAppContactChanged() {
  const select = document.getElementById('wa-modal-contact-select');
  const receiverInput = document.getElementById('wa-modal-receiver-id');
  if (select && receiverInput) {
    receiverInput.value = select.value;
  }
}

async function handleSendWhatsAppMessage(e) {
  if (e) e.preventDefault();
  const receiverId = document.getElementById('wa-modal-receiver-id').value;
  const subject = document.getElementById('wa-modal-subject').value.trim();
  const message = document.getElementById('wa-modal-content').value.trim();

  if (!receiverId) {
    showDashboardAlert('Please select a recipient for your WhatsApp message.', 'warning');
    return;
  }
  if (!message) {
    showDashboardAlert('Please enter message content.', 'warning');
    return;
  }

  const submitBtn = document.getElementById('wa-modal-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Recording & Opening WhatsApp...';
  }

  try {
    const res = await fetch('/api/messages/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiver_id: receiverId,
        subject,
        message
      })
    });

    const data = await res.json();
    if (res.ok) {
      closeModal('whatsapp-message-modal');
      showDashboardAlert('Communication record logged! Opening WhatsApp chat...', 'success');
      
      // Launch WhatsApp directly in a new window/tab
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
      }

      // Switch to messages view and reload records
      if (currentTab !== 'messages') {
        await switchTab('messages');
      } else {
        await loadCommunicationRecords();
      }
    } else {
      showDashboardAlert(data.message || 'Failed to log WhatsApp communication.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Network error recording WhatsApp communication.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.073-2.123-.521-1.615-.672-2.658-2.316-2.738-2.424-.078-.107-.655-.873-.655-1.666 0-.793.414-1.184.561-1.345.148-.161.323-.201.431-.201.108 0 .216.002.31.007.1.006.233-.038.365.279.135.323.461 1.127.502 1.209.041.082.069.178.014.287-.054.108-.082.176-.162.272-.082.095-.172.213-.246.286-.081.081-.166.17-.071.333.095.163.422.697.906 1.128.623.555 1.149.728 1.312.809.163.081.258.072.353-.037.095-.108.406-.472.514-.634.108-.162.216-.135.365-.081.148.054.945.446 1.107.527.162.081.27.121.31.189.039.068.039.39-.105.795z"/></svg>
        Send via WhatsApp & Log
      `;
    }
  }
}

function viewCommunicationRecord(recordId) {
  const record = allCommunicationRecords.find(r => r.id == recordId);
  if (!record) return;

  const dateStr = new Date(record.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const isOut = record.direction === 'outgoing';

  document.getElementById('comm-record-modal-body').innerHTML = `
    <div style="padding: 16px; background: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 18px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Contact Person</div>
          <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
            ${escapeHtml(record.partner_username)}
            <span class="badge ${record.partner_role === 'employer' ? 'badge-in-progress' : 'badge-completed'}">${record.partner_role}</span>
          </div>
          <div style="font-size: 0.85rem; color: #25d366; font-weight: 600; margin-top: 2px;">WhatsApp: ${escapeHtml(record.partner_phone)}</div>
        </div>
        <div style="text-align: right;">
          ${isOut 
            ? `<span class="badge" style="background: rgba(37, 211, 102, 0.12); color: #25d366; border: 1px solid rgba(37, 211, 102, 0.25);">↗ Outgoing (Sent)</span>` 
            : `<span class="badge" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25);">↙ Incoming (Received)</span>`
          }
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${dateStr}</div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 12px;">
        <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Subject / Discussion Topic</div>
        <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${escapeHtml(record.subject || 'Direct Inquiry')}</div>
      </div>
    </div>

    <div>
      <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Recorded Message Content</div>
      <div style="padding: 16px; background: rgba(15, 23, 42, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-main); white-space: pre-wrap; line-height: 1.6;">
        ${escapeHtml(record.content)}
      </div>
    </div>
  `;

  const waBtn = document.getElementById('comm-record-wa-btn');
  if (waBtn) {
    waBtn.href = record.whatsapp_url;
  }

  openModal('comm-record-modal');
}

// Unified openChatAndNavigate: opens WhatsApp direct modal prefilled with context
async function openChatAndNavigate(otherUserId, contextSubject = '', prefillMessage = '') {
  await openWhatsAppModal(otherUserId, contextSubject, prefillMessage);
}

/* ========================================================================== */
/* RATINGS & REVIEWS FUNCTIONS                                               */
/* ========================================================================== */
let selectedRating = 5;

function setRating(val) {
  selectedRating = val;
  document.getElementById('review-rating-value').value = val;
  const btns = document.querySelectorAll('.star-picker-btn');
  btns.forEach(btn => {
    const starNum = parseInt(btn.getAttribute('data-star'));
    if (starNum <= val) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function openReviewModal(orderId) {
  document.getElementById('review-order-id').value = orderId;
  setRating(5);
  document.getElementById('review-comment').value = '';
  openModal('review-modal');
}

async function submitReview(e) {
  e.preventDefault();
  const order_id = document.getElementById('review-order-id').value;
  const rating = parseInt(document.getElementById('review-rating-value').value);
  const comment = document.getElementById('review-comment').value;

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, rating, comment })
    });
    const data = await res.json();
    if (res.ok) {
      showDashboardAlert(data.message, 'success');
      closeModal('review-modal');
      await switchTab(currentTab);
    } else {
      showDashboardAlert(data.message || 'Failed to submit review.', 'error');
    }
  } catch (err) {
    console.error(err);
    showDashboardAlert('Network error occurred.', 'error');
  }
}

// Bind submit and navigation handlers
document.addEventListener('DOMContentLoaded', () => {
  const depositForm = document.getElementById('wallet-deposit-form');
  if (depositForm) depositForm.addEventListener('submit', submitWalletDeposit);

  const waForm = document.getElementById('whatsapp-message-form');
  if (waForm) waForm.addEventListener('submit', handleSendWhatsAppMessage);

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) reviewForm.addEventListener('submit', submitReview);

  // Mobile Sidebar Hamburger Toggle
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('menu-open');
    });
  }
});

/* ========================================================================== */
/* TINDER SWIPE DECK RENDER & GESTURES                                        */
/* ========================================================================== */
function renderTinderSwipeDeck() {
  const containers = [
    document.getElementById('seeker-swipe-card-stack'),
    document.getElementById('employer-swipe-card-stack'),
    document.getElementById('swipe-card-stack')
  ].filter(Boolean);

  if (containers.length === 0) return;

  const remainingItems = marketplaceItemsData.slice(tinderCurrentIndex);

  containers.forEach(stackContainer => {
    if (remainingItems.length === 0) {
      stackContainer.innerHTML = `
        <div class="glass-panel text-center" style="margin:auto; padding:40px 20px; border-radius:24px;">
          <h3>That's all for now!</h3>
          <p style="margin-top:5px; font-size:0.9rem;">You've swiped through all available ${currentMarketType}.</p>
          <button class="btn btn-primary" style="margin-top:15px;" onclick="tinderCurrentIndex = 0; renderTinderSwipeDeck();">Start Over</button>
        </div>
      `;
      return;
    }

    // Render top 3 stacked cards
    const cardsToRender = remainingItems.slice(0, 3);
    stackContainer.innerHTML = cardsToRender.map((item, index) => {
      const isTop = index === 0;
      const title = item.title;
      const author = item.employer_name || item.jobseeker_name || 'Verified User';
      const amount = item.budget || item.price;
      const category = item.category;
      const desc = item.description;

      return `
        <div class="swipe-card" id="swipe-card-${tinderCurrentIndex + index}" data-item-id="${item.id}" data-author-id="${item.employer_id || item.jobseeker_id}">
          <!-- Stamp overlays for top card -->
          ${isTop ? `
            <div class="swipe-stamp swipe-stamp-like" id="stamp-like">APPLY / ORDER</div>
            <div class="swipe-stamp swipe-stamp-pass" id="stamp-pass">PASS</div>
          ` : ''}

          <!-- Top Header Pill Badges -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span class="badge" style="background:rgba(234, 179, 8, 0.15); color:var(--text-main); font-weight:600; padding:6px 12px; font-size:0.85rem;">
                ${escapeHtml(category)}
              </span>
              <span style="font-size:1.3rem; font-weight:800; color:var(--color-success);">
                BND ${parseFloat(amount).toFixed(2)}
              </span>
            </div>

            <h2 style="font-size:1.4rem; font-weight:700; margin-bottom:6px; color:var(--text-main); line-height:1.3;">
              ${escapeHtml(title)}
            </h2>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">
              Posted by <strong>${escapeHtml(author)}</strong>
            </p>
          </div>

          <!-- Center Description Snippet -->
          <div style="background:var(--bg-primary); padding:14px; border-radius:16px; border:1px solid var(--border-color); margin-bottom:15px; flex:1; overflow:hidden;">
            <p style="font-size:0.88rem; color:var(--text-main); line-height:1.5; display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical; overflow:hidden;">
              ${escapeHtml(desc)}
            </p>
          </div>

          <!-- Card Footer -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:12px;">
            <span>Swipe left to Pass, right to Apply</span>
            <span style="color:var(--color-primary); font-weight:600;">Swipe Right ➔</span>
          </div>
        </div>
      `;
    }).join('');
  });

  // Attach Gesture listeners to top card
  attachTopCardGestures();
}

function attachTopCardGestures() {
  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (!topCard) return;

  // Touch Events
  topCard.addEventListener('touchstart', onDragStart, { passive: true });
  topCard.addEventListener('touchmove', onDragMove, { passive: false });
  topCard.addEventListener('touchend', onDragEnd);

  // Mouse Events
  topCard.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
}

function onDragStart(e) {
  isDraggingCard = true;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  startTouchX = clientX;
  startTouchY = clientY;

  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (topCard) topCard.style.transition = 'none';
}

function onDragMove(e) {
  if (!isDraggingCard) return;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  currentDeltaX = clientX - startTouchX;
  currentDeltaY = clientY - startTouchY;
  const rotateDeg = currentDeltaX * 0.08;

  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (topCard) {
    topCard.style.transform = `translate(${currentDeltaX}px, ${currentDeltaY}px) rotate(${rotateDeg}deg)`;
  }

  // Update Stamp Opacity
  const stampLike = document.getElementById('stamp-like');
  const stampPass = document.getElementById('stamp-pass');
  if (stampLike && stampPass) {
    if (currentDeltaX > 20) {
      stampLike.style.opacity = Math.min(currentDeltaX / 100, 1);
      stampPass.style.opacity = 0;
    } else if (currentDeltaX < -20) {
      stampPass.style.opacity = Math.min(Math.abs(currentDeltaX) / 100, 1);
      stampLike.style.opacity = 0;
    } else {
      stampLike.style.opacity = 0;
      stampPass.style.opacity = 0;
    }
  }

  if (e.touches && Math.abs(currentDeltaX) > 15) {
    e.preventDefault();
  }
}

function onDragEnd() {
  if (!isDraggingCard) return;
  isDraggingCard = false;

  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);

  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (!topCard) return;

  topCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease';

  if (currentDeltaX > 100) {
    // Swiped Right -> Like / Action
    completeCardSwipe('right');
  } else if (currentDeltaX < -100) {
    // Swiped Left -> Pass
    completeCardSwipe('left');
  } else {
    // Reset position
    topCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
    const stampLike = document.getElementById('stamp-like');
    const stampPass = document.getElementById('stamp-pass');
    if (stampLike) stampLike.style.opacity = 0;
    if (stampPass) stampPass.style.opacity = 0;
  }

  currentDeltaX = 0;
  currentDeltaY = 0;
}

function triggerCardSwipe(direction) {
  completeCardSwipe(direction);
}

function reloadSwipeDeck() {
  tinderCurrentIndex = 0;
  renderTinderSwipeDeck();
}

function completeCardSwipe(direction) {
  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (!topCard) return;

  const currentItem = marketplaceItemsData[tinderCurrentIndex];

  if (direction === 'right') {
    topCard.style.transform = 'translate(500px, 50px) rotate(35deg)';
    topCard.style.opacity = 0;

    // Trigger action after brief animation
    setTimeout(() => {
      if (currentItem) {
        const subtext = document.getElementById('match-modal-subtext');
        if (subtext) {
          subtext.textContent = `You swiped right on "${currentItem.title}"!`;
        }
        openModal('match-modal');

        if (currentMarketType === 'jobs') {
          openApplyModal(currentItem.id, currentItem.title, currentItem.budget);
        } else {
          quickOrderGig(currentItem.id);
        }
      }
      tinderCurrentIndex++;
      renderTinderSwipeDeck();
    }, 250);
  } else {
    topCard.style.transform = 'translate(-500px, 50px) rotate(-35deg)';
    topCard.style.opacity = 0;

    setTimeout(() => {
      tinderCurrentIndex++;
      renderTinderSwipeDeck();
    }, 250);
  }
}

function viewCurrentSwipeCardDetails() {
  const currentItem = marketplaceItemsData[tinderCurrentIndex];
  if (!currentItem) return;

  const title = currentItem.title;
  const author = currentItem.employer_name || currentItem.jobseeker_name || 'Verified User';
  const amount = parseFloat(currentItem.budget || currentItem.price).toFixed(2);
  const category = currentItem.category;
  const desc = currentItem.description;

  document.getElementById('swipe-detail-title').textContent = title;
  document.getElementById('swipe-detail-body').innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: var(--bg-primary); padding: 12px 16px; border-radius: 12px;">
      <div>
        <span class="badge" style="background: rgba(234, 179, 8, 0.15); color: var(--text-main); font-weight: 600;">${escapeHtml(category)}</span>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Posted by: <strong>${escapeHtml(author)}</strong></div>
      </div>
      <div style="font-size: 1.3rem; font-weight: 800; color: var(--color-success);">BND ${amount}</div>
    </div>
    <div style="margin-bottom: 12px; font-weight: 600;">Description & Details:</div>
    <div style="white-space: pre-wrap; color: var(--text-main); background: var(--bg-primary); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color); max-height: 220px; overflow-y: auto;">${escapeHtml(desc)}</div>
  `;

  const actionBtn = document.getElementById('swipe-detail-action-btn');
  if (currentMarketType === 'jobs') {
    actionBtn.textContent = 'Apply Bid Now';
    actionBtn.onclick = function() {
      closeModal('swipe-detail-modal');
      triggerCardSwipe('right');
    };
  } else {
    actionBtn.textContent = 'Order Gig Now';
    actionBtn.onclick = function() {
      closeModal('swipe-detail-modal');
      triggerCardSwipe('right');
    };
  }

  openModal('swipe-detail-modal');
}

function openApplyModal(jobId, jobTitle, budget) {
  document.getElementById('modal-job-id').value = jobId;
  document.getElementById('modal-job-title').textContent = `Apply for: ${jobTitle}`;
  document.getElementById('modal-job-budget').textContent = `BND ${parseFloat(budget).toFixed(2)}`;
  document.getElementById('apply-bid').value = budget;
  document.getElementById('apply-proposal').value = '';
  openModal('apply-job-modal');
}

function quickOrderGig(gigId) {
  fetch(`/api/gigs/${gigId}/order`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      showDashboardAlert(data.message, res.ok ? 'success' : 'error');
      fetchHeaderWalletBalance();
    })
    .catch(err => console.error(err));
}

