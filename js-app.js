// Paste your NEW deployed Google Apps Script Web App URL here!

// ---------------- LOGIN / ACCOUNT ----------------
const AUTH_KEY = "daduAuth";
if (localStorage.getItem("daduLoggedIn") !== "true") location.replace("login.html");
function getAuth() { return JSON.parse(localStorage.getItem(AUTH_KEY) || JSON.stringify({ username: "admin", password: "admin123" })); }
function showApp() { const login = document.getElementById("login-page"); if (login) login.classList.add("hidden"); const app = document.querySelector(".app-container"); if (app) app.classList.remove("hidden"); }
function logout() { localStorage.removeItem("daduLoggedIn"); location.reload(); }
window.forgotUsername = function() { alert("Your username is: " + getAuth().username); };
window.forgotPassword = function() { const u = prompt("Enter your username:"); if (u === getAuth().username) alert("Your password is: " + getAuth().password); else alert("Username not found."); };
window.openSettings = function() {
  const app = document.getElementById("app-content");
  app.innerHTML = `<section class="content-section settings-page"><h1><i class="fa-solid fa-gear"></i> Settings</h1><div class="settings-card"><h3>User Account</h3><p>Change your login username and password</p><span class="settings-buttons"><button class="btn-primary" onclick="changeAccount()">Change Username / Password</button></span></div></section>`;
};

window.changeAccount = function() { const auth = getAuth(); const old = prompt("Enter current password:"); if (old !== auth.password) return alert("Current password is incorrect."); const username = prompt("New username:", auth.username); const password = prompt("New password:"); if (username && password) { localStorage.setItem(AUTH_KEY, JSON.stringify({ username, password })); alert("Username and password changed successfully."); } };
document.addEventListener("DOMContentLoaded", function() {
  const form = document.getElementById("login-form");
  if (localStorage.getItem("daduLoggedIn") === "true") showApp();
  if (form) form.addEventListener("submit", function(e) { e.preventDefault(); const auth = getAuth(); const u = document.getElementById("login-username").value.trim(); const p = document.getElementById("login-password").value; if (u === auth.username && p === auth.password) { localStorage.setItem("daduLoggedIn", "true"); showApp(); } else document.getElementById("login-message").innerText = "Invalid username or password"; });
});

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzLShoct_ttY2y-ee-ql4uHRrXs3Pfv9czBNH0F0YANxQQ1eAuA8tuhsisETWjf1Ili/exec";

let customerDataList = [];
let billDataList = []; 
let currentBillCustomerObj = null;
let savedBankDetails = {};
let currentFilter = "all";

let todaySalesChartInst = null;
let monthlySalesChartInst = null;

let partsPurchaseList = [];
let partsSaleList = [];

document.addEventListener("DOMContentLoaded", function () {
  const submenuToggles = document.querySelectorAll(".submenu-toggle");
  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentElement.classList.toggle("open");
    });
  });

  // Default load Dashboard
  loadPage('Dashboard/dashboard.html', 'dashboard');
  loadCustomers();
});

window.showSection = function(sectionId) {
  document.querySelectorAll(".content-section").forEach(section => section.classList.add("hidden"));
  const section = document.getElementById(sectionId);
  if (section) section.classList.remove("hidden");
};

// Dynamic Page Loader
async function loadPage(pageUrl, context, filterValue = 'all') {
  try {
    const response = await fetch(pageUrl);
    const html = await response.text();
    document.getElementById("app-content").innerHTML = html;
    
    currentFilter = filterValue;

    if (context === 'dashboard') updateDashboardCounts();
    if (context === 'customerEntry') initCustomerEntryForm();
    if (context === 'customerDetails') filterCustomerView();
    if (context === 'billGenerate') renderBillCustomerTable(customerDataList);
    if (context === 'report') initReportPage();
    
  } catch (error) {
    console.error("Failed to load page:", error);
  }
}

// Data Fetching
async function loadCustomers() {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    customerDataList = data.customers || [];
    billDataList = data.bills || []; 
    partsPurchaseList = data.purchases || [];
    partsSaleList = data.sales || [];

    if (document.getElementById("dashboard-section")) updateDashboardCounts();
    if (document.getElementById("bill-generate-section")) renderBillCustomerTable(customerDataList);
    if (document.getElementById("report-section")) generateReport();
  } catch (err) { console.error("Failed to load data."); }
}

// ---------------- DASHBOARD CALCULATIONS (ULTRA STRICT) ----------------
function parseCustomDate(dateStr) {
  if (!dateStr) return null;
  dateStr = String(dateStr).trim();

  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
  

  
  // Manual parsing for DD-MM-YYYY or DD/MM/YYYY
  let parts = dateStr.split(/[-/]/);
  if (parts.length >= 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);
    
    if (p3 < 100) p3 += 2000; // Handle 2-digit years
    
    // Assume DD-MM-YYYY if first part > 12
    if (p1 > 12) return new Date(p3, p2 - 1, p1);
    
    // Fallback: Default to Indian standard DD-MM-YYYY
    return new Date(p3, p2 - 1, p1);
  }
  const nativeDate = new Date(dateStr);
  return isNaN(nativeDate.getTime()) ? null : nativeDate;
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/[^0-9,.-]/g, '');
  if (!text) return 0;
  const normalized = text.includes('.') ? text.replace(/,/g, '') : text.replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function updateDashboardCounts() {
  let scooty = 0, bike = 0, cycle = 0;
  customerDataList.forEach(c => {
    let v = String(c["Vehicle"] || "").trim().toLowerCase();
    if (v === "scooty") scooty++; 
    else if (v === "bike") bike++; 
    else if (v === "cycle") cycle++;
  });
  
  if (document.getElementById("count-total")) document.getElementById("count-total").innerText = customerDataList.length;
  if (document.getElementById("count-scooty")) document.getElementById("count-scooty").innerText = scooty;
  if (document.getElementById("count-bike")) document.getElementById("count-bike").innerText = bike;
  if (document.getElementById("count-cycle")) document.getElementById("count-cycle").innerText = cycle;

  let todaySales = 0;
  let monthSales = 0;
  
  const d = new Date();
  const tY = d.getFullYear();
  const tM = d.getMonth();
  const tD = d.getDate();

  // String matching fallbacks
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const tDayStr1 = `${String(tD).padStart(2,'0')}-${String(tM+1).padStart(2,'0')}-${tY}`;
  const tDayStr2 = `${String(tD).padStart(2,'0')} ${monthNames[tM]} ${tY}`;
  const tMonStr1 = `-${String(tM+1).padStart(2,'0')}-${tY}`;
  const tMonStr2 = `${monthNames[tM]} ${tY}`;

  billDataList.forEach(b => {
    // Clean amount (remove ₹, commas, text)
    const amt = parseAmount(b["Total Amount"]);
    
    let rawDate = String(b["Date"] || "").trim();
    let isToday = false;
    let isMonth = false;

    // 1. Check strict string match
    if (rawDate === tDayStr1 || rawDate === tDayStr2) isToday = true;
    if (rawDate.includes(tMonStr1) || rawDate.includes(tMonStr2)) isMonth = true;

    // 2. Check via Date Object
    if (!isToday || !isMonth) {
      const parsedDate = parseCustomDate(rawDate);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        if (parsedDate.getFullYear() === tY && parsedDate.getMonth() === tM && parsedDate.getDate() === tD) isToday = true;
        if (parsedDate.getFullYear() === tY && parsedDate.getMonth() === tM) isMonth = true;
      }
    }

    if (isToday) todaySales += amt;
    if (isMonth) monthSales += amt;
  });

  if(document.getElementById("sales-today")) document.getElementById("sales-today").innerText = todaySales.toFixed(2);
  if(document.getElementById("sales-month")) document.getElementById("sales-month").innerText = monthSales.toFixed(2);

  renderDashboardCharts(scooty, bike, cycle, monthSales);
}

function renderDashboardCharts(scooty, bike, cycle, monthSales) {
  const ctxToday = document.getElementById('todaySalesChart');
  if (ctxToday) {
    if (todaySalesChartInst) todaySalesChartInst.destroy();
    todaySalesChartInst = new Chart(ctxToday.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Scooty', 'Bike', 'Cycle'],
        datasets: [{ data: [scooty, bike, cycle], backgroundColor: ['#eab308', '#10b981', '#ef4444'], borderWidth: 1 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  const ctxMonthly = document.getElementById('monthlySalesChart');
  if (ctxMonthly) {
    if (monthlySalesChartInst) monthlySalesChartInst.destroy();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthName = monthNames[new Date().getMonth()];

    monthlySalesChartInst = new Chart(ctxMonthly.getContext('2d'), {
      type: 'bar',
      data: {
        labels: [currentMonthName],
        datasets: [{ label: 'Current Month Sales (₹)', data: [monthSales], backgroundColor: '#8b5cf6', borderRadius: 6, barThickness: 50 }]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: function(val) { return '₹' + val; } } } } }
    });
  }
}

// ---------------- REPORT MODULE LOGIC ----------------
window.initReportPage = function() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  document.getElementById("reportFromDate").value = `${yyyy}-${mm}-${dd}`;
  document.getElementById("reportToDate").value = `${yyyy}-${mm}-${dd}`;
  generateReport();
  document.getElementById("reportSearchButton").addEventListener("click", window.searchReport);
};

function safeDisplay(value) { return String(value ?? '').replace(/safina/gi, '').replace(/\\s{2,}/g, ' ').trim(); }
function formatDateForStorage(date = new Date()) { return String(date.getDate()).padStart(2, '0') + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + date.getFullYear(); }

window.searchReport = function() { generateReport(); return false; };

window.generateReport = function() {
  const fromInput = document.getElementById("reportFromDate");
  const toInput = document.getElementById("reportToDate");
  const from = fromInput?.value; const to = toInput?.value || from;
  if (!from) return;
  const startDate = new Date(from + "T00:00:00");
  const endDate = new Date(to + "T23:59:59");
  if (startDate > endDate) { alert("From date cannot be after To date."); return; }
  const filteredAll = billDataList.filter(b => {
    const d = parseCustomDate(String(b["Date"] || ""));
    return d && !isNaN(d) && d >= startDate && d <= endDate;
  });
  const total = filteredAll.reduce((sum, bill) => sum + parseAmount(bill["Total Amount"]), 0);
  document.getElementById("reportTotalSales").innerText = total.toFixed(2);
  const limit = document.getElementById("reportPageSize")?.value || "all";
  const filteredBills = limit === "all" ? filteredAll : filteredAll.slice(0, Number(limit));
  const tbody = document.getElementById("report-table-body"); if (!tbody) return; tbody.innerHTML = "";
  if (!filteredBills.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center">No sales found for this date range.</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; return; }
  filteredBills.forEach(bill => {
    const tr = document.createElement("tr"); const amt = parseAmount(bill["Total Amount"]);
    tr.innerHTML = `<td><strong>${bill["Bill ID"]}</strong></td><td>${safeDisplay(bill["Customer Name"])}</td><td><span class="badge">${safeDisplay(bill["Item"])}</span><br><small>${safeDisplay(bill["Vehicle Company"])}</small></td><td>${safeDisplay(bill["Vehicle Model"])}</td><td>₹${amt.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
};

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ---------------- CUSTOMER ENTRY / DETAILS ----------------
function initCustomerEntryForm() {
  const form = document.getElementById("customer-form");
  if(form) form.addEventListener("submit", handleCustomerFormSubmit);
  const photoInput = document.getElementById("photoInput");
  if (photoInput) photoInput.addEventListener("change", function () {
    if (this.files[0] && this.files[0].size > 1024 * 1024) {
      showToast("Please upload below 1 MB");
      this.value = "";
    }
  });
}

function getDirectDriveUrl(url) {
  if (!url) return "";
  if (url.includes("googleusercontent.com") || url.includes("thumbnail")) return url;
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return "https://drive.google.com/thumbnail?id=" + match[1] + "&sz=w500";
  return url;
}

function filterCustomerView() {
  const title = document.getElementById("details-view-title");
  if(!title) return;
  let filtered = currentFilter !== "all" ? customerDataList.filter(c => (c["Vehicle"] || "").trim() === currentFilter) : customerDataList;
  title.innerText = currentFilter !== "all" ? `Customer Details - ${currentFilter}` : "Customer Details (All)";
  renderCustomerTable(filtered);
}

function renderCustomerTable(list) {
  const thead = document.getElementById("customer-table-head");
  const tbody = document.getElementById("customer-table-body");
  if (!tbody || !thead) return;
  
  thead.innerHTML = `<tr><th>Photo</th><th>Name</th><th>Mobile</th><th>Vehicle</th><th>Company</th><th>Model</th><th>Actions</th></tr>`;
  tbody.innerHTML = "";
  if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-center">No customers found.</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; return; }
  
  list.forEach(cust => {
    const tr = document.createElement("tr");
    const directPhotoUrl = getDirectDriveUrl(cust["Photo URL"]);
    const photoHtml = directPhotoUrl
      ? `<a href="${directPhotoUrl}" target="_blank"><img src="${directPhotoUrl}" class="cust-photo-img" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;"></a>`
      : `<i class="fa-solid fa-user-circle fa-2x" style="color: #cbd5e1;"></i>`;

    tr.innerHTML = `
      <td>${photoHtml}</td>
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td>${cust["Vehicle Company"] || "-"}</td>
      <td>${cust["Vehicle Model"] || "-"}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editCustomer('${cust["ID"]}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-delete" onclick="deleteCustomer('${cust["ID"]}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function resetForm() {
  const form = document.getElementById("customer-form");
  if(form) form.reset();
  document.getElementById("edit-customer-id").value = "";
  document.getElementById("existing-photo-url").value = "";
  document.getElementById("form-title").innerText = "Customer Entry Form";
  const submitBtn = document.getElementById("submit-btn");
  if(submitBtn){ submitBtn.innerText = "Save Customer"; submitBtn.style.backgroundColor = ""; submitBtn.style.color = ""; }
  const cBtn = document.getElementById("cancel-btn");
  if(cBtn) cBtn.classList.add("hidden");
  const pp = document.getElementById("photoPreview");
  if(pp) { pp.classList.add("hidden-preview"); pp.src = ""; }
}

window.cancelEdit = function() {
  resetForm(); loadPage('Customer/customer-details.html', 'customerDetails', 'all');
}

window.promptAddNewOccupation = function() {
  const newOcc = prompt("Enter new Occupation:");
  if (newOcc && newOcc.trim() !== "") {
    const cleanOcc = newOcc.trim();
    const select = document.getElementById("occupationSelect");
    if(select && !Array.from(select.options).some(o => o.value === cleanOcc)) {
      select.add(new Option(cleanOcc, cleanOcc));
      select.value = cleanOcc;
    }
  }
}

window.editCustomer = function(id) {
  const cust = customerDataList.find(c => c["ID"] == id);
  if (!cust) return;
  
  loadPage('Customer/customer-entry.html', 'customerEntry').then(() => {
    document.getElementById("edit-customer-id").value = cust["ID"];
    document.getElementById("existing-photo-url").value = cust["Photo URL"] || "";
    document.getElementById("customerName").value = cust["Customer Name"] || "";
    document.getElementById("guardianName").value = cust["Guardian Name"] || "";
    document.getElementById("gender").value = cust["Gender"] || "";
    document.getElementById("dob").value = cust["DOB"] ? String(cust["DOB"]).substring(0, 10) : "";
    document.getElementById("religion").value = cust["Religion"] || "";
    document.getElementById("aadhaarNo").value = cust["Aadhaar No"] || "";
    document.getElementById("mobileNo").value = cust["Mobile No"] || "";
    document.getElementById("address").value = cust["Address"] || "";
    document.getElementById("vehicleSelect").value = cust["Vehicle"] || "";
    document.getElementById("vehicleCompany").value = cust["Vehicle Company"] || "";
    document.getElementById("vehicleModel").value = cust["Vehicle Model"] || "";
    document.getElementById("chassisNo").value = cust["Chassis Number"] || "";
    document.getElementById("engineNo").value = cust["Engine Number"] || "";
    
    const occSelect = document.getElementById("occupationSelect");
    const occVal = cust["Occupation"] || "";
    if(occVal && !Array.from(occSelect.options).some(o => o.value === occVal)) occSelect.add(new Option(occVal, occVal));
    occSelect.value = occVal;

    const photoPreview = document.getElementById("photoPreview");
    const directPhotoUrl = getDirectDriveUrl(cust["Photo URL"]);
    if (directPhotoUrl && photoPreview) {
      photoPreview.src = directPhotoUrl; photoPreview.classList.remove("hidden-preview");
    } else if(photoPreview) {
      photoPreview.classList.add("hidden-preview"); photoPreview.src = "";
    }

    document.getElementById("form-title").innerText = "Edit Customer Details";
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.innerText = "Update Customer";
    submitBtn.style.backgroundColor = "#eab308";
    submitBtn.style.color = "#000";
    document.getElementById("cancel-btn").classList.remove("hidden");
  });
}

window.deleteCustomer = async function(id) {
  if (!confirm("Are you sure you want to delete this customer?")) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "delete",
        id: id
      })
    });

    const result = await res.json();

    if (result.status === "success") {
      alert("Customer deleted successfully!");

      // নতুন data load হবে
      await loadCustomers(true);

      // Customer Details page automatically refresh হবে
      await loadPage(
        "Customer/customer-details.html",
        "customerDetails",
        currentFilter || "all"
      );
    } else {
      alert("Failed to delete customer.");
    }

  } catch (err) {
    console.error("Delete error:", err);
    alert("Delete failed: " + err.message);
  }
};

async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.size < 100000) return file;
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1200 / image.width); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.75));
}

// --- DUPLICATE CUSTOMER VALIDATION & SAVE LOGIC ---
async function handleCustomerFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submit-btn");
  const editId = document.getElementById("edit-customer-id").value;

  // Gather form values for validation
  const nameVal = document.getElementById("customerName")?.value.trim() || "";
  const mobileVal = document.getElementById("mobileNo")?.value.trim() || "";
  const aadhaarVal = document.getElementById("aadhaarNo")?.value.trim() || "";
  const vehicleVal = document.getElementById("vehicleSelect")?.value || "";
  const companyVal = document.getElementById("vehicleCompany")?.value.trim() || "";
  const modelVal = document.getElementById("vehicleModel")?.value.trim() || "";
  const chassisVal = document.getElementById("chassisNo")?.value.trim() || "";
  const engineVal = document.getElementById("engineNo")?.value.trim() || "";

  // Check for duplicate customer if we are creating a new entry
  if (!editId) {
    const isDuplicate = customerDataList.find(c => 
      String(c["Customer Name"] || "").trim().toLowerCase() === nameVal.toLowerCase() &&
      String(c["Mobile No"] || "").trim() === mobileVal &&
      String(c["Aadhaar No"] || "").trim() === aadhaarVal &&
      String(c["Vehicle"] || "").trim().toLowerCase() === vehicleVal.toLowerCase() &&
      String(c["Vehicle Company"] || "").trim().toLowerCase() === companyVal.toLowerCase() &&
      String(c["Vehicle Model"] || "").trim().toLowerCase() === modelVal.toLowerCase() &&
      String(c["Chassis Number"] || "").trim().toLowerCase() === chassisVal.toLowerCase() &&
      String(c["Engine Number"] || "").trim().toLowerCase() === engineVal.toLowerCase()
    );

    if (isDuplicate) {
      alert("This customer is already saved! All details match an existing record.");
      return;
    }
  }

  submitBtn.disabled = true;
  submitBtn.innerText = "Saving...";

  let uiRecoveryTimer;

  try {
    let photoBase64 = "";
    let photoName = "";
    let photoMimeType = "";

    const photoInput = document.getElementById("photoInput");

    if (photoInput && photoInput.files[0]) {
      const originalFile = photoInput.files[0];
      const file = await compressImage(originalFile);

      photoName = file.name || originalFile.name || "customer-photo.jpg";
      photoMimeType = file.type || originalFile.type || "image/jpeg";

      photoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(reader.result);
          resolve(result.split(",")[1] || "");
        };

        reader.onerror = () => {
          reject(new Error("Photo could not be read"));
        };

        reader.readAsDataURL(file);
      });
    }

    const payload = {
      action: editId ? "update" : "create", 
      id: editId || null,
      customerName: nameVal,
      guardianName: document.getElementById("guardianName")?.value.trim() || "",
      gender: document.getElementById("gender")?.value || "",
      dob: document.getElementById("dob")?.value || "",
      religion: document.getElementById("religion")?.value.trim() || "",
      aadhaarNo: aadhaarVal,
      mobileNo: mobileVal,
      address: document.getElementById("address")?.value.trim() || "",
      vehicle: vehicleVal,
      vehicleCompany: companyVal,
      vehicleModel: modelVal,
      chassisNo: chassisVal,
      engineNo: engineVal,
      occupation: document.getElementById("occupationSelect")?.value || "",
      existingPhotoUrl: document.getElementById("existing-photo-url")?.value || "",
      photoBase64, photoName, photoMimeType
    };

    uiRecoveryTimer = setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.innerText = "Retry Save";
    }, 12000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }

    const result = await response.json();

    if (result.status === "success") {
      alert(editId
        ? "Customer updated successfully!"
        : "Customer saved successfully!"
      );

      resetForm();

      await loadCustomers(true);

      loadPage(
        "Customer/customer-details.html",
        "customerDetails",
        "all"
      );
    } else {
      throw new Error(result.message || "Save failed");
    }

  } catch (err) {
    console.error("Customer save error:", err);

    if (err.name === "AbortError") {
      alert("Save timed out. Please check your internet connection.");
    } else {
      alert("Submission failed: " + err.message);
    }

  } finally {
    clearTimeout(uiRecoveryTimer);

    submitBtn.disabled = false;
    submitBtn.innerText = editId
      ? "Update Customer"
      : "Save Customer";
  }
}

// ---------------- BILL GENERATION & BANK MANAGEMENT ----------------
window.toggleBillViews = function(view) {
  if (view === 'search') {
    document.getElementById("bill-create-page").classList.add("hidden"); 
    document.getElementById("bill-generate-section").classList.remove("hidden"); 
  } else {
    document.getElementById("bill-generate-section").classList.add("hidden"); 
    document.getElementById("bill-create-page").classList.remove("hidden"); 
  }
}

function renderBillCustomerTable(list) {
  const tbody = document.getElementById("bill-customer-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="text-center">No customers.</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>`; return; }
  
  list.forEach(cust => {
    const tr = document.createElement("tr");
    const custBills = billDataList.filter(b => String(b["Customer ID"]).trim() === String(cust["ID"]).trim());
    
    let actionBtns = `<button class="btn-primary" onclick="openBillCreatePage('${cust["ID"]}')">Bill Generate</button>`;
    
    if (custBills.length > 0) {
      const latestBill = custBills[custBills.length - 1]; 
      actionBtns += ` <button class="btn-print" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Print Bill" onclick="printExistingBill('${latestBill["Bill ID"]}')"><i class="fa-solid fa-print"></i></button>`;
      actionBtns += ` <button class="btn-edit" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Edit Bill" onclick="editGeneratedBill('${latestBill["Bill ID"]}')"><i class="fa-solid fa-pen"></i></button>`;
      actionBtns += ` <button class="btn-delete" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Delete Bill" onclick="deleteGeneratedBill('${latestBill["Bill ID"]}')"><i class="fa-solid fa-trash"></i></button>`;
    }

    tr.innerHTML = `
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td style="display:flex; gap:5px;">${actionBtns}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.filterBillCustomers = function() {
  const query = document.getElementById("billSearchInput").value.toLowerCase();
  const filtered = customerDataList.filter(c => 
    (c["Customer Name"] || "").toLowerCase().includes(query) || (c["Mobile No"] || "").toLowerCase().includes(query)
  );
  renderBillCustomerTable(filtered);
};

window.openBillCreatePage = function(custId) {
  const cust = customerDataList.find(c => String(c["ID"]) === String(custId));
  if (!cust) return;
  currentBillCustomerObj = cust;

  document.getElementById("activeBillCustId").value = cust["ID"];
  document.getElementById("activeBillId").value = ""; 
  document.getElementById("billCustomerNameTitle").innerText = "Create Bill for: " + cust["Customer Name"] + " (" + (cust["Vehicle"] || "") + ")";
  
  document.getElementById("billItem").value = cust["Vehicle"] || "";
  document.getElementById("billCompany").value = cust["Vehicle Company"] || "";
  document.getElementById("billModel").value = cust["Vehicle Model"] || "";
  document.getElementById("billChassis").value = cust["Chassis Number"] || "";
  document.getElementById("billEngine").value = cust["Engine Number"] || "";
  
  ["billHsn","billRate","billAmount","billSgst","billCgst","billIgst","billTotal","billBattery","billBatterySerial","billCharger","billChargerSerial","billWarranty","billBankSelect"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("billQnty").value = 1;
  document.getElementById("print-bill-btn").classList.add("hidden");
  
  const saveBtn = document.getElementById("save-bill-btn");
  saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Bill`;
  
  toggleBillViews('create');
};

// --- BANK EDIT / DELETE METHODS ---
window.promptAddNewBank = function() {
  const bankName = prompt("Enter New Bank Name:");
  if (bankName && bankName.trim() !== "") {
    const sel = document.getElementById("billBankSelect");
    if(!Array.from(sel.options).some(o => o.value === bankName.trim())) sel.add(new Option(bankName.trim(), bankName.trim()));
    sel.value = bankName.trim(); handleBankSelection(sel);
  }
};

window.editSelectedBank = function() {
  const sel = document.getElementById("billBankSelect");
  const currentVal = sel.value;
  if(!currentVal) { alert("Please select a bank from the list first!"); return; }
  
  const newName = prompt("Edit Bank Name (Optional - You can keep the same name):", currentVal);
  if(newName && newName.trim() !== "") {
     const cleanName = newName.trim();
     const option = Array.from(sel.options).find(o => o.value === currentVal);
     if(option) { option.value = cleanName; option.text = cleanName; }
     
     if(savedBankDetails[currentVal]) {
        savedBankDetails[cleanName] = savedBankDetails[currentVal];
        if(cleanName !== currentVal) delete savedBankDetails[currentVal];
     } else {
        savedBankDetails[cleanName] = {ifsc:"", accName:"", accNo:"", branch:""};
     }
     sel.value = cleanName;

     document.getElementById("bankModalTitle").innerText = "Edit Bank Details (" + cleanName + ")";
     document.getElementById("bankIfsc").value = savedBankDetails[cleanName].ifsc || "";
     document.getElementById("bankAccName").value = savedBankDetails[cleanName].accName || "";
     document.getElementById("bankAccNo").value = savedBankDetails[cleanName].accNo || "";
     document.getElementById("bankBranch").value = savedBankDetails[cleanName].branch || "";
     document.getElementById("bank-modal").classList.remove("hidden");
  }
};

window.deleteSelectedBank = function() {
  const sel = document.getElementById("billBankSelect");
  const currentVal = sel.value;
  if(!currentVal) { alert("Please select a bank to delete!"); return; }
  
  if(confirm("Are you sure you want to remove '" + currentVal + "'?")) {
     const option = Array.from(sel.options).find(o => o.value === currentVal);
     if(option) sel.removeChild(option);
     if(savedBankDetails[currentVal]) delete savedBankDetails[currentVal];
     sel.value = "";
  }
};

window.handleBankSelection = function(sel) {
  if (sel.value) {
    document.getElementById("bankModalTitle").innerText = "Bank Details (" + sel.value + ")";
    const saved = savedBankDetails[sel.value] || {ifsc:"", accName:"", accNo:"", branch:""};
    document.getElementById("bankIfsc").value = saved.ifsc;
    document.getElementById("bankAccName").value = saved.accName;
    document.getElementById("bankAccNo").value = saved.accNo;
    document.getElementById("bankBranch").value = saved.branch;
    document.getElementById("bank-modal").classList.remove("hidden");
  }
};

window.closeBankModal = function() {
  const b = document.getElementById("billBankSelect").value;
  if (b) savedBankDetails[b] = { ifsc: document.getElementById("bankIfsc").value, accName: document.getElementById("bankAccName").value, accNo: document.getElementById("bankAccNo").value, branch: document.getElementById("bankBranch").value };
  document.getElementById("bank-modal").classList.add("hidden");
};

window.preventRefreshInput = function(elem) { elem.value = elem.value; };

window.calculateBillAmounts = function() {
  const qnty = parseFloat(document.getElementById("billQnty").value) || 0;
  const rate = parseFloat(document.getElementById("billRate").value) || 0;
  const amount = qnty * rate;
  document.getElementById("billAmount").value = amount;

  const sgst = parseFloat(document.getElementById("billSgst").value) || 0;
  const cgst = parseFloat(document.getElementById("billCgst").value) || 0;
  const igst = parseFloat(document.getElementById("billIgst").value) || 0;
  const total = amount + (amount * (sgst + cgst + igst) / 100);
  document.getElementById("billTotal").value = total.toFixed(2);
};

// --- BILL SAVE, UPDATE, DELETE METHODS ---
window.saveBillToDatabase = async function() {
  const custId = document.getElementById("activeBillCustId").value;
  const billIdInput = document.getElementById("activeBillId");
  const existingBillId = billIdInput ? billIdInput.value : "";
  const totalAmount = document.getElementById("billTotal").value;

  if (!existingBillId) {
    const isDuplicate = billDataList.find(b => 
      String(b["Customer ID"]).trim() === String(custId).trim() && 
      parseFloat(String(b["Total Amount"]).replace(/[^0-9.-]+/g, "")) === parseFloat(totalAmount)
    );
    if (isDuplicate) {
      alert("This bill is already saved! You can directly print it.");
      document.getElementById("invNo").innerText = isDuplicate["Bill ID"];
      document.getElementById("print-bill-btn").classList.remove("hidden");
      return; 
    }
  }

  const selectedBank = document.getElementById("billBankSelect").value;
  let bIfsc = "", bName = "", bAcc = "", bBranch = "";
  
  if (selectedBank && savedBankDetails[selectedBank]) {
    bIfsc = savedBankDetails[selectedBank].ifsc; bName = savedBankDetails[selectedBank].accName;
    bAcc = savedBankDetails[selectedBank].accNo; bBranch = savedBankDetails[selectedBank].branch;
  } else {
    bIfsc = document.getElementById("bankIfsc").value; bName = document.getElementById("bankAccName").value;
    bAcc = document.getElementById("bankAccNo").value; bBranch = document.getElementById("bankBranch").value;
  }

  const payload = {
    action: existingBillId ? "update_bill" : "save_bill", 
    billId: existingBillId,
    custId: custId, 
    customerName: currentBillCustomerObj["Customer Name"],
    item: document.getElementById("billItem").value, 
    vehicleCompany: document.getElementById("billCompany").value,
    vehicleModel: document.getElementById("billModel").value,
    hsn: document.getElementById("billHsn").value,
    chassisNo: document.getElementById("billChassis").value, 
    engineNo: document.getElementById("billEngine").value,
    quantity: document.getElementById("billQnty").value, 
    rate: document.getElementById("billRate").value,
    amount: document.getElementById("billAmount").value, 
    sgst: document.getElementById("billSgst").value,
    cgst: document.getElementById("billCgst").value, 
    igst: document.getElementById("billIgst").value,
    totalAmount: parseAmount(totalAmount).toFixed(2),
    date: formatDateForStorage(), 
    batteryDetails: document.getElementById("billBattery").value,
    batteryWarranty: document.getElementById("billWarranty").value,
    batterySerialNo: document.getElementById("billBatterySerial").value,
    charger: document.getElementById("billCharger").value,
    chargerSerialNo: document.getElementById("billChargerSerial").value, 
    bankName: selectedBank, bankIfsc: bIfsc, bankAccName: bName, bankAccNo: bAcc, bankBranch: bBranch
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const result = await res.json();
    if (result.status === "success") {
      alert(existingBillId ? "Bill Updated Successfully!" : "Bill saved! Invoice No: " + result.invoiceNo);
      document.getElementById("invNo").innerText = existingBillId || result.invoiceNo;
      document.getElementById("print-bill-btn").classList.remove("hidden");
      await loadCustomers(true); 
    } else alert("Failed to save bill.");
  } catch (err) { alert("Error connecting to server."); }
};

window.editGeneratedBill = function(billId) {
  const bill = billDataList.find(b => String(b["Bill ID"]).trim() === String(billId).trim());
  if (!bill) return;
  const cust = customerDataList.find(c => String(c["ID"]) === String(bill["Customer ID"]));
  currentBillCustomerObj = cust;
  
  document.getElementById("activeBillCustId").value = bill["Customer ID"];
  document.getElementById("activeBillId").value = bill["Bill ID"]; 
  document.getElementById("billCustomerNameTitle").innerText = "Edit Bill: " + bill["Customer Name"];
  
  document.getElementById("billItem").value = bill["Item"] || "";
  document.getElementById("billCompany").value = bill["Vehicle Company"] || "";
  document.getElementById("billModel").value = bill["Vehicle Model"] || "";
  document.getElementById("billHsn").value = bill["HSN"] || "";
  document.getElementById("billChassis").value = bill["Chassis No"] || "";
  document.getElementById("billEngine").value = bill["Engine No"] || "";
  document.getElementById("billQnty").value = bill["Quantity"] || 1;
  document.getElementById("billRate").value = bill["Rate"] || "";
  document.getElementById("billAmount").value = bill["Amount"] || "";
  document.getElementById("billSgst").value = bill["SGST"] || "";
  document.getElementById("billCgst").value = bill["CGST"] || "";
  document.getElementById("billIgst").value = bill["IGST"] || "";
  document.getElementById("billTotal").value = String(bill["Total Amount"]).replace(/[^0-9.-]+/g, "") || "";
  document.getElementById("billBattery").value = bill["Battery Details"] || "";
  document.getElementById("billWarranty").value = bill["Battery Warranty"] || "";
  document.getElementById("billBatterySerial").value = bill["Battery Serial No"] || "";
  document.getElementById("billCharger").value = bill["Charger"] || "";
  document.getElementById("billChargerSerial").value = bill["Charger Serial No"] || "";
  
  const bankSelect = document.getElementById("billBankSelect");
  const bName = bill["Bank Name"] || "";
  if (bName && !Array.from(bankSelect.options).some(o => o.value === bName)) bankSelect.add(new Option(bName, bName));
  bankSelect.value = bName;

  savedBankDetails[bName] = {
    ifsc: bill["Bank IFSC"] || "", accName: bill["Bank A/C Name"] || "", accNo: bill["Bank A/C No"] || "", branch: bill["Bank Branch"] || ""
  };

  const saveBtn = document.getElementById("save-bill-btn");
  saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update Bill`;
  document.getElementById("print-bill-btn").classList.add("hidden");

  toggleBillViews('create');
};

window.deleteGeneratedBill = async function(billId) {
  if(!confirm("Are you sure you want to delete Invoice: " + billId + "?")) return;
  try {
     const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_bill", billId: billId }) });
     const result = await res.json();
     if(result.status === "success"){
        alert("Bill deleted successfully!");
        await loadCustomers(true);
        if(!document.getElementById("report-section").classList.contains("hidden")) generateReport();
     } else alert("Failed to delete.");
  } catch (err) { alert("Error deleting bill."); }
};

// Helper function to round money values accurately to 2 decimal places
function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// Format number to words
function convertNumberToWords(num) {
  if (isNaN(num) || Number(num) === 0) {
    return "Zero Rupees";
  }

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
    "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
    "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  function belowThousand(number) {
    let result = "";
    if (number >= 100) {
      result += ones[Math.floor(number / 100)] + " Hundred ";
      number %= 100;
    }
    if (number >= 20) {
      result += tens[Math.floor(number / 10)] + " ";
      number %= 10;
    }
    if (number > 0) {
      result += ones[number] + " ";
    }
    return result;
  }

  let number = Math.floor(Number(num));
  let result = "";

  if (number >= 10000000) {
    result += belowThousand(Math.floor(number / 10000000)) + "Crore ";
    number %= 10000000;
  }
  if (number >= 100000) {
    result += belowThousand(Math.floor(number / 100000)) + "Lakh ";
    number %= 100000;
  }
  if (number >= 1000) {
    result += belowThousand(Math.floor(number / 1000)) + "Thousand ";
    number %= 1000;
  }
  if (number > 0) {
    result += belowThousand(number);
  }
  return result.trim() + " Rupees";
}

function setPrintDate(dateValue = "") {
  const dateElement = document.getElementById("invDate");
  if (!dateElement) return;

  if (!dateValue) {
    const date = new Date();
    dateElement.innerText = String(date.getDate()).padStart(2, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + date.getFullYear();
    return;
  }
  const text = String(dateValue).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    dateElement.innerText = isoDate[3] + "-" + isoDate[2] + "-" + isoDate[1];
  } else {
    dateElement.innerText = text;
  }
}

function setInvoiceText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = value || "";
  }
}

function getInvoiceValue(id) {
  return document.getElementById(id)?.value || "";
}

// Strictly rounds the individual taxes before printing to ensure they add up perfectly
function createDynamicTaxHTML(amount, cgstRate, sgstRate, igstRate) {
  const cgstAmount = roundMoney(amount * cgstRate / 100);
  const sgstAmount = roundMoney(amount * sgstRate / 100);
  const igstAmount = roundMoney(amount * igstRate / 100);
  const totalGstAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);

  let html = "";
  if (cgstRate > 0) {
    html += `<div style="margin: 2px 0;">CGST @ ${cgstRate}%: ₹${cgstAmount.toFixed(2)}</div>`;
  }
  if (sgstRate > 0) {
    html += `<div style="margin: 2px 0;">SGST @ ${sgstRate}%: ₹${sgstAmount.toFixed(2)}</div>`;
  }
  if (igstRate > 0) {
    html += `<div style="margin: 2px 0;">IGST @ ${igstRate}%: ₹${igstAmount.toFixed(2)}</div>`;
  }
  if (totalGstAmount > 0) {
    html += `<div style="font-weight: bold; margin-top: 4px;">Total GST Amount: ₹${totalGstAmount.toFixed(2)}</div>`;
  }
  return html;
}

function createInvoiceRow(data) {
  return `
    <tr>
      <td>
        <strong>${data.item}</strong><br>
        <small>Company: ${data.company}</small><br>
        <small>Model: ${data.model}</small><br>
        <small>Chassis Number: ${data.chassis}</small><br>
        <small>Motor Number: ${data.engine}</small>
      </td>
      <td style="text-align: center;">${data.hsn}</td>
      <td style="text-align: center;">${data.quantity} PCS</td>
      <td style="text-align: right;">₹${data.rate.toFixed(2)}</td>
      <td style="text-align: right;">₹${data.amount.toFixed(2)}</td>
    </tr>
  `;
}

function showInvoiceAndPrint() {
  const invoice = document.getElementById("printable-invoice-area");

  if (!invoice) {
    alert("Printable invoice template পাওয়া যায়নি।");
    return;
  }

  // Screen-এ invoice দেখাবে না
  invoice.classList.add("hidden");
  invoice.style.display = "";
  invoice.style.visibility = "";

  // শুধু print-এর সময় CSS invoice visible করবে
  setTimeout(function () {
    window.print();
  }, 100);
}

window.printGeneratedBill = function () {
  if (!currentBillCustomerObj) {
    alert("Customer information পাওয়া যায়নি।");
    return;
  }

  setPrintDate();
  setInvoiceText("invCustName", currentBillCustomerObj["Customer Name"]);
  setInvoiceText("invMobile", currentBillCustomerObj["Mobile No"]);
  setInvoiceText("invAddress", currentBillCustomerObj["Address"]);
  setInvoiceText("invCarItem", getInvoiceValue("billItem"));
  setInvoiceText("invCarCompany", getInvoiceValue("billCompany") || "-");
  setInvoiceText("invCarModel", getInvoiceValue("billModel") || "-");
  setInvoiceText("invCarChassis", getInvoiceValue("billChassis") || "-");
  setInvoiceText("invCarMotor", getInvoiceValue("billEngine") || "-");
  setInvoiceText("invBattery", getInvoiceValue("billBattery") || "-");
  setInvoiceText("invBatterySerial", getInvoiceValue("billBatterySerial") || "-");
  setInvoiceText("invCharger", getInvoiceValue("billCharger") || "-");
  setInvoiceText("invChargerSerial", getInvoiceValue("billChargerSerial") || "-");
  setInvoiceText("invWarranty", getInvoiceValue("billWarranty") || "-");

  const quantity = parseFloat(getInvoiceValue("billQnty")) || 0;
  const rate = parseFloat(getInvoiceValue("billRate")) || 0;
  const amount = quantity * rate;

  const sgst = parseFloat(getInvoiceValue("billSgst")) || 0;
  const cgst = parseFloat(getInvoiceValue("billCgst")) || 0;
  const igst = parseFloat(getInvoiceValue("billIgst")) || 0;

  const sgstAmount = roundMoney(amount * sgst / 100);
  const cgstAmount = roundMoney(amount * cgst / 100);
  const igstAmount = roundMoney(amount * igst / 100);
  const totalGstAmount = roundMoney(sgstAmount + cgstAmount + igstAmount);
  const total = roundMoney(amount + totalGstAmount);

  const tableBody = document.getElementById("invTableBody");
  if (tableBody) {
    tableBody.innerHTML = createInvoiceRow({
      item: getInvoiceValue("billItem"),
      company: getInvoiceValue("billCompany") || "-",
      model: getInvoiceValue("billModel") || "-",
      chassis: getInvoiceValue("billChassis") || "-",
      engine: getInvoiceValue("billEngine") || "-",
      hsn: getInvoiceValue("billHsn") || "-",
      quantity,
      rate,
      amount
    });
  }

  const taxBox = document.getElementById("taxBreakdownList");
  if (taxBox) {
    taxBox.innerHTML = createDynamicTaxHTML(amount, cgst, sgst, igst);
  }

  setInvoiceText("invSubtotal", amount.toFixed(2));
  setInvoiceText("invFinalTotal", total.toFixed(2));
  setInvoiceText("invTotalInWords", convertNumberToWords(total));

  const selectedBank = getInvoiceValue("billBankSelect");
  if (selectedBank && savedBankDetails[selectedBank]) {
    const bank = savedBankDetails[selectedBank];
    setInvoiceText("invBankName", selectedBank);
    setInvoiceText("invIfsc", bank.ifsc || "");
    setInvoiceText("invAccNo", bank.accNo || "");
    setInvoiceText("invBranch", bank.branch || "");
  } else {
    setInvoiceText("invBankName", selectedBank);
    setInvoiceText("invIfsc", document.getElementById("bankIfsc")?.value || "");
    setInvoiceText("invAccNo", document.getElementById("bankAccNo")?.value || "");
    setInvoiceText("invBranch", document.getElementById("bankBranch")?.value || "");
  }

  showInvoiceAndPrint();
};

window.printExistingBill = function (billId) {
  const bill = billDataList.find(function (item) {
    return String(item["Bill ID"]).trim() === String(billId).trim();
  });

  if (!bill) {
    alert("Bill পাওয়া যায়নি।");
    return;
  }

  const customer = customerDataList.find(function (item) {
    return String(item["ID"]).trim() === String(bill["Customer ID"]).trim();
  });

  setPrintDate(bill["Date"]);
  setInvoiceText("invNo", bill["Bill ID"]);
  setInvoiceText("invCustName", bill["Customer Name"]);
  setInvoiceText("invMobile", customer?.["Mobile No"] || "");
  setInvoiceText("invAddress", customer?.["Address"] || "");
  setInvoiceText("invCarItem", bill["Item"] || "-");
  setInvoiceText("invCarCompany", bill["Vehicle Company"] || "-");
  setInvoiceText("invCarModel", bill["Vehicle Model"] || "-");
  setInvoiceText("invCarChassis", bill["Chassis No"] || "-");
  setInvoiceText("invCarMotor", bill["Engine No"] || "-");
  setInvoiceText("invBattery", bill["Battery Details"] || "-");
  setInvoiceText("invBatterySerial", bill["Battery Serial No"] || "-");
  setInvoiceText("invCharger", bill["Charger"] || "-");
  setInvoiceText("invChargerSerial", bill["Charger Serial No"] || "-");
  setInvoiceText("invWarranty", bill["Battery Warranty"] || "-");

  const amount = parseAmount(bill["Amount"]);
  const quantity = parseFloat(bill["Quantity"]) || 0;
  const rate = parseAmount(bill["Rate"]);

  const sgst = parseFloat(bill["SGST"]) || 0;
  const cgst = parseFloat(bill["CGST"]) || 0;
  const igst = parseFloat(bill["IGST"]) || 0;

  const sgstAmount = roundMoney(amount * sgst / 100);
  const cgstAmount = roundMoney(amount * cgst / 100);
  const igstAmount = roundMoney(amount * igst / 100);
  const totalGstAmount = roundMoney(sgstAmount + cgstAmount + igstAmount);
  const total = roundMoney(amount + totalGstAmount);

  const tableBody = document.getElementById("invTableBody");
  if (tableBody) {
    tableBody.innerHTML = createInvoiceRow({
      item: bill["Item"] || "-",
      company: bill["Vehicle Company"] || "-",
      model: bill["Vehicle Model"] || "-",
      chassis: bill["Chassis No"] || "-",
      engine: bill["Engine No"] || "-",
      hsn: bill["HSN"] || "-",
      quantity,
      rate,
      amount
    });
  }

  const taxBox = document.getElementById("taxBreakdownList");
  if (taxBox) {
    taxBox.innerHTML = createDynamicTaxHTML(amount, cgst, sgst, igst);
  }

  setInvoiceText("invSubtotal", amount.toFixed(2));
  setInvoiceText("invFinalTotal", total.toFixed(2));
  setInvoiceText("invTotalInWords", convertNumberToWords(total));

  setInvoiceText("invBankName", bill["Bank Name"] || "");
  setInvoiceText("invIfsc", bill["Bank IFSC"] || "");
  setInvoiceText("invAccNo", bill["Bank A/C No"] || "");
  setInvoiceText("invBranch", bill["Bank Branch"] || "");

  showInvoiceAndPrint();
};

// ==================== SPARE PARTS LOGIC ====================

// Stock Calculator
function getPartStock(productName) {
  const pName = String(productName).trim().toLowerCase();
  const totalPurchased = partsPurchaseList
    .filter(p => String(p["Product Name"]).trim().toLowerCase() === pName)
    .reduce((sum, item) => sum + (parseFloat(item["Quantity"]) || 0), 0);

  const totalSold = partsSaleList
    .filter(s => String(s["Product Name"]).trim().toLowerCase() === pName)
    .reduce((sum, item) => sum + (parseFloat(item["Quantity"]) || 0), 0);

  return totalPurchased - totalSold;
}

// Render Purchase / Sale Page Dynamically
// Render Purchase / Sale Page Dynamically
window.renderPartsSection = function(type) {
  const isPurchase = type === "purchase";
  const title = isPurchase ? "Spare Parts Purchase" : "Spare Parts Sale";
  const app = document.getElementById("app-content");

  // Stock Summary Cards
  const allProducts = Array.from(new Set(partsPurchaseList.map(p => p["Product Name"]).filter(Boolean)));
  let stockSummaryHtml = `<div class="dashboard-cards" style="margin-bottom: 25px;">`;
  allProducts.forEach(prod => {
    const stock = getPartStock(prod);
    stockSummaryHtml += `
      <div class="stat-card border-teal">
        <div class="stat-info">
          <span class="stat-title">${prod}</span>
          <h2 class="stat-value">${stock} in stock</h2>
        </div>
      </div>`;
  });
  stockSummaryHtml += `</div>`;

  app.innerHTML = `
    <section class="content-section">
      <h1><i class="fa-solid fa-wrench"></i> ${title}</h1>
      ${stockSummaryHtml}
      <div class="form-card">
        <h3 id="partsFormTitle">${isPurchase ? 'New Purchase Entry' : 'New Sale Entry'}</h3>
        <form id="parts-form" onsubmit="handlePartsSubmit(event, '${type}')">
          <input type="hidden" id="partEntryId" value="" />
          <div class="form-grid">
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="partDate" required />
            </div>
            <div class="form-group">
              <label>Product Name</label>
              <input type="text" id="partName" list="partsProductSuggestions" oninput="onPartNameChange()" placeholder="Enter / Search product name" required autocomplete="off" />
              <datalist id="partsProductSuggestions">
                ${allProducts.map(p => `<option value="${p}">`).join('')}
              </datalist>
            </div>
            
            <div class="form-group">
              <label>Current Available Stock</label>
              <div style="display: flex; align-items: center; gap: 10px;">
                <input type="text" id="currentStockDisplay" readonly placeholder="0" style="background:#f1f5f9; font-weight:bold; width: 100px;" />
                <span id="lowStockWarning" style="color: #ea580c; font-weight: bold; font-size: 13px; display: none;"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock!</span>
                <span id="outOfStockWarning" style="color: #dc2626; font-weight: bold; font-size: 13px; display: none;"><i class="fa-solid fa-ban"></i> Out of Stock!</span>
              </div>
            </div>

            <!-- Updated Serial Number Field with Datalist -->
            <div class="form-group">
              <label>Product Serial No</label>
              <input type="text" id="partSerial" list="serialSuggestions" placeholder="Serial / Batch No" autocomplete="off" />
              <datalist id="serialSuggestions"></datalist>
            </div>

            <div class="form-group">
              <label>Quantity</label>
              <input type="number" step="any" id="partQty" oninput="calculatePartTotal()" required />
            </div>
            <div class="form-group">
              <label>Price (Per unit)</label>
              <input type="number" step="any" id="partPrice" oninput="calculatePartTotal()" required />
            </div>
            <div class="form-group">
              <label>CGST (%)</label>
              <input type="number" step="any" id="partCgst" value="0" oninput="calculatePartTotal()" />
            </div>
            <div class="form-group">
              <label>SGST (%)</label>
              <input type="number" step="any" id="partSgst" value="0" oninput="calculatePartTotal()" />
            </div>
            <div class="form-group">
              <label>Total Amount</label>
              <input type="text" id="partAmount" readonly style="background:#f8fafc; font-weight:bold;" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn-primary" id="partSubmitBtn">Save ${isPurchase ? 'Purchase' : 'Sale'}</button>
            <button type="button" class="btn-secondary hidden" id="partCancelBtn" onclick="renderPartsSection('${type}')">Cancel</button>
          </div>
        </form>
      </div>

      <div class="table-responsive">
        <h3>${isPurchase ? 'Purchase History' : 'Sales History'}</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Date</th><th>Product Name</th><th>Serial No</th><th>Qty</th><th>Price</th><th>GST</th><th>Total Amount</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="parts-table-body"></tbody>
        </table>
      </div>
    </section>
  `;

  document.getElementById("partDate").value = new Date().toISOString().split("T")[0];
  renderPartsTable(type);
};
window.onPartNameChange = function() {
  const name = document.getElementById("partName").value;
  const stock = getPartStock(name);
  document.getElementById("currentStockDisplay").value = stock;

  const lowStockMsg = document.getElementById("lowStockWarning");
  const outOfStockMsg = document.getElementById("outOfStockWarning");
  const submitBtn = document.getElementById("partSubmitBtn");
  const formTitle = document.getElementById("partsFormTitle")?.innerText || "";
  const isSale = formTitle.includes("Sale");

  if (lowStockMsg) lowStockMsg.style.display = "none";
  if (outOfStockMsg) outOfStockMsg.style.display = "none";
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = "1";
    submitBtn.style.cursor = "pointer";
  }

  if (name.trim() !== "") {
    if (isSale) {
      if (stock <= 0) {
        if (outOfStockMsg) outOfStockMsg.style.display = "inline-block";
        if (submitBtn && !document.getElementById("partEntryId").value) {
          submitBtn.disabled = true;
          submitBtn.style.opacity = "0.5";
          submitBtn.style.cursor = "not-allowed";
        }
      } else if (stock < 10) {
        if (lowStockMsg) lowStockMsg.style.display = "inline-block";
      }
    }

    // --- NEW MULTIPLE SERIAL NUMBER LOGIC ---
    const serialDatalist = document.getElementById("serialSuggestions");
    const serialInput = document.getElementById("partSerial");

    if (serialDatalist && serialInput) {
      serialDatalist.innerHTML = ""; // আগের লিস্ট ক্লিয়ার করবে
      const cleanName = String(name).trim().toLowerCase();
      let serialStock = {};

      // 1. পারচেস লিস্ট থেকে Serial Number এর স্টক যোগ করবে
      partsPurchaseList.forEach(p => {
        if (String(p["Product Name"]).trim().toLowerCase() === cleanName) {
          const sNo = String(p["Serial No"] || "").trim();
          if (sNo !== "") {
            serialStock[sNo] = (serialStock[sNo] || 0) + (parseFloat(p["Quantity"]) || 0);
          }
        }
      });

      // 2. সেলস লিস্ট থেকে বিক্রিত Serial Number এর পরিমাণ মাইনাস করবে
      partsSaleList.forEach(s => {
        if (String(s["Product Name"]).trim().toLowerCase() === cleanName) {
          const sNo = String(s["Serial No"] || "").trim();
          if (sNo !== "" && serialStock[sNo] !== undefined) {
            serialStock[sNo] -= (parseFloat(s["Quantity"]) || 0);
          }
        }
      });

      // 3. শুধুমাত্র Available (স্টক > 0) সিরিয়াল নাম্বারগুলো লিস্টে দেখাবে
      let availableSerialsCount = 0;
      for (let sNo in serialStock) {
        if (serialStock[sNo] > 0) {
          availableSerialsCount++;
          const opt = document.createElement("option");
          opt.value = sNo;
          serialDatalist.appendChild(opt);
        }
      }

      // 4. Sales এর ক্ষেত্রে বক্সটি অটোমেটিক ফাঁকা করে দেবে যাতে আপনি পছন্দমত বেছে নিতে পারেন
      if (isSale && !document.getElementById("partEntryId").value) {
        serialInput.value = ""; 
        if (availableSerialsCount > 0) {
          serialInput.placeholder = "Click/Type to choose Serial No";
        } else {
          serialInput.placeholder = "No Available Serial Found";
        }
      }
    }
  }
};

window.calculatePartTotal = function() {
  const qty = parseFloat(document.getElementById("partQty").value) || 0;
  const price = parseFloat(document.getElementById("partPrice").value) || 0;
  const cgst = parseFloat(document.getElementById("partCgst").value) || 0;
  const sgst = parseFloat(document.getElementById("partSgst").value) || 0;

  const base = qty * price;
  const total = base + (base * (cgst + sgst) / 100);
  document.getElementById("partAmount").value = total.toFixed(2);
};

function renderPartsTable(type) {
  const tbody = document.getElementById("parts-table-body");
  if (!tbody) return;
  const list = type === "purchase" ? partsPurchaseList : partsSaleList;
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No transactions found.</td></tr>`;
    return;
  }

  list.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item["ID"]}</strong></td>
      <td>${item["Date"]}</td>
      <td>${item["Product Name"]}</td>
      <td>${item["Serial No"] || "-"}</td>
      <td>${item["Quantity"]}</td>
      <td>₹${parseFloat(item["Price"] || 0).toFixed(2)}</td>
      <td>${(parseFloat(item["CGST"] || 0) + parseFloat(item["SGST"] || 0))}%</td>
      <td>₹${parseFloat(item["Amount"] || 0).toFixed(2)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick='editPartEntry(${JSON.stringify(item)}, "${type}")'><i class="fa-solid fa-pen"></i></button>
          <button class="btn-delete" onclick='deletePartEntry("${item["ID"]}", "${type}")'><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.handlePartsSubmit = async function(e, type) {
  e.preventDefault();
  const id = document.getElementById("partEntryId").value;
  const qty = parseFloat(document.getElementById("partQty").value) || 0;
  const name = document.getElementById("partName").value.trim();

  // Validate sale stock limits strictly
  if (type === "sale") {
    let currentAvailable = getPartStock(name);
    
    // If editing an existing sale, add the previous quantity back to calculate true availability
    if (id) {
      const existingSale = partsSaleList.find(s => s["ID"] === id);
      if (existingSale) {
        currentAvailable += (parseFloat(existingSale["Quantity"]) || 0);
      }
    }

    if (currentAvailable <= 0) {
      alert("Error: Out of stock! This product cannot be sold.");
      return;
    }
    if (qty > currentAvailable) {
      alert(`Insufficient stock! You only have ${currentAvailable} left.`);
      return;
    }
  }

  const payload = {
    action: id ? "update_part_transaction" : "save_part_transaction",
    type: type,
    id: id || null,
    date: document.getElementById("partDate").value,
    productName: name,
    serialNo: document.getElementById("partSerial").value.trim(),
    quantity: qty,
    price: document.getElementById("partPrice").value,
    cgst: document.getElementById("partCgst").value,
    sgst: document.getElementById("partSgst").value,
    amount: document.getElementById("partAmount").value
  };

  const btn = document.getElementById("partSubmitBtn");
  btn.disabled = true;
  btn.innerText = "Processing...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === "success") {
      alert("Saved successfully!");
      await loadCustomers(); // Refresh data
      renderPartsSection(type); // Reload page
    } else {
      alert("Error: " + (result.message || "Failed to save"));
      btn.disabled = false;
      btn.innerText = id ? "Update" : "Save Sale";
    }
  } catch (err) {
    alert("Connection error: " + err.message);
    btn.disabled = false;
    btn.innerText = id ? "Update" : "Save Sale";
  }
};

window.editPartEntry = function(item, type) {
  document.getElementById("partEntryId").value = item["ID"];
  document.getElementById("partDate").value = item["Date"];
  document.getElementById("partName").value = item["Product Name"];
  document.getElementById("partSerial").value = item["Serial No"] || "";
  document.getElementById("partQty").value = item["Quantity"];
  document.getElementById("partPrice").value = item["Price"];
  document.getElementById("partCgst").value = item["CGST"] || 0;
  document.getElementById("partSgst").value = item["SGST"] || 0;
  document.getElementById("partAmount").value = item["Amount"];

  onPartNameChange();
  document.getElementById("partsFormTitle").innerText = "Edit " + (type === "purchase" ? "Purchase" : "Sale");
  document.getElementById("partSubmitBtn").innerText = "Update";
  document.getElementById("partCancelBtn").classList.remove("hidden");
};

window.deletePartEntry = async function(id, type) {
  if (!confirm("Are you sure you want to delete this record?")) return;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete_part_transaction", type: type, id: id })
    });
    const result = await res.json();
    if (result.status === "success") {
      alert("Deleted successfully!");
      await loadCustomers();
      renderPartsSection(type);
    } else {
      alert("Failed to delete.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// ==================== BALANCE SHEET REPORT ====================

window.renderPartsBalanceReport = function(fromDate = '', toDate = '') {
  const app = document.getElementById("app-content");

  // Date filtering logic
  const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
  const to = toDate ? new Date(toDate + "T23:59:59") : null;

  const filteredPurchases = partsPurchaseList.filter(p => {
    if (!from || !to) return true;
    const d = new Date(p["Date"]);
    return d >= from && d <= to;
  });

  const filteredSales = partsSaleList.filter(s => {
    if (!from || !to) return true;
    const d = new Date(s["Date"]);
    return d >= from && d <= to;
  });

  // Normalize product names to avoid duplicates (case & space insensitive)
  const productMap = new Map();
  [...filteredPurchases, ...filteredSales].forEach(item => {
    const rawName = item["Product Name"];
    if (rawName) {
      const cleanName = String(rawName).trim();
      const key = cleanName.toLowerCase();
      if (!productMap.has(key)) {
        productMap.set(key, cleanName); // Keep original casing of the first instance found
      }
    }
  });
  const allProducts = Array.from(productMap.values());

  let totalPurchaseAmt = 0;
  let totalSaleAmt = 0;
  let totalNetMargin = 0;
  let rowsHtml = "";

  allProducts.forEach(prod => {
    const prodKey = prod.toLowerCase();
    
    // Match items ignoring case and spaces
    const pItems = filteredPurchases.filter(p => String(p["Product Name"]).trim().toLowerCase() === prodKey);
    const sItems = filteredSales.filter(s => String(s["Product Name"]).trim().toLowerCase() === prodKey);

    const pQty = pItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
    const pAmt = pItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
    
    const sQty = sItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
    const sAmt = sItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
    
    // Average Purchase Price calculation for actual profit calculation
    let avgPurchasePrice = 0;
    if (pQty > 0) {
      avgPurchasePrice = pAmt / pQty;
    } else {
      // Fallback to global average if not purchased in this date range
      const globalPItems = partsPurchaseList.filter(p => String(p["Product Name"]).trim().toLowerCase() === prodKey);
      const globalPQty = globalPItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
      const globalPAmt = globalPItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
      if (globalPQty > 0) avgPurchasePrice = globalPAmt / globalPQty;
    }

    // Actual Margin/Profit = Sale Amount - (Purchased Price of the sold items)
    const costOfGoodsSold = avgPurchasePrice * sQty;
    const productMargin = sAmt - costOfGoodsSold;

    totalPurchaseAmt += pAmt;
    totalSaleAmt += sAmt;
    totalNetMargin += productMargin;
    
    // Overall current stock (Independent of date range)
    const globalStock = getPartStock(prod);

    rowsHtml += `
      <tr>
        <td><strong>${prod}</strong></td>
        <td>${pQty}</td>
        <td>₹${pAmt.toFixed(2)}</td>
        <td>${sQty}</td>
        <td>₹${sAmt.toFixed(2)}</td>
        <td style="color: ${productMargin >= 0 ? '#15803d' : '#b91c1c'}; font-weight: bold;">₹${productMargin.toFixed(2)}</td>
        <td><span class="badge" style="background:${globalStock <= 2 ? '#fee2e2; color:#b91c1c;' : '#dcfce7; color:#15803d;'}">${globalStock}</span></td>
      </tr>
    `;
  });

  // Default to today's date in Date Pickers
  const today = new Date().toISOString().split("T")[0];

  app.innerHTML = `
    <section class="content-section">
      <h1><i class="fa-solid fa-chart-pie"></i> Spare Parts Balance Sheet</h1>
      
      <!-- Date Range Filter -->
      <div class="form-card" style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap;">
        <div class="form-group">
          <label>From Date</label>
          <input type="date" id="balFromDate" value="${fromDate || today}">
        </div>
        <div class="form-group">
          <label>To Date</label>
          <input type="date" id="balToDate" value="${toDate || today}">
        </div>
        <button class="btn-primary" onclick="filterBalanceSheet()">Search</button>
        <button class="btn-secondary" onclick="renderPartsBalanceReport()">Reset All</button>
      </div>

      <div class="dashboard-cards" style="margin-bottom: 25px;">
        <div class="stat-card border-blue">
          <div class="stat-info">
            <span class="stat-title">Total Purchase Cost</span>
            <h2 class="stat-value">₹${totalPurchaseAmt.toFixed(2)}</h2>
          </div>
        </div>
        <div class="stat-card border-green">
          <div class="stat-info">
            <span class="stat-title">Total Sale Revenue</span>
            <h2 class="stat-value">₹${totalSaleAmt.toFixed(2)}</h2>
          </div>
        </div>
        <div class="stat-card ${totalNetMargin >= 0 ? 'border-purple' : 'border-red'}">
          <div class="stat-info">
            <span class="stat-title">Actual Net Margin (Profit)</span>
            <h2 class="stat-value">₹${totalNetMargin.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <h3>Product-wise Stock & Financial Balance</h3>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Purchased Qty</th>
              <th>Purchase Value</th>
              <th>Sold Qty</th>
              <th>Sale Value</th>
              <th>Margin (Profit)</th>
              <th>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="7" class="text-center">No transactions found for this period.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
};

window.filterBalanceSheet = function() {
  const from = document.getElementById("balFromDate").value;
  const to = document.getElementById("balToDate").value;
  renderPartsBalanceReport(from, to);
};