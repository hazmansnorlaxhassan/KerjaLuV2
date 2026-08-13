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

    // Default tab
    switchTab('dashboard');
  } catch (err) {
    console.error(err);
    window.location.href = '/login';
  }
}

function renderSidebarMenu() {
  const menu = document.getElementById('sidebar-nav');
  if (!menu) return;
  let html = '';

  if (currentUser.role === 'jobseeker') {
    html = `
      <li id="menu-dashboard"><a href="#" onclick="switchTab('dashboard')"><span class="nav-icon">📊</span><span class="nav-label">Dashboard</span></a></li>
      <li id="menu-marketplace-explorer"><a href="#" onclick="switchTab('marketplace-explorer')"><span class="nav-icon">🗺️</span><span class="nav-label">Explorer</span></a></li>
      <li id="menu-my-applications"><a href="#" onclick="switchTab('my-applications')"><span class="nav-icon">📋</span><span class="nav-label">Applications</span></a></li>
      <li id="menu-sales-orders"><a href="#" onclick="switchTab('sales-orders')"><span class="nav-icon">💰</span><span class="nav-label">Sales</span></a></li>
      <li id="menu-purchases"><a href="#" onclick="switchTab('purchases')"><span class="nav-icon">🛍️</span><span class="nav-label">Purchases</span></a></li>
      <li id="menu-messages"><a href="#" onclick="switchTab('messages')"><span class="nav-icon">💬</span><span class="nav-label">Messages</span></a></li>
      <li id="menu-profile"><a href="#" onclick="switchTab('profile')"><span class="nav-icon">👤</span><span class="nav-label">Profile</span></a></li>
    `;
  } else if (currentUser.role === 'employer') {
    html = `
      <li id="menu-dashboard"><a href="#" onclick="switchTab('dashboard')"><span class="nav-icon">📊</span><span class="nav-label">Dashboard</span></a></li>
      <li id="menu-marketplace-explorer"><a href="#" onclick="switchTab('marketplace-explorer')"><span class="nav-icon">🗺️</span><span class="nav-label">Explorer</span></a></li>
      <li id="menu-employer-post-job"><a href="#" onclick="switchTab('employer-post-job')"><span class="nav-icon">➕</span><span class="nav-label">Post Job</span></a></li>
      <li id="menu-purchases"><a href="#" onclick="switchTab('purchases')"><span class="nav-icon">🛍️</span><span class="nav-label">Purchases</span></a></li>
      <li id="menu-messages"><a href="#" onclick="switchTab('messages')"><span class="nav-icon">💬</span><span class="nav-label">Messages</span></a></li>
      <li id="menu-profile"><a href="#" onclick="switchTab('profile')"><span class="nav-icon">👤</span><span class="nav-label">Profile</span></a></li>
    `;
  } else if (currentUser.role === 'admin') {
    html = `
      <li id="menu-dashboard"><a href="#" onclick="switchTab('dashboard')"><span class="nav-icon">📊</span><span class="nav-label">Stats</span></a></li>
      <li id="menu-admin-moderation"><a href="#" onclick="switchTab('admin-moderation')"><span class="nav-icon">🛡️</span><span class="nav-label">Moderate</span></a></li>
      <li id="menu-messages"><a href="#" onclick="switchTab('messages')"><span class="nav-icon">💬</span><span class="nav-label">Messages</span></a></li>
      <li id="menu-profile"><a href="#" onclick="switchTab('profile')"><span class="nav-icon">👤</span><span class="nav-label">Profile</span></a></li>
    `;
  }

  menu.innerHTML = html;
}

// 3. Tab Switching Router
async function switchTab(tabName) {
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
    welcomeTitle.textContent = `Direct Messages`;
    welcomeSubtitle.textContent = `Communicate directly with employers and jobseekers.`;
    document.getElementById('view-messages').style.display = 'block';
    await loadConversations();
  }
}

// 4. Jobseeker Dashboard Loaders
async function loadJobseekerDashboard() {
  try {
    currentMarketType = 'jobs';
    loadMarketplaceData();

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
    document.getElementById('seeker-stat-earnings').textContent = `$${earnings.toFixed(2)}`;

    // Load seeker's own gigs
    const gigsRes = await fetch('/api/gigs/my-gigs');
    const gigs = await gigsRes.json();
    const tableBody = document.getElementById('seeker-gigs-table');
    
    if (gigs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">You haven't posted any freelance services yet.</td></tr>`;
    } else {
      tableBody.innerHTML = gigs.map(gig => `
        <tr>
          <td style="font-weight: 600;">${gig.title}</td>
          <td>${getCategoryBadgeHtml(gig.category)}</td>
          <td style="font-weight: 700; color: var(--color-success);">$${parseFloat(gig.price).toFixed(2)}</td>
          <td>${gig.delivery_days} Days</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(gig.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');
    }

    // Render Seeker's Applied Jobs
    const appliedJobsTable = document.getElementById('seeker-applied-jobs-table');
    if (apps.length === 0) {
      appliedJobsTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No job applications submitted yet.</td></tr>`;
    } else {
      appliedJobsTable.innerHTML = apps.map(app => `
        <tr>
          <td style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(app.job_title)}</td>
          <td style="font-size: 0.85rem;">${escapeHtml(app.employer_name)}</td>
          <td style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">$${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td><span class="badge badge-${app.status}" style="font-size: 0.7rem;">${app.status}</span></td>
        </tr>
      `).join('');
    }

    // Render Seeker's Ordered Gigs
    const orderedGigsTable = document.getElementById('seeker-ordered-gigs-table');
    if (purchases.length === 0) {
      orderedGigsTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">No gigs ordered yet.</td></tr>`;
    } else {
      orderedGigsTable.innerHTML = purchases.map(order => `
        <tr>
          <td style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(order.gig_title)}</td>
          <td style="font-size: 0.85rem;">${escapeHtml(order.seller_name)}</td>
          <td style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">$${parseFloat(order.price).toFixed(2)}</td>
          <td><span class="badge badge-${order.status}" style="font-size: 0.7rem;">${order.status}</span></td>
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
    loadMarketplaceData();

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
    document.getElementById('employer-stat-spend').textContent = `$${spend.toFixed(2)}`;

    // Render Employer's Posted Jobs
    const tableBody = document.getElementById('employer-jobs-table');
    if (jobs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">You haven't posted any job listings yet.</td></tr>`;
    } else {
      tableBody.innerHTML = jobs.map(job => `
        <tr>
          <td style="font-weight: 600;">${job.title}</td>
          <td>${getCategoryBadgeHtml(job.category)}</td>
          <td style="font-weight: 700; color: var(--color-success);">$${parseFloat(job.budget).toFixed(2)}</td>
          <td>
            <a href="#" onclick="openApplicantsModal(${job.id}, '${job.title.replace(/'/g, "\\'")}')" class="btn btn-secondary btn-small">
              👤 ${job.applicants_count} Applicants
            </a>
          </td>
          <td><span class="badge badge-${job.status}">${job.status}</span></td>
          <td>
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
          <td>#ORD-${order.id}</td>
          <td style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(order.gig_title)}</td>
          <td style="font-size: 0.85rem;">${escapeHtml(order.seller_name)}</td>
          <td style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">$${parseFloat(order.price).toFixed(2)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
          <td><span class="badge badge-${order.status}" style="font-size: 0.7rem;">${order.status}</span></td>
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
    document.getElementById('admin-stat-volume').textContent = `$${parseFloat(stats.salesVolume).toFixed(2)}`;

    // Load users list
    const usersRes = await fetch('/api/admin/users');
    const users = await usersRes.json();
    const tableBody = document.getElementById('admin-users-table');

    if (users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    } else {
      tableBody.innerHTML = users.map(user => `
        <tr>
          <td style="font-weight: 600;">${user.username}</td>
          <td>${user.email}</td>
          <td><span class="badge badge-in-progress">${user.role}</span></td>
          <td><span class="badge badge-${user.status}">${user.status}</span></td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(user.created_at).toLocaleDateString()}</td>
          <td>
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
      tableBody.innerHTML = apps.map(app => `
        <tr>
          <td style="font-weight: 600;">${app.job_title}</td>
          <td>${app.employer_name}</td>
          <td style="color: var(--color-success); font-weight: 600;">$${parseFloat(app.job_budget).toFixed(2)}</td>
          <td style="font-weight: 700; color: var(--color-success);">$${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(app.created_at).toLocaleDateString()}</td>
          <td><span class="badge badge-${app.status}">${app.status}</span></td>
        </tr>
      `).join('');
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
          <td>#ORD-${order.id}</td>
          <td style="font-weight: 600;">${order.gig_title}</td>
          <td>
            ${order.seller_name}
            <button class="btn btn-secondary btn-small" style="padding: 2px 6px; font-size: 0.75rem; margin-left: 5px;" onclick="openChatAndNavigate(${order.seller_id})">💬 Chat</button>
          </td>
          <td style="font-weight: 700; color: var(--color-success);">RM ${parseFloat(order.price).toFixed(2)}</td>
          <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
          <td><span class="badge badge-${order.status}">${order.status}</span></td>
          <td>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${order.status === 'pending' ? 
                `<button class="btn btn-danger btn-small" onclick="updateOrderStatus(${order.id}, 'cancelled')">Cancel Order</button>` : ''}
              ${order.status === 'completed' ? 
                `<button class="btn btn-primary btn-small" style="padding: 4px 10px;" onclick="openReviewModal(${order.id})">⭐ Review</button>` : ''}
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
            <td>#ORD-${order.id}</td>
            <td style="font-weight: 600;">${order.gig_title}</td>
            <td>
              ${order.buyer_name}
              <button class="btn btn-secondary btn-small" style="padding: 2px 6px; font-size: 0.75rem; margin-left: 5px;" onclick="openChatAndNavigate(${order.buyer_id})">💬 Chat</button>
            </td>
            <td style="font-weight: 700; color: var(--color-success);">RM ${parseFloat(order.price).toFixed(2)}</td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(order.created_at).toLocaleDateString()}</td>
            <td><span class="badge badge-${order.status}">${order.status}</span></td>
            <td><div style="display: flex; gap: 8px;">${actionButtons}</div></td>
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
          <td style="font-weight: 600;">${job.title}</td>
          <td>${job.employer_name}</td>
          <td style="font-weight: 700; color: var(--color-success);">$${parseFloat(job.budget).toFixed(2)}</td>
          <td>${getCategoryBadgeHtml(job.category)}</td>
          <td><span class="badge badge-${job.status}">${job.status}</span></td>
          <td>
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
          <td style="font-weight: 600;">${gig.title}</td>
          <td>${gig.jobseeker_name}</td>
          <td style="font-weight: 700; color: var(--color-success);">$${parseFloat(gig.price).toFixed(2)}</td>
          <td>${getCategoryBadgeHtml(gig.category)}</td>
          <td>
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
  const logoutBtn = document.getElementById('logout-sidebar-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) window.location.href = '/login';
    });
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
function openApplyModal(jobId, budget, title) {
  document.getElementById('modal-job-id').value = jobId;
  document.getElementById('modal-job-title').textContent = `Apply for: ${title}`;
  document.getElementById('modal-job-budget').textContent = `$${parseFloat(budget).toFixed(2)}`;
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
      } else {
        actionHtml = `<span class="badge badge-${app.status}">${app.status}</span>`;
      }

      return `
        <tr>
          <td>
            <strong>${app.applicant_name}</strong><br>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${app.applicant_email}</span>
          </td>
          <td style="font-size: 0.88rem; max-width: 250px; overflow-wrap: break-word;">${app.proposal}</td>
          <td style="font-weight: 700; color: var(--color-primary);">$${parseFloat(app.bid_amount).toFixed(2)}</td>
          <td><div style="display: flex; gap: 6px;">${actionHtml}</div></td>
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

// Marketplace Explorer globals
let marketplaceMap = null;
let marketplaceMarkers = [];
let marketplaceUserMarker = null;
let marketplaceUserLat = 5.9804; // default Kota Kinabalu
let marketplaceUserLng = 116.0735;
let marketplaceSearchType = 'jobs'; // 'jobs' or 'gigs'

async function initMarketplaceExplorer() {
  // Check if user has saved coordinates
  if (currentUser.latitude && currentUser.longitude) {
    marketplaceUserLat = parseFloat(currentUser.latitude);
    marketplaceUserLng = parseFloat(currentUser.longitude);
  }

  // Update DOM displays
  document.getElementById('market-coords-display').textContent = `Lat: ${marketplaceUserLat.toFixed(5)}, Lng: ${marketplaceUserLng.toFixed(5)}`;
  
  // Set default search type toggle button active
  updateMarketplaceTypeToggle();

  // Initialize Map with short delay to allow HTML display to settle
  setTimeout(() => {
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
      // Trigger map resize since it might have been hidden
      marketplaceMap.invalidateSize();
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

    // Fetch and render data
    loadMarketplaceData();
  }, 200);
}

function setMarketplaceType(type) {
  marketplaceSearchType = type;
  updateMarketplaceTypeToggle();
  loadMarketplaceData();
}

function updateMarketplaceTypeToggle() {
  const jobsBtn = document.getElementById('toggle-search-jobs');
  const gigsBtn = document.getElementById('toggle-search-gigs');

  if (marketplaceSearchType === 'jobs') {
    jobsBtn.className = 'btn btn-pill-active';
    gigsBtn.className = 'btn btn-pill-inactive';
  } else {
    jobsBtn.className = 'btn btn-pill-inactive';
    gigsBtn.className = 'btn btn-pill-active';
  }
}

async function updateMarketplaceUserLocation(lat, lng) {
  marketplaceUserLat = lat;
  marketplaceUserLng = lng;
  document.getElementById('market-coords-display').textContent = `Lat: ${marketplaceUserLat.toFixed(5)}, Lng: ${marketplaceUserLng.toFixed(5)}`;
  
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
      currentUser.latitude = lat;
      currentUser.longitude = lng;
      document.getElementById('market-location-status').textContent = "Location: Pin Selected";
    }
  } catch (err) {
    console.error("Failed to sync location:", err);
  }

  await loadMarketplaceData();
}

async function loadMarketplaceData() {
  if (!marketplaceMap) return;

  // Clear existing markers
  marketplaceMarkers.forEach(m => marketplaceMap.removeLayer(m));
  marketplaceMarkers = [];

  const search = document.getElementById('market-search-input').value.trim();
  const category = document.getElementById('market-category-filter').value;
  const radius = document.getElementById('market-radius-select').value;
  const resultsContainer = document.getElementById('marketplace-list-results');
  const listTitle = document.getElementById('market-list-title');

  resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Searching marketplace...</p>';

  try {
    if (marketplaceSearchType === 'jobs') {
      listTitle.textContent = radius === 'anywhere' ? 'All Available Jobs' : `Jobs Within ${radius} km`;
      
      let url = '';
      if (radius === 'anywhere') {
        // Query standard search
        url = `/api/jobs?`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
      } else {
        // Query proximity search
        url = `/api/jobs/proximity?lat=${marketplaceUserLat}&lng=${marketplaceUserLng}&radius=${radius}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
      }

      const res = await fetch(url);
      const jobs = await res.json();

      if (!res.ok) throw new Error(jobs.message || 'Failed to fetch jobs');

      if (jobs.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">No jobs found matching the filters.</p>`;
        return;
      }

      let listHtml = '';
      const jobIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      jobs.forEach(job => {
        const jobLat = parseFloat(job.latitude || marketplaceUserLat);
        const jobLng = parseFloat(job.longitude || marketplaceUserLng);
        // Distance display helper
        const distVal = job.distance ? parseFloat(job.distance) : calculateDistance(marketplaceUserLat, marketplaceUserLng, jobLat, jobLng);
        const distanceStr = distVal.toFixed(2);

        listHtml += `
          <div class="map-list-item" onclick="focusOnMarketplaceItem(${jobLat}, ${jobLng})">
            <h4>${escapeHtml(job.title)}</h4>
            <p style="font-size: 0.85rem; max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 5px;">
              ${escapeHtml(job.description)}
            </p>
            <div class="meta">
              <span>Employer: ${escapeHtml(job.employer_name)}</span>
              <span class="price">$${parseFloat(job.budget).toFixed(2)}</span>
            </div>
            <div class="meta" style="margin-top: 4px;">
              ${getCategoryBadgeHtml(job.category)}
              <span>${distanceStr} km away</span>
            </div>
            <div style="margin-top: 10px;">
              ${currentUser.role === 'jobseeker' ? 
                `<button class="btn btn-primary btn-small" style="width: 100%; padding: 6px;" onclick="event.stopPropagation(); openApplyModal(${job.id}, ${job.budget}, '${job.title.replace(/'/g, "\\'")}')">Apply for Job</button>` : 
                `<span style="font-size: 0.75rem; color: var(--text-dark); display: block; text-align: center;">Log in as Jobseeker to apply</span>`}
            </div>
          </div>
        `;

        // Only plot on map if coordinates exist
        if (job.latitude && job.longitude) {
          const markerPopupContent = `
            <div style="min-width: 150px; font-family: var(--font-body);">
              <h4 style="margin: 0 0 5px 0; font-size: 0.95rem;">${escapeHtml(job.title)}</h4>
              <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: var(--text-muted);">Posted by ${escapeHtml(job.employer_name)}</p>
              <p style="margin: 0 0 10px 0; font-weight: 700; color: var(--color-success);">$${parseFloat(job.budget).toFixed(2)}</p>
              ${currentUser.role === 'jobseeker' ? 
                `<button class="btn btn-primary btn-small" style="padding: 4px 8px; font-size: 0.75rem; width: 100%;" onclick="openApplyModal(${job.id}, ${job.budget}, '${job.title.replace(/'/g, "\\'")}')">Apply</button>` : 
                `<p style="margin: 0; font-size: 0.75rem; color: var(--text-dark);">Employer view</p>`}
              <p style="margin: 5px 0 0 0; font-size: 0.7rem; color: var(--text-muted); text-align: right;">${distanceStr} km</p>
            </div>
          `;
          const marker = L.marker([jobLat, jobLng], { icon: jobIcon })
            .addTo(marketplaceMap)
            .bindPopup(markerPopupContent);
          marketplaceMarkers.push(marker);
        }
      });

      resultsContainer.innerHTML = listHtml;

    } else if (marketplaceSearchType === 'gigs') {
      listTitle.textContent = radius === 'anywhere' ? 'All Freelance Gigs' : `Freelancers Within ${radius} km`;

      let url = '';
      if (radius === 'anywhere') {
        url = `/api/gigs?`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
      } else {
        url = `/api/gigs/proximity?lat=${marketplaceUserLat}&lng=${marketplaceUserLng}&radius=${radius}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
      }

      const res = await fetch(url);
      const gigs = await res.json();

      if (!res.ok) throw new Error(gigs.message || 'Failed to fetch gigs');

      if (gigs.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">No freelance gigs found matching filters.</p>`;
        return;
      }

      let listHtml = '';
      const gigIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      gigs.forEach(gig => {
        const gigLat = parseFloat(gig.latitude || marketplaceUserLat);
        const gigLng = parseFloat(gig.longitude || marketplaceUserLng);
        const distVal = gig.distance ? parseFloat(gig.distance) : calculateDistance(marketplaceUserLat, marketplaceUserLng, gigLat, gigLng);
        const distanceStr = distVal.toFixed(2);

        const isSelf = gig.jobseeker_id === currentUser.id;
        const actionButton = isSelf 
          ? `<button class="btn btn-secondary btn-small" style="width: 100%; margin-top: 10px; padding: 6px; cursor: not-allowed;" disabled>Your Service</button>`
          : `<button class="btn btn-primary btn-small" style="width: 100%; margin-top: 10px; padding: 6px;" onclick="event.stopPropagation(); orderGig(${gig.id}, '${gig.title.replace(/'/g, "\\'")}', ${gig.price})">Order Service</button>`;

        listHtml += `
          <div class="map-list-item" onclick="focusOnMarketplaceItem(${gigLat}, ${gigLng})">
            <h4>${escapeHtml(gig.title)}</h4>
            <p style="font-size: 0.85rem; max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin-bottom: 5px;">
              ${escapeHtml(gig.description)}
            </p>
            <div class="meta">
              <span>Seller: ${escapeHtml(gig.jobseeker_name)}</span>
              <span class="price">$${parseFloat(gig.price).toFixed(2)}</span>
            </div>
            <div class="meta" style="margin-top: 4px;">
              ${getCategoryBadgeHtml(gig.category)}
              <span>${distanceStr} km away</span>
            </div>
            ${actionButton}
          </div>
        `;

        if (gig.latitude && gig.longitude) {
          const popupAction = isSelf
            ? `<p style="margin: 0; font-size: 0.75rem; text-align: center; color: var(--text-muted);">Your Service</p>`
            : `<button class="btn btn-primary btn-small" style="padding: 4px 8px; font-size: 0.75rem; width: 100%;" onclick="orderGig(${gig.id}, '${gig.title.replace(/'/g, "\\'")}', ${gig.price})">Order</button>`;

          const markerPopupContent = `
            <div style="min-width: 150px; font-family: var(--font-body);">
              <h4 style="margin: 0 0 5px 0; font-size: 0.95rem;">${escapeHtml(gig.title)}</h4>
              <p style="margin: 0 0 5px 0; font-size: 0.8rem; color: var(--text-muted);">By ${escapeHtml(gig.jobseeker_name)}</p>
              <p style="margin: 0 0 10px 0; font-weight: 700; color: var(--color-success);">$${parseFloat(gig.price).toFixed(2)}</p>
              ${popupAction}
              <p style="margin: 5px 0 0 0; font-size: 0.7rem; color: var(--text-muted); text-align: right;">${distanceStr} km</p>
            </div>
          `;
          const marker = L.marker([gigLat, gigLng], { icon: gigIcon })
            .addTo(marketplaceMap)
            .bindPopup(markerPopupContent);
          marketplaceMarkers.push(marker);
        }
      });

      resultsContainer.innerHTML = listHtml;
    }
  } catch (err) {
    console.error("Marketplace fetch error:", err);
    resultsContainer.innerHTML = `<p style="text-align: center; color: var(--color-danger); padding: 10px;">Error loading results: ${err.message}</p>`;
  }
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
  }
}

function setupMarketplaceListeners() {
  const locateBtn = document.getElementById('market-locate-btn');
  if (locateBtn) {
    locateBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        document.getElementById('market-location-status').textContent = "Locating...";
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await updateMarketplaceUserLocation(latitude, longitude);
            marketplaceMap.setView([latitude, longitude], 13);
          },
          (err) => {
            console.warn("Geolocation failed or denied:", err);
            updateMarketplaceUserLocation(5.9804, 116.0735);
            showDashboardAlert("Unable to access current location. Defaulting center.", "warning");
          }
        );
      } else {
        showDashboardAlert("Geolocation not supported by this browser.", "error");
      }
    });
  }

  // Hook up filter inputs to instantly update results
  const searchInput = document.getElementById('market-search-input');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadMarketplaceData();
    });
  }

  const categorySelect = document.getElementById('market-category-filter');
  if (categorySelect) {
    categorySelect.addEventListener('change', loadMarketplaceData);
  }

  const radiusSelect = document.getElementById('market-radius-select');
  if (radiusSelect) {
    radiusSelect.addEventListener('change', loadMarketplaceData);
  }

  // Autofill button in employer post job coordinates
  const fillCoordsBtn = document.getElementById('btn-fill-job-coords');
  if (fillCoordsBtn) {
    fillCoordsBtn.addEventListener('click', () => {
      if (currentUser.latitude && currentUser.longitude) {
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
let profileUserLat = 5.9804;
let profileUserLng = 116.0735;
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
        <th>Earnings (Price)</th>
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
            <td style="font-weight: 600;">${escapeHtml(job.job_title)}</td>
            <td>${escapeHtml(job.employer_name)}</td>
            <td style="font-weight: 600; color: var(--color-success);">$${parseFloat(job.bid_amount).toFixed(2)}</td>
            <td>${dateStr}</td>
            <td><span class="badge badge-completed">Hired & Closed</span></td>
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
            <td style="font-weight: 600;">${escapeHtml(gig.gig_title)}</td>
            <td>${escapeHtml(gig.buyer_name)}</td>
            <td style="font-weight: 600; color: var(--color-success);">$${parseFloat(gig.price).toFixed(2)}</td>
            <td>${dateStr}</td>
            <td><span class="badge badge-completed">Completed</span></td>
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
          const bidText = job.bid_amount ? `$${parseFloat(job.bid_amount).toFixed(2)}` : `$${parseFloat(job.job_budget).toFixed(2)}`;
          tr.innerHTML = `
            <td style="font-weight: 600;">${escapeHtml(job.job_title)}</td>
            <td>${jobseekerText}</td>
            <td style="font-weight: 600; color: var(--color-success);">${bidText}</td>
            <td>${dateStr}</td>
            <td><span class="badge badge-completed">Closed / Filled</span></td>
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
            <td style="font-weight: 600;">${escapeHtml(gig.gig_title)}</td>
            <td>${escapeHtml(gig.seller_name)}</td>
            <td style="font-weight: 600; color: var(--color-success);">$${parseFloat(gig.price).toFixed(2)}</td>
            <td>${dateStr}</td>
            <td><span class="badge badge-completed">Completed</span></td>
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

  // Setup form listener (once)
  const form = document.getElementById('profile-update-form');
  if (form && !form.dataset.listenerAttached) {
    form.dataset.listenerAttached = "true";
    form.addEventListener('submit', handleProfileUpdateSubmit);
  }

  const portfolioSection = document.getElementById('profile-portfolio-section');
  const portfolioHeader = document.getElementById('profile-portfolio-header');
  const layoutContainer = document.querySelector('.profile-layout-container');

  if (layoutContainer) {
    layoutContainer.style.gridTemplateColumns = '1fr';
    layoutContainer.style.maxWidth = '600px';
    layoutContainer.style.margin = '0 auto';
  }

  if (currentUser.role === 'jobseeker') {
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
      body: JSON.stringify({ username, email, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser.username = username;
      currentUser.email = email;
      
      // Update UI displays in real-time
      document.getElementById('sidebar-username').textContent = username;
      document.getElementById('profile-display-username').textContent = username;
      document.getElementById('profile-avatar-char').textContent = username.charAt(0).toUpperCase();

      showDashboardAlert("Profile credentials updated successfully!", "success");
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
            <div class="resume-item-sub">Employer: <strong>${escapeHtml(job.employer_name)}</strong> | Contract Value: <strong>$${amount}</strong></div>
          </div>
        `;
      } else {
        jobsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(job.job_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Hired Professional: <strong>${escapeHtml(job.jobseeker_name || 'None')}</strong> | Budget Paid: <strong>$${amount}</strong></div>
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
            <div class="resume-item-sub">Client/Buyer: <strong>${escapeHtml(gig.buyer_name)}</strong> | Earnings: <strong>$${amount}</strong></div>
          </div>
        `;
      } else {
        gigsHtml += `
          <div class="resume-item">
            <div class="resume-item-header">
              <span class="item-title">${escapeHtml(gig.gig_title)}</span>
              <span class="item-date">${dateStr}</span>
            </div>
            <div class="resume-item-sub">Freelancer: <strong>${escapeHtml(gig.seller_name)}</strong> | Price Paid: <strong>$${amount}</strong></div>
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
          <span>📧 ${escapeHtml(email)}</span>
          ${locationInfo ? `<span>📍 ${escapeHtml(locationInfo)}</span>` : ''}
          <span>💻 Platform: KerjaLu Portfolio</span>
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
          <td style="font-weight: 600; font-size: 0.85rem;">${escapeHtml(job.title)}</td>
          <td>${getCategoryBadgeHtml(job.category)}</td>
          <td style="font-weight: 700; color: var(--color-success); font-size: 0.85rem;">$${parseFloat(job.budget).toFixed(2)}</td>
          <td><span class="badge badge-${job.status}" style="font-size: 0.7rem;">${job.status}</span></td>
          <td>
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
      if (headerBal) headerBal.textContent = `RM ${data.balance}`;
      const modalBal = document.getElementById('modal-wallet-balance');
      if (modalBal) modalBal.textContent = `RM ${data.balance}`;
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
      document.getElementById('modal-wallet-balance').textContent = `RM ${data.balance}`;
      const tbody = document.getElementById('wallet-transactions-list');
      if (!data.transactions || data.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="color: var(--text-muted); text-align: center;">No transaction history yet.</td></tr>';
      } else {
        tbody.innerHTML = data.transactions.map(t => `
          <tr>
            <td><span class="badge badge-${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? 'active' : 'pending'}">${t.type}</span></td>
            <td>${t.description}</td>
            <td style="font-weight:700; color:${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? 'var(--color-success)' : 'var(--color-danger)'};">
              ${t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund' ? '+' : '-'} RM ${parseFloat(t.amount).toFixed(2)}
            </td>
            <td>${new Date(t.created_at).toLocaleDateString()}</td>
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
        await openChatThread(otherUserId);
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
/* DIRECT MESSAGING CHAT FUNCTIONS                                            */
/* ========================================================================== */
let activeChatPartnerId = null;

async function loadConversations() {
  try {
    const res = await fetch('/api/messages/conversations');
    if (!res.ok) return;
    const threads = await res.json();

    const list = document.getElementById('messages-threads-list');
    if (!threads || threads.length === 0) {
      list.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:0.85rem;">No active conversations yet.</div>';
      return;
    }

    list.innerHTML = threads.map(t => `
      <div class="chat-thread-item ${activeChatPartnerId == t.other_user_id ? 'active' : ''}" onclick="openChatThread(${t.other_user_id})">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <strong style="font-size:0.9rem;">${t.other_username}</strong>
          ${t.unread_count > 0 ? `<span class="badge badge-pending" style="font-size:0.7rem;">${t.unread_count} new</span>` : ''}
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
          ${t.last_sender_id == currentUser.id ? 'You: ' : ''}${t.last_message}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function openChatThread(otherUserId) {
  activeChatPartnerId = otherUserId;
  const input = document.getElementById('chat-input-text');
  const btn = document.getElementById('chat-send-btn');
  if (input) input.disabled = false;
  if (btn) btn.disabled = false;

  try {
    const res = await fetch(`/api/messages/thread/${otherUserId}`);
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('chat-partner-name').textContent = data.partner.username;
    const roleBadge = document.getElementById('chat-partner-role');
    roleBadge.textContent = data.partner.role;
    roleBadge.className = `badge role-badge badge-${data.partner.role}`;
    roleBadge.style.display = 'inline-block';

    const container = document.getElementById('chat-messages-container');
    if (!data.messages || data.messages.length === 0) {
      container.innerHTML = '<div style="margin:auto; text-align:center; color:var(--text-muted); font-size:0.9rem;">No messages exchanged yet. Send a greeting!</div>';
    } else {
      container.innerHTML = data.messages.map(m => `
        <div class="chat-bubble ${m.sender_id == currentUser.id ? 'chat-bubble-mine' : 'chat-bubble-other'}">
          <div>${m.content}</div>
          <div style="font-size:0.7rem; opacity:0.7; margin-top:2px; text-align:${m.sender_id == currentUser.id ? 'right' : 'left'};">
            ${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      `).join('');
    }

    container.scrollTop = container.scrollHeight;
    await loadConversations();
  } catch (err) {
    console.error(err);
  }
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();
  if (!activeChatPartnerId) return;

  const input = document.getElementById('chat-input-text');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiver_id: activeChatPartnerId,
        content
      })
    });

    if (res.ok) {
      input.value = '';
      await openChatThread(activeChatPartnerId);
    } else {
      const data = await res.json();
      showDashboardAlert(data.message || 'Failed to send message.', 'error');
    }
  } catch (err) {
    console.error(err);
  }
}

async function openChatAndNavigate(otherUserId) {
  await switchTab('messages');
  await openChatThread(otherUserId);
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

  const chatForm = document.getElementById('chat-send-form');
  if (chatForm) chatForm.addEventListener('submit', sendChatMessage);

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
/* MARKETPLACE & TINDER SWIPE DECK ("GIGMATCH MODE") ENGINE                   */
/* ========================================================================== */
let currentMarketType = 'jobs'; // 'jobs' or 'gigs'
let currentMarketViewMode = 'map'; // 'map' or 'tinder'
let marketplaceItemsData = [];
let tinderCurrentIndex = 0;
let isDraggingCard = false;
let startTouchX = 0;
let startTouchY = 0;
let currentDeltaX = 0;
let currentDeltaY = 0;

async function initMarketplaceExplorer() {
  if (window.innerWidth <= 992) {
    setMarketplaceViewMode('tinder');
  } else {
    setMarketplaceViewMode(currentMarketViewMode || 'map');
  }
  await loadMarketplaceData();
}

function setMarketplaceType(type) {
  currentMarketType = type;
  const btnJobs = document.getElementById('toggle-search-jobs');
  const btnGigs = document.getElementById('toggle-search-gigs');

  if (type === 'jobs') {
    if (btnJobs) btnJobs.className = 'btn btn-primary';
    if (btnGigs) btnGigs.className = 'btn btn-secondary';
  } else {
    if (btnJobs) btnJobs.className = 'btn btn-secondary';
    if (btnGigs) btnGigs.className = 'btn btn-primary';
  }

  loadMarketplaceData();
}

function setMarketplaceViewMode(mode) {
  currentMarketViewMode = mode;
  const btnMap = document.getElementById('view-mode-map');
  const btnTinder = document.getElementById('view-mode-tinder');

  const mapSplitView = document.getElementById('marketplace-map-split-view');
  const tinderView = document.getElementById('tinder-swipe-view');

  if (mode === 'map') {
    if (btnMap) btnMap.className = 'btn btn-primary btn-small';
    if (btnTinder) btnTinder.className = 'btn btn-secondary btn-small';
    if (mapSplitView) mapSplitView.style.display = 'grid';
    if (tinderView) tinderView.style.display = 'none';
  } else {
    if (btnMap) btnMap.className = 'btn btn-secondary btn-small';
    if (btnTinder) btnTinder.className = 'btn btn-primary btn-small';
    if (mapSplitView) mapSplitView.style.display = 'none';
    if (tinderView) tinderView.style.display = 'block';
    renderTinderSwipeDeck();
  }
}

async function loadMarketplaceData() {
  const keyword = document.getElementById('market-search-input')?.value || '';
  const category = document.getElementById('market-category-filter')?.value || '';

  const endpoint = currentMarketType === 'jobs' ? '/api/jobs' : '/api/gigs';
  let url = `${endpoint}?search=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;
    marketplaceItemsData = await res.json();

    // Render list results for map mode
    renderMarketplaceListResults(marketplaceItemsData);

    // Initialize or render Tinder Deck
    tinderCurrentIndex = 0;
    if (currentMarketViewMode === 'tinder') {
      renderTinderSwipeDeck();
    }
  } catch (err) {
    console.error('Error loading marketplace data:', err);
  }
}

function renderMarketplaceListResults(items) {
  const container = document.getElementById('marketplace-list-results');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted);">No ${currentMarketType} found matching criteria.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const title = item.title;
    const author = item.employer_name || item.jobseeker_name || 'Verified User';
    const amount = item.budget || item.price;
    const category = item.category;
    const desc = item.description;

    return `
      <div class="glass-panel" style="padding: 16px; border-radius: var(--radius-md);">
        <div style="display:flex; justify-space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <h4 style="margin:0; font-size:1rem;">${escapeHtml(title)}</h4>
            <span style="font-size:0.8rem; color:var(--text-muted);">by ${escapeHtml(author)}</span>
          </div>
          <span style="font-size:1.1rem; font-weight:700; color:var(--color-success);">RM ${parseFloat(amount).toFixed(2)}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(desc)}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="badge" style="background:rgba(234, 179, 8, 0.15); color:var(--text-dark);">${escapeHtml(category)}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-small" style="padding:4px 8px; font-size:0.75rem;" onclick="openChatAndNavigate(${item.employer_id || item.jobseeker_id})">💬 Chat</button>
            ${currentMarketType === 'jobs' ? 
              (currentUser.role === 'jobseeker' ? `<button class="btn btn-primary btn-small" style="padding:4px 10px;" onclick="openApplyModal(${item.id}, '${escapeHtml(title)}', ${amount})">Apply Bid</button>` : '') :
              (item.jobseeker_id !== currentUser.id ? `<button class="btn btn-primary btn-small" style="padding:4px 10px;" onclick="quickOrderGig(${item.id})">Order Gig</button>` : '')
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

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
          <div style="font-size:3rem; margin-bottom:10px;">🎉</div>
          <h3>That's all for now!</h3>
          <p style="margin-top:5px; font-size:0.9rem;">You've swiped through all available ${currentMarketType}.</p>
          <button class="btn btn-primary" style="margin-top:15px;" onclick="tinderCurrentIndex = 0; renderTinderSwipeDeck();">🔄 Start Over</button>
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
                🏷️ ${escapeHtml(category)}
              </span>
              <span style="font-size:1.3rem; font-weight:800; color:var(--color-success);">
                RM ${parseFloat(amount).toFixed(2)}
              </span>
            </div>

            <h2 style="font-size:1.4rem; font-weight:700; margin-bottom:6px; color:var(--text-main); line-height:1.3;">
              ${escapeHtml(title)}
            </h2>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:15px;">
              👤 Posted by <strong>${escapeHtml(author)}</strong>
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
            <span>📍 Swipe left to Pass, right to Apply</span>
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

function completeCardSwipe(direction) {
  const topCard = document.querySelector('.swipe-card:nth-child(1)');
  if (!topCard) return;

  const currentItem = marketplaceItemsData[tinderCurrentIndex];

  if (direction === 'right') {
    topCard.style.transform = 'translate(400px, 50px) rotate(30deg)';
    topCard.style.opacity = 0;

    // Trigger action after brief animation
    setTimeout(() => {
      if (currentItem) {
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
    topCard.style.transform = 'translate(-400px, 50px) rotate(-30deg)';
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

  alert(`📋 ${currentItem.title}\n\nCategory: ${currentItem.category}\nBudget/Price: RM ${parseFloat(currentItem.budget || currentItem.price).toFixed(2)}\n\nDescription:\n${currentItem.description}`);
}

function openApplyModal(jobId, jobTitle, budget) {
  document.getElementById('modal-job-id').value = jobId;
  document.getElementById('modal-job-title').textContent = `Apply for: ${jobTitle}`;
  document.getElementById('modal-job-budget').textContent = `RM ${parseFloat(budget).toFixed(2)}`;
  document.getElementById('apply-bid').value = budget;
  document.getElementById('apply-proposal').value = '';
  openModal('apply-job-modal');
}

function quickOrderGig(gigId) {
  if (confirm('Would you like to purchase this freelance gig service now using your wallet balance?')) {
    fetch(`/api/gigs/${gigId}/order`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        showDashboardAlert(data.message, 'success');
        fetchHeaderWalletBalance();
      })
      .catch(err => console.error(err));
  }
}

