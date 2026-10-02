// Paste your NEW deployed Google Apps Script Web App URL here!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzn0REveRYia0fixibsOowwtpcBw_weabHpU5YQ79_CWETiF4d_CB7ztfJYADi-UAtPw/exec";

// Global Variables
let customerDataList = [];
let billDataList = []; 
let partsPurchaseList = [];
let partsSaleList = [];
let vehicleStockList = [];
let mainDataLoaded = false;
let mainDataPromise = null;
let currentBillCustomerObj = null;
let savedBankDetails = {};
let currentFilter = "all";
let currentBranch = localStorage.getItem("daduBranch") || "Main Branch";
let availableBranches = ["Main Branch"];

// Hash-based routing map
const ROUTES = {
  "dashboard": { url: "Dashboard/dashboard.html", context: "dashboard" },
  "customer-entry": { url: "Customer/customer-entry.html", context: "customerEntry" },
  "customer-details": { url: "Customer/customer-details.html", context: "customerDetails" },
  "bill-generate": { url: "bill/bill-generate.html", context: "billGenerate" },
  "report": { url: "report/report.html", context: "report" },
  "dropdown": { url: "Dropdown/dropdown.html", context: "dropdown" }
};

// Chart instances
let todaySalesChartInst = null;
let monthlySalesChartInst = null;

// ---------------- LOGIN / ACCOUNT ----------------

// লগইন করা না থাকলে সরাসরি login.html এ পাঠিয়ে দাও
if (!localStorage.getItem("daduSessionToken") || !localStorage.getItem("daduBranch")) {
  location.replace("login.html");
}

function logout() {
  localStorage.removeItem("daduSessionToken");
  localStorage.removeItem("daduBranch");
  localStorage.removeItem("daduCurrentBranch");
  localStorage.removeItem("daduLoggedIn");
  location.replace("login.html");
}

window.apiFetch = function(url, options = {}) {
  const token = localStorage.getItem("daduSessionToken");
  const method = String(options.method || "GET").toUpperCase();
  if (method === "GET") {
    const separator = url.includes("?") ? "&" : "?";
    url += separator + "token=" + encodeURIComponent(token || "");
  }
  else if (options.body && typeof options.body === "string") {
    try {
      const payload = JSON.parse(options.body);
      payload.token = token;
      payload.branch = currentBranch;
      options = { ...options, body: JSON.stringify(payload) };
    } catch (_) {}
  }
  return fetch(url, options).then(async response => {
    try {
      const result = await response.clone().json();
      if (result.status === "error" && /session expired/i.test(result.message || "")) logout();
    } catch (_) {}
    return response;
  });
};

window.openSettings = function() {
  const app = document.getElementById("app-content");
  renderPageWithLoader(() => {
    const isMainBranch = String(currentBranch).trim().toLowerCase() === "main branch";
    app.innerHTML = `<section class="content-section settings-page"><h1><i class="fa-solid fa-gear"></i> Settings</h1><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:20px;align-items:start"><div class="settings-card"><h3>Branch Login</h3><p>Signed in to <strong>${escapeHtml(currentBranch)}</strong>.</p>${isMainBranch ? `<form id="main-credentials-form"><h3>Main Branch Login ID &amp; Password</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end"><div class="form-group"><label for="main-login-username">Login ID</label><input id="main-login-username" autocomplete="username" required maxlength="80"></div><div class="form-group"><label for="main-login-password">New Password</label><input id="main-login-password" type="password" autocomplete="new-password" required minlength="6" maxlength="128"></div></div><div class="form-actions"><button class="btn-primary" type="submit">Save Main Branch Login</button></div><p id="main-credentials-message" role="status" aria-live="polite"></p><button type="button" class="btn-edit" id="show-main-credentials">Show saved Login ID and Password</button><p id="saved-main-credentials" hidden></p></form>` : `<p>User management is available only while signed in to Main Branch.</p>`}</div>${isMainBranch ? `<div class="settings-card"><h3>Create Branch User</h3><form id="create-main-user-form"><div class="form-group"><label for="new-main-branch">Branch Name</label><input id="new-main-branch" name="branch" required maxlength="80" placeholder="e.g. Kolkata Branch"></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;align-items:end;margin-top:14px"><div class="form-group"><label for="new-main-username">Login ID</label><input id="new-main-username" name="username" autocomplete="username" required maxlength="80"></div><div class="form-group"><label for="new-main-password">Password</label><input id="new-main-password" name="password" type="password" autocomplete="new-password" required minlength="6" maxlength="128"></div></div><div class="form-actions"><button class="btn-primary" type="submit">Create User</button></div><p id="create-main-user-message" role="status" aria-live="polite"></p></form><h3 style="margin-top:24px">Branch Users</h3><div class="table-responsive"><table><thead><tr><th>Branch</th><th>Login ID</th><th>Password</th><th>Actions</th></tr></thead><tbody id="main-branch-users"><tr><td colspan="4">Loading...</td></tr></tbody></table></div></div>` : ``}</div></section>`;
    if (isMainBranch) {
      loadMainBranchUsers();
      loadMainBranchCredentials();
    }
    const credentialsForm = document.getElementById("main-credentials-form");
    credentialsForm?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = credentialsForm.querySelector('button[type="submit"]');
      const message = document.getElementById("main-credentials-message");
      button.disabled = true;
      message.textContent = "Saving…";
      try {
        const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"update_main_branch_credentials", username:document.getElementById("main-login-username").value.trim(), password:document.getElementById("main-login-password").value})});
        const result = await response.json();
        if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not update Main Branch login.");
        const usernameInput = document.getElementById("main-login-username");
        usernameInput.dataset.savedUsername = usernameInput.value.trim();
        usernameInput.dataset.savedPassword = document.getElementById("main-login-password").value;
        document.getElementById("main-login-password").value = "";
        message.textContent = "Main Branch login updated. Use the new credentials next time you sign in.";
      } catch (error) {
        message.textContent = error.message || "Could not connect to the server.";
      } finally {
        button.disabled = false;
      }
    });
    document.getElementById("show-main-credentials")?.addEventListener("click", () => {
      const usernameInput = document.getElementById("main-login-username");
      const saved = document.getElementById("saved-main-credentials");
      const button = document.getElementById("show-main-credentials");
      if (saved.hidden) {
        saved.textContent = `Saved Login ID: ${usernameInput.dataset.savedUsername || usernameInput.value} | Password: ${usernameInput.dataset.savedPassword || "Unavailable"}`;
        saved.hidden = false;
        button.textContent = "Hide saved credentials";
      } else {
        saved.hidden = true;
        button.textContent = "Show saved Login ID and Password";
      }
    });
    const form = document.getElementById("create-main-user-form");
    form?.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const message = document.getElementById("create-main-user-message");
      const branch = document.getElementById("new-main-branch").value.trim();
      const username = document.getElementById("new-main-username").value.trim();
      const password = document.getElementById("new-main-password").value;
      button.disabled = true;
      message.textContent = "Creating user…";
      try {
        const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"create_main_branch_user", targetBranch:branch, username, password})});
        const result = await response.json();
        if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not create user.");
        form.reset();
        loadMainBranchUsers();
        message.textContent = `User “${username}” created for ${branch}.`;
      } catch (error) {
        message.textContent = error.message || "Could not connect to the server.";
      } finally {
        button.disabled = false;
      }
    });
  });
};

window.loadMainBranchCredentials = async function() {
  const usernameInput = document.getElementById("main-login-username");
  if (!usernameInput) return;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"get_main_branch_credentials"})});
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Could not load Main Branch login.");
    usernameInput.value = result.username || "";
    usernameInput.dataset.savedUsername = result.username || "";
    usernameInput.dataset.savedPassword = result.password || "";
  } catch (error) {
    const message = document.getElementById("main-credentials-message");
    if (message) message.textContent = error.message || "Could not connect to the server.";
  }
};

window.loadMainBranchUsers = async function() {
  const tbody = document.getElementById("main-branch-users");
  if (!tbody) return;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"list_main_branch_users"})});
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Could not load users.");
    tbody.innerHTML = result.users.length ? result.users.map(user => `<tr><td>${escapeHtml(user.branch)}</td><td>${escapeHtml(user.username)}</td><td>${escapeHtml(user.password)}</td><td><button class="btn-edit" data-user-edit="${user.row}">Edit</button> <button class="btn-delete" data-user-delete="${user.row}">Delete</button></td></tr>`).join("") : `<tr><td colspan="4">No branch users found.</td></tr>`;
    result.users.forEach(user => {
      tbody.querySelector(`[data-user-edit="${user.row}"]`)?.addEventListener("click", () => editMainBranchUser(user.row, user.username));
      tbody.querySelector(`[data-user-delete="${user.row}"]`)?.addEventListener("click", () => deleteMainBranchUser(user.row, user.branch));
    });
  } catch (error) { tbody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`; }
};

window.editMainBranchUser = async function(row, username) {
  const newUsername = prompt("Login ID:", username);
  if (newUsername === null) return;
  const newPassword = prompt("New password (minimum 6 characters):");
  if (newPassword === null) return;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"update_main_branch_user", row, username:newUsername.trim(), password:newPassword})});
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Could not update user.");
    await loadMainBranchUsers();
  } catch (error) { alert(error.message); }
};

window.deleteMainBranchUser = async function(row, branch) {
  if (!confirm(`Delete login for ${branch}?`)) return;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"delete_main_branch_user", row})});
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Could not delete user.");
    await loadMainBranchUsers();
  } catch (error) { alert(error.message); }
};

document.addEventListener("DOMContentLoaded", function () {

  if (window.__daduMenuInitialized) return;
  window.__daduMenuInitialized = true;

  // ✅ sidebar-এর সব href="#" লিংকের ডিফল্ট hash-reset আচরণ বন্ধ করা
  document.querySelectorAll('.sidebar a[href="#"]').forEach(link => {
    link.addEventListener("click", function(e) {
      e.preventDefault();
    });
  });

  // সাবমেনু টগল করার আপডেট কোড (Accordion Logic)
  const submenuToggles = document.querySelectorAll(".submenu-toggle");
  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();

      const parentLi = this.parentElement;
      const isOpen = parentLi.classList.contains("open");

      // প্রথমে সব মেনু বন্ধ করে দেবে
      document.querySelectorAll(".has-submenu").forEach(item => {
        item.classList.remove("open");
      });

      // যেটাতে ক্লিক করেছেন, সেটা যদি আগে থেকে বন্ধ থাকে তবেই খুলবে
      if (!isOpen) {
        parentLi.classList.add("open");
      }
    });
  });

  handleRouteFromHash();
});

// ✅ URL hash পড়ে সঠিক পেজ লোড করা (Ekমাত্র routing entry point — apps-er sob navigation ekhan diyeই jabe)
function handleRouteFromHash() {
  const hash = location.hash.replace("#", "");

  // ---- Spare Parts (in-place render, no fetch needed) ----
  if (hash === "spareParts-purchase") {
    renderWhenDataReady(hash, () => { if (typeof renderPartsSection === "function") renderPartsSection("purchase"); });
    setActiveNav(hash);
    return;
  }
  if (hash === "spareParts-sale") {
    renderWhenDataReady(hash, () => { if (typeof renderPartsSection === "function") renderPartsSection("sale"); });
    setActiveNav(hash);
    return;
  }
  if (hash === "spareParts-balance") {
    renderWhenDataReady(hash, () => { if (typeof renderPartsBalanceReport === "function") renderPartsBalanceReport(); });
    setActiveNav(hash);
    return;
  }
  if (hash === "stock-report") {
    setActiveNav(hash);
    renderWhenDataReady(hash, () => renderVehicleStockReport());
    return;
  }
  if (hash === "stock-management") {
    const loaderRequestId = showPageLoader();
    (mainDataLoaded ? Promise.resolve() : loadVehicleStockData()).then(() => {
      if (location.hash.replace("#", "") === "stock-management" && typeof renderVehicleStock === "function") renderVehicleStock();
    }).catch(error => { if (location.hash.replace("#", "") === "stock-management") document.getElementById("app-content").innerHTML = `<section class="content-section"><h1>Stock Management</h1><p>${escapeHtml(error.message || "Could not load stock.")}</p></section>`; }).finally(() => hidePageLoader(loaderRequestId));
    setActiveNav(hash);
    return;
  }

  // ---- Empty hash → Dashboard ----
  if (!hash) {
    loadPage('Dashboard/dashboard.html', 'dashboard', 'all', false);
    setActiveNav("dashboard");
    return;
  }

  // ---- Normal routes (with optional /filter, e.g. customer-details/Scooty) ----
  const [routeKey, filterPart] = hash.split("/");
  const route = ROUTES[routeKey];
  if (route) {
    loadPage(route.url, route.context, filterPart || 'all', false);
    setActiveNav(hash);
  } else {
    loadPage('Dashboard/dashboard.html', 'dashboard', 'all', false);
    setActiveNav("dashboard");
  }
}

function renderWhenDataReady(expectedHash, renderPage) {
  if (mainDataLoaded) {
    renderPageWithLoader(renderPage);
    return;
  }
  const loaderRequestId = showPageLoader();
  loadCustomers().then(() => {
    if (location.hash.replace("#", "") === expectedHash) renderPage();
  }).catch(error => {
    if (location.hash.replace("#", "") === expectedHash) document.getElementById("app-content").innerHTML = `<section class="content-section"><p>${escapeHtml(error.message || "Could not load data.")}</p></section>`;
  }).finally(() => hidePageLoader(loaderRequestId));
}

// ✅ Active nav-link highlight + matching submenu open/close (class-based, single source of truth)
function setActiveNav(hash) {
  document.querySelectorAll('.nav-link, .submenu a').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.has-submenu').forEach(item => item.classList.remove('open'));

  const activeLink = document.querySelector(`a[href="#${hash}"]`);
  if (!activeLink) return;

  activeLink.classList.add('active');
  const parentSubmenu = activeLink.closest('.submenu');
  if (parentSubmenu) {
    const parentLi = parentSubmenu.closest('.has-submenu');
    if (parentLi) {
      parentLi.classList.add('open');
      const toggle = parentLi.querySelector('.nav-link');
    }
  }
}

// ✅ Ekমাত্র hashchange listener — sob click/URL-change ekhan diye handle hobe
window.addEventListener("hashchange", handleRouteFromHash);

// ✅ Back/Forward বাটন চাপলে সঠিক পেজ লোড করা
window.addEventListener("popstate", handleRouteFromHash);

window.showSection = function(sectionId) {
  document.querySelectorAll(".content-section").forEach(section => section.classList.add("hidden"));
  const section = document.getElementById(sectionId);
  if (section) section.classList.remove("hidden");
};

// Dynamic Page Loader (with duplicate-call guard)
const pageTemplateCache = new Map();
let pageLoadRequestId = 0;
let pageLoaderRequestId = 0;
let pageLoaderStartedAt = 0;
let pageLoaderTimer = null;
const minimumPageLoaderDuration = 160;

function showPageLoader() {
  const loader = document.getElementById("page-loader");
  const requestId = ++pageLoaderRequestId;
  clearTimeout(pageLoaderTimer);
  pageLoaderStartedAt = Date.now();
  if (loader) {
    loader.classList.remove("hidden");
    loader.setAttribute("aria-hidden", "false");
  }
  return requestId;
}

function hidePageLoader(requestId) {
  const loader = document.getElementById("page-loader");
  const delay = Math.max(0, minimumPageLoaderDuration - (Date.now() - pageLoaderStartedAt));
  clearTimeout(pageLoaderTimer);
  pageLoaderTimer = setTimeout(() => {
    if (requestId !== pageLoaderRequestId || !loader) return;
    loader.classList.add("hidden");
    loader.setAttribute("aria-hidden", "true");
  }, delay);
}

function renderPageWithLoader(renderPage) {
  const requestId = showPageLoader();
  try {
    renderPage();
  } finally {
    hidePageLoader(requestId);
  }
}

window.loadPage = async function(pageUrl, context, filterValue = 'all', updateHash = true) {
  const requestId = ++pageLoadRequestId;
  const loaderRequestId = showPageLoader();
  try {
    let html = pageTemplateCache.get(pageUrl);
    const templatePromise = html ? Promise.resolve(html) : (async () => {
      const cacheUrl = context === "dashboard" ? `${pageUrl}?v=3` : pageUrl;
      const response = await fetch(cacheUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Page request failed: ${response.status}`);
      const template = await response.text();
      pageTemplateCache.set(pageUrl, template);
      return template;
    })();
    const [loadedHtml] = await Promise.all([templatePromise, mainDataLoaded ? Promise.resolve() : loadCustomers()]);
    html = loadedHtml;
    if (requestId !== pageLoadRequestId) return;
    document.getElementById("app-content").innerHTML = html;
    currentFilter = filterValue;

    if (context === 'dashboard') updateDashboardCounts();
    if (context === 'customerEntry') initCustomerEntryForm();
    if (context === 'customerDetails') filterCustomerView();
    if (context === 'billGenerate') {
      renderBillCustomerTable(getBillCustomerRows([...customerDataList]).reverse());
      if (window.initBillCatalogs) initBillCatalogs();
      if (window.refreshDropdownOptions) refreshDropdownOptions();
    }
    if (context === 'report') initReportPage();
    if (context === 'dropdown' && window.refreshDropdownOptions) refreshDropdownOptions();

    // ✅ Address bar-এ hash আপডেট করা (শুধু ইউজার ক্লিক করলে, hashchange event থেকে না)
    if (updateHash) {
      const routeKey = Object.keys(ROUTES).find(key => ROUTES[key].context === context);
      if (routeKey) {
        const hashValue = filterValue && filterValue !== 'all' ? `${routeKey}/${filterValue}` : routeKey;
        history.pushState(null, "", "#" + hashValue);
      }
    }
  } catch (error) {
    console.error("Failed to load page:", error);
  } finally {
    hidePageLoader(loaderRequestId);
  }
};

// Data Fetching
window.loadVehicleStockData = async function() {
  const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"get_vehicle_stock"})});
  const result = await response.json();
  if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not load vehicle stock.");
  vehicleStockList = result.vehicleStock || [];
};

window.loadCustomers = function(forceReload = false) {
  if (mainDataLoaded && !forceReload) return Promise.resolve();
  if (mainDataPromise) return mainDataPromise;
  mainDataPromise = (async () => {
    try {
      const res = await apiFetch(APPS_SCRIPT_URL);
      const data = await res.json();
      if (data.status === "error") {
        if (/session expired/i.test(data.message || "")) logout();
        throw new Error(data.message || "Could not load data.");
      }
      currentBranch = data.branch || currentBranch;
      availableBranches = data.branches || ["Main Branch"];
      const branchLabel = document.getElementById("current-branch-label");
      if (branchLabel) branchLabel.textContent = currentBranch;
      customerDataList = data.customers || [];
      billDataList = data.bills || [];
      partsPurchaseList = data.purchases || [];
      partsSaleList = data.sales || [];
      vehicleStockList = data.vehicleStock || [];
      mainDataLoaded = true;
      window.dropdownDataList = data.dropdowns || [];
      if (window.refreshDropdownOptions) window.refreshDropdownOptions();
      if (document.getElementById("dashboard-section")) updateDashboardCounts();
      if (document.getElementById("bill-generate-section")) renderBillCustomerTable(getBillCustomerRows([...customerDataList]).reverse());
      if (document.getElementById("report-section")) generateReport();
    } catch (error) {
      console.error("Failed to load data:", error);
      throw error;
    } finally {
      mainDataPromise = null;
    }
  })();
  return mainDataPromise;
};

window.escapeHtml = function(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
};

window.getAvailableVehicleStockList = function() {
  const soldIndexes = new Set();
  (billDataList || []).forEach(bill => {
    if (!String(bill.Item || "").trim().toLowerCase().includes("scooty")) return;
    const chassis = String(bill["Chassis No"] || "").trim().toLowerCase();
    const company = String(bill["Vehicle Company"] || "").trim().toLowerCase();
    const model = String(bill["Vehicle Model"] || "").trim().toLowerCase();
    const colour = String(bill["Vehicle Colour"] || "").trim().toLowerCase();
    let index = vehicleStockList.findIndex((stock, i) => !soldIndexes.has(i) && chassis && String(stock["Chassis No"] || "").trim().toLowerCase() === chassis);
    if (index < 0 && !chassis && company && model) index = vehicleStockList.findIndex((stock, i) => !soldIndexes.has(i) && String(stock["Vehicle Company"] || "").trim().toLowerCase() === company && String(stock["Vehicle Model"] || "").trim().toLowerCase() === model && (!colour || String(stock["Vehicle Colour"] || "").trim().toLowerCase() === colour));
    if (index >= 0) soldIndexes.add(index);
  });
  return (vehicleStockList || []).filter((stock, index) => !soldIndexes.has(index));
};

// Shared Helper Functions
window.parseCustomDate = function(dateStr) {
  if (!dateStr) return null;
  dateStr = String(dateStr).trim();
  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  let parts = dateStr.split(/[-/]/);
  if (parts.length >= 3) {
    let p1 = parseInt(parts[0], 10), p2 = parseInt(parts[1], 10), p3 = parseInt(parts[2], 10);
    if (p3 < 100) p3 += 2000;
    if (p1 > 12) return new Date(p3, p2 - 1, p1);
    return new Date(p3, p2 - 1, p1);
  }
  const nativeDate = new Date(dateStr);
  return isNaN(nativeDate.getTime()) ? null : nativeDate;
};

window.parseAmount = function(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/[^0-9,.-]/g, '');
  if (!text) return 0;
  const normalized = text.includes('.') ? text.replace(/,/g, '') : text.replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

window.showToast = function(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast-message " + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
};

window.getDirectDriveUrl = function(url) {
  if (!url) return "";
  if (url.includes("googleusercontent.com") || url.includes("thumbnail")) return url;
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w500";
  return url;
};
