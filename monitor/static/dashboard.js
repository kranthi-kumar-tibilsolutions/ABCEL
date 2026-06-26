const loginScreen = document.getElementById('login-screen');
const dashboard    = document.getElementById('dashboard');
let refreshTimer   = null;
let chart          = null;

function fmtMinutes(min) {
  if (min < 1) return `${Math.round(min * 60)}s`;
  if (min < 60) return `${min.toFixed(1)}m`;
  return `${(min / 60).toFixed(1)}h`;
}

function fmtTime(ts) {
  return new Date(ts * 1000).toLocaleString();
}

function showLogin() {
  clearInterval(refreshTimer);
  loginScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  refreshAll();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshAll, 5000);
}

async function api(path, opts) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) } });
  if (res.status === 401) {
    showLogin();
    throw new Error('unauthenticated');
  }
  if (!res.ok) throw new Error(`${path} failed`);
  return res.json();
}

function renderSummary(s) {
  document.getElementById('stat-active').textContent   = s.active_now;
  document.getElementById('stat-users').textContent     = s.unique_users_total;
  document.getElementById('stat-sessions').textContent  = s.sessions_24h;
  document.getElementById('stat-avg').textContent        = fmtMinutes(s.avg_session_minutes);
}

function renderUsers(rows) {
  const tbody = document.querySelector('#users-table tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.email}</td>
      <td>${r.company}</td>
      <td>${r.sessions}</td>
      <td>${fmtMinutes(r.total_minutes)}</td>
      <td>${fmtTime(r.last_seen)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty">No data yet</td></tr>';
}

function renderCompanies(rows) {
  const tbody = document.querySelector('#companies-table tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.company}</td>
      <td>${r.users}</td>
      <td>${r.sessions}</td>
      <td>${fmtMinutes(r.total_minutes)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty">No data yet</td></tr>';
}

function renderRequests(data) {
  document.getElementById('requests-summary').textContent =
    `${data.total_requests} requests in 24h · ${data.error_rate}% errors`;
  const tbody = document.querySelector('#requests-table tbody');
  tbody.innerHTML = data.endpoints.map(r => `
    <tr>
      <td>${r.path}</td>
      <td>${r.count}</td>
      <td>${r.avg_ms}ms</td>
      <td>${r.max_ms}ms</td>
      <td>${r.errors ? `<span class="error-count">${r.errors}</span>` : '0'}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty">No data yet</td></tr>';
}

function renderFlow(data) {
  const entryBody = document.querySelector('#entry-table tbody');
  entryBody.innerHTML = data.entry_pages.map(r => `<tr><td>${r.page}</td><td>${r.count}</td></tr>`).join('')
    || '<tr><td colspan="2" class="empty">No data yet</td></tr>';

  const exitBody = document.querySelector('#exit-table tbody');
  exitBody.innerHTML = data.exit_pages.map(r => `<tr><td>${r.page}</td><td>${r.count}</td></tr>`).join('')
    || '<tr><td colspan="2" class="empty">No data yet</td></tr>';

  const transBody = document.querySelector('#transitions-table tbody');
  transBody.innerHTML = data.transitions.map(r => `<tr><td>${r.flow}</td><td>${r.count}</td></tr>`).join('')
    || '<tr><td colspan="2" class="empty">No data yet</td></tr>';
}

function renderPages(rows) {
  const tbody = document.querySelector('#pages-table tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.page}</td>
      <td>${r.visits}</td>
      <td>${fmtMinutes(r.minutes)}</td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="empty">No data yet</td></tr>';
}

function renderRecent(rows) {
  const tbody = document.querySelector('#recent-table tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${fmtTime(r.ts)}</td>
      <td><span class="pill pill-${r.type}">${r.type}</span></td>
      <td>${r.email || '–'}</td>
      <td>${r.page || r.path || '–'}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty">No data yet</td></tr>';
}

function renderTimeseries(rows) {
  const labels = rows.map(r => new Date(r.hour * 1000).toLocaleTimeString([], { hour: '2-digit' }));
  const data   = rows.map(r => r.sessions);
  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }
  chart = new Chart(document.getElementById('timeseries-chart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Sessions', data, tension: 0.3, fill: true }] },
    options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { display: false } } },
  });
}

async function refreshAll() {
  try {
    const [summary, users, pages, recent, timeseries, companies, requests, flow] = await Promise.all([
      api('/api/summary'),
      api('/api/users'),
      api('/api/pages'),
      api('/api/recent?limit=50'),
      api('/api/timeseries?hours=24'),
      api('/api/companies'),
      api('/api/requests?hours=24'),
      api('/api/flow'),
    ]);
    renderSummary(summary);
    renderUsers(users);
    renderPages(pages);
    renderRecent(recent);
    renderTimeseries(timeseries);
    renderCompanies(companies);
    renderRequests(requests);
    renderFlow(flow);
    document.getElementById('updated-at').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (e) {
    // showLogin() already handled the 401 case inside api()
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('login-password').value;
  const errorEl  = document.getElementById('login-error');
  try {
    const res = await fetch('/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });
    if (!res.ok) throw new Error('bad password');
    errorEl.classList.add('hidden');
    showDashboard();
  } catch {
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  showLogin();
});

// On load, probe auth state.
api('/api/summary').then(showDashboard).catch(() => {});
