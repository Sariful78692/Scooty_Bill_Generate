// Paste your NEW deployed Google Apps Script Web App URL here!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzLShoct_ttY2y-ee-ql4uHRrXs3Pfv9czBNH0F0YANxQQ1eAuA8tuhsisETWjf1Ili/exec";

// Global Variables
let customerDataList = [];
let billDataList = []; 
let partsPurchaseList = [];
let partsSaleList = [];
let currentBillCustomerObj = null;
let savedBankDetails = {};
let currentFilter = "all";

// Hash-based routing map
const ROUTES = {
  "dashboard": { url: "Dashboard/dashboard.html", context: "dashboard" },
  "customer-entry": { url: "Customer/customer-entry.html", context: "customerEntry" },
  "customer-details": { url: "Customer/customer-details.html", context: "customerDetails" },
  "bill-generate": { url: "bill/bill-generate.html", context: "billGenerate" },
  "report": { url: "report/report.html", context: "report" }
};

// Chart instances
let todaySalesChartInst = null;
let monthlySalesChartInst = null;

// ---------------- LOGIN / ACCOUNT ----------------
const AUTH_KEY = "daduAuth";

// লগইন করা না থাকলে সরাসরি login.html এ পাঠিয়ে দাও
if (localStorage.getItem("daduLoggedIn") !== "true") {
  location.replace("login.html");
}

function getAuth() {
  return JSON.parse(localStorage.getItem(AUTH_KEY) || JSON.stringify({ username: "admin", password: "admin123" }));
}

function logout() {
  localStorage.removeItem("daduLoggedIn");
  location.replace("login.html");
}

window.forgotUsername = function() { alert("Your username is: " + getAuth().username); };
window.forgotPassword = function() { const u = prompt("Enter your username:"); if (u === getAuth().username) alert("Your password is: " + getAuth().password); else alert("Username not found."); };

window.openSettings = function() {
  const app = document.getElementById("app-content");
  app.innerHTML = `<section class="content-section settings-page"><h1><i class="fa-solid fa-gear"></i> Settings</h1><div class="settings-card"><h3>User Account</h3><p>Change your login username and password</p><span class="settings-buttons"><button class="btn-primary" onclick="changeAccount()">Change Username / Password</button></span></div></section>`;
};

window.changeAccount = function() {
  const auth = getAuth();
  const old = prompt("Enter current password:");
  if (old !== auth.password) return alert("Current password is incorrect.");
  const username = prompt("New username:", auth.username);
  const password = prompt("New password:");
  if (username && password) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ username, password }));
    alert("Username and password changed successfully.");
  }
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

  loadCustomers();
  handleRouteFromHash();
});

// ✅ URL hash পড়ে সঠিক পেজ লোড করা (Ekমাত্র routing entry point — apps-er sob navigation ekhan diyeই jabe)
function handleRouteFromHash() {
  const hash = location.hash.replace("#", "");

  // ---- Spare Parts (in-place render, no fetch needed) ----
  if (hash === "spareParts-purchase") {
    if (typeof renderPartsSection === "function") renderPartsSection("purchase");
    setActiveNav(hash);
    return;
  }
  if (hash === "spareParts-sale") {
    if (typeof renderPartsSection === "function") renderPartsSection("sale");
    setActiveNav(hash);
    return;
  }
  if (hash === "spareParts-balance") {
    if (typeof renderPartsBalanceReport === "function") renderPartsBalanceReport();
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

window.loadPage = async function(pageUrl, context, filterValue = 'all', updateHash = true) {
  const requestId = ++pageLoadRequestId;
  try {
    let html = pageTemplateCache.get(pageUrl);
    if (!html) {
      const cacheUrl = context === "dashboard" ? `${pageUrl}?v=2` : pageUrl;
      const response = await fetch(cacheUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Page request failed: ${response.status}`);
      html = await response.text();
      pageTemplateCache.set(pageUrl, html);
    }
    if (requestId !== pageLoadRequestId) return;
    document.getElementById("app-content").innerHTML = html;
    currentFilter = filterValue;

    if (context === 'dashboard') updateDashboardCounts();
    if (context === 'customerEntry') initCustomerEntryForm();
    if (context === 'customerDetails') filterCustomerView();
    if (context === 'billGenerate') { renderBillCustomerTable([...customerDataList].reverse()); if (window.initBillCatalogs) initBillCatalogs(); }
    if (context === 'report') initReportPage();

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
  }
};

// Data Fetching
window.loadCustomers = async function(forceReload = false) {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    customerDataList = data.customers || [];
    billDataList = data.bills || []; 
    partsPurchaseList = data.purchases || [];
    partsSaleList = data.sales || [];

    if (document.getElementById("dashboard-section")) updateDashboardCounts();
    if (document.getElementById("bill-generate-section")) renderBillCustomerTable([...customerDataList].reverse());
    if (document.getElementById("report-section")) generateReport();
  } catch (err) { console.error("Failed to load data."); }
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

window.showToast = function(message) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
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
