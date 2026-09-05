// Paste your NEW deployed Google Apps Script Web App URL here!
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwfbwVNv4C3Y_-3KPLkb9h-foqU_kz-ah8sH7j2hPXFSotgE8EzVfQIbNf7Lwlpno42Xw/exec";

let customerDataList = [];
let billDataList = []; 
let currentBillCustomerObj = null;
let savedBankDetails = {};
let currentFilter = "all";

let todaySalesChartInst = null;
let monthlySalesChartInst = null;

document.addEventListener("DOMContentLoaded", function () {
  const submenuToggles = document.querySelectorAll(".submenu-toggle");
  submenuToggles.forEach(toggle => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentElement.classList.toggle("open");
    });
  });

  // Default load Dashboard
  loadPage('dashboard/dashboard.html', 'dashboard');
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
  if (!filteredBills.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center">No sales found for this date range.</td></tr>`; return; }
  filteredBills.forEach(bill => {
    const tr = document.createElement("tr"); const amt = parseAmount(bill["Total Amount"]);
    tr.innerHTML = `<td><strong>${bill["Bill ID"]}</strong></td><td>${safeDisplay(bill["Customer Name"])}</td><td><span class="badge">${safeDisplay(bill["Item"])}</span><br><small>${safeDisplay(bill["Vehicle Company"])}</small></td><td>${safeDisplay(bill["Vehicle Model"])}</td><td>₹${amt.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
};

// ---------------- CUSTOMER ENTRY / DETAILS ----------------
function initCustomerEntryForm() {
  const form = document.getElementById("customer-form");
  if(form) form.addEventListener("submit", handleCustomerFormSubmit);
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
  if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="text-center">No customers found.</td></tr>`; return; }
  
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
  resetForm(); loadPage('customer/customer-details.html', 'customerDetails', 'all');
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
  
  loadPage('customer/customer-entry.html', 'customerEntry').then(() => {
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
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete", id }) });
    const result = await res.json();
    if (result.status === "success") { alert("Deleted successfully!"); loadCustomers(true); } else alert("Failed to delete.");
  } catch (err) { alert("Delete failed."); }
}

async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.size < 500000) return file;
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1200 / image.width); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.75));
}

async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true; submitBtn.innerText = "Saving...";

  const editId = document.getElementById("edit-customer-id").value;
  let photoBase64 = "", photoName = "", photoMimeType = "";
  const photoFileInput = document.getElementById("photoInput");

  if (photoFileInput && photoFileInput.files[0]) {
    const file = await compressImage(photoFileInput.files[0]);
    photoName = file.name || "customer-photo.jpg"; photoMimeType = file.type || "image/jpeg";
    photoBase64 = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result.split(",")[1]); reader.readAsDataURL(file); });
  }

  const payload = {
    action: editId ? "update" : "create", id: editId || null,
    customerName: document.getElementById("customerName").value.trim(),
    guardianName: document.getElementById("guardianName").value.trim(),
    gender: document.getElementById("gender").value,
    dob: document.getElementById("dob").value,
    religion: document.getElementById("religion").value.trim(),
    aadhaarNo: document.getElementById("aadhaarNo").value.trim(),
    mobileNo: document.getElementById("mobileNo").value.trim(),
    address: document.getElementById("address").value.trim(),
    vehicle: document.getElementById("vehicleSelect").value,
    vehicleCompany: document.getElementById("vehicleCompany")?.value.trim() || "",
    vehicleModel: document.getElementById("vehicleModel")?.value.trim() || "",
    chassisNo: document.getElementById("chassisNo").value.trim(),
    engineNo: document.getElementById("engineNo").value.trim(),
    occupation: document.getElementById("occupationSelect").value,
    existingPhotoUrl: document.getElementById("existing-photo-url").value,
    photoBase64, photoName, photoMimeType
  };

  let uiRecoveryTimer;
  try {
    uiRecoveryTimer = setTimeout(() => { submitBtn.disabled = false; submitBtn.innerText = "Retry Save"; }, 12000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const result = await res.json();
    if (result.status === "success") {
      alert(editId ? "Customer updated successfully!" : "Customer saved successfully!");
      resetForm(); loadPage('customer/customer-details.html', 'customerDetails', 'all'); loadCustomers(true); 
    } else alert("Error: " + result.message);
  } catch (err) { alert(err.name === "AbortError" ? "Save timed out. Please check your internet connection and try again." : "Submission failed: " + err.message); }
  finally { clearTimeout(uiRecoveryTimer); submitBtn.disabled = false; submitBtn.innerText = editId ? "Update Customer" : "Save Customer"; }
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
  if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="text-center">No customers.</td></tr>`; return; }
  
  list.forEach(cust => {
    const tr = document.createElement("tr");
    const custBills = billDataList.filter(b => String(b["Customer ID"]).trim() === String(cust["ID"]).trim());
    
    let actionBtns = `<button class="btn-primary" onclick="openBillCreatePage('${cust["ID"]}')">Generate</button>`;
    
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
  
  ["billHsn","billRate","billAmount","billSgst","billCgst","billIgst","billTotal","billBattery","billWarranty","billBankSelect"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("billQnty").value = 1;
  document.getElementById("print-bill-btn").classList.add("hidden");
  
  const saveBtn = document.getElementById("save-bill-btn");
  saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Bill to Database`;
  
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

// --- PRINTING LOGIC ---
function convertNumberToWords(num) {
  if (isNaN(num) || num === 0) return "Zero";
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function getWords(n) {
    if (n===0) return '';
    if (n<20) return a[n];
    if (n<100) return b[Math.floor(n/10)] + (n%10!==0?' '+a[n%10]:'');
    if (n<1000) return a[Math.floor(n/100)] + 'Hundred ' + (n%100!==0?getWords(n%100):'');
    return '';
  }
  let n = Math.floor(num), str = '';
  if (n>=10000000) { str += getWords(Math.floor(n/10000000)) + 'Crore '; n %= 10000000; }
  if (n>=100000) { str += getWords(Math.floor(n/100000)) + 'Lakh '; n %= 100000; }
  if (n>=1000) { str += getWords(Math.floor(n/1000)) + 'Thousand '; n %= 1000; }
  if (n>=100) { str += getWords(Math.floor(n/100)) + 'Hundred '; n %= 100; }
  if (n>0) str += getWords(n);
  return str.trim() + ' Rupees';
}

function setPrintDate() {
  const d = new Date();
  document.getElementById("invDate").innerText = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

window.printGeneratedBill = function() {
  setPrintDate();
  document.getElementById("invCustName").innerText = currentBillCustomerObj["Customer Name"];
  document.getElementById("invMobile").innerText = currentBillCustomerObj["Mobile No"];
  document.getElementById("invAddress").innerText = currentBillCustomerObj["Address"];
  
  const amount = parseFloat(document.getElementById("billAmount").value) || 0;
  const sgst = parseFloat(document.getElementById("billSgst").value) || 0;
  const cgst = parseFloat(document.getElementById("billCgst").value) || 0;
  const igst = parseFloat(document.getElementById("billIgst").value) || 0;
  const qnty = document.getElementById("billQnty").value;
  const battery = document.getElementById("billBattery").value;
  
  const comp = document.getElementById("billCompany").value;
  const mod = document.getElementById("billModel").value;

  let tHtml = `<tr><td><strong>${document.getElementById("billItem").value}</strong><br><small>Company: ${comp}</small><br><small>Model: ${mod}</small><br><small>CH NO- ${document.getElementById("billChassis").value}</small><br><small>MOT NO: ${document.getElementById("billEngine").value}</small></td>
    <td>${document.getElementById("billHsn").value}</td><td>${qnty} PCS</td><td>₹${document.getElementById("billRate").value}</td><td>₹${amount.toFixed(2)}</td></tr>`;
  if(battery) tHtml += `<tr><td><strong>${battery}</strong><br><small>(${document.getElementById("billWarranty").value})</small></td><td>-</td><td>${qnty} PCS</td><td>-</td><td>-</td></tr>`;
  document.getElementById("invTableBody").innerHTML = tHtml;

  let taxHtml = "";
  if(sgst>0) taxHtml += `<div>SGST @ ${sgst}%: ₹${((amount*sgst)/100).toFixed(2)}</div>`;
  if(cgst>0) taxHtml += `<div>CGST @ ${cgst}%: ₹${((amount*cgst)/100).toFixed(2)}</div>`;
  if(igst>0) taxHtml += `<div>IGST @ ${igst}%: ₹${((amount*igst)/100).toFixed(2)}</div>`;
  document.getElementById("taxBreakdownList").innerHTML = taxHtml;

  const total = parseFloat(document.getElementById("billTotal").value) || 0;
  document.getElementById("invFinalTotal").innerText = total.toFixed(2);
  document.getElementById("invTotalInWords").innerText = convertNumberToWords(total);
  
  const selBank = document.getElementById("billBankSelect").value;
  if (selBank && savedBankDetails[selBank]) {
    document.getElementById("invBankName").innerText = selBank;
    document.getElementById("invIfsc").innerText = savedBankDetails[selBank].ifsc;
    document.getElementById("invAccNo").innerText = savedBankDetails[selBank].accNo;
    document.getElementById("invBranch").innerText = savedBankDetails[selBank].branch;
  } else {
    document.getElementById("invBankName").innerText = document.getElementById("billBankSelect").value;
    document.getElementById("invIfsc").innerText = document.getElementById("bankIfsc").value;
    document.getElementById("invAccNo").innerText = document.getElementById("bankAccNo").value;
    document.getElementById("invBranch").innerText = document.getElementById("bankBranch").value;
  }
  window.print();
};

window.printExistingBill = function(billId) {
  const bill = billDataList.find(b => String(b["Bill ID"]).trim() === String(billId).trim());
  if (!bill) return;
  const cust = customerDataList.find(c => String(c["ID"]).trim() === String(bill["Customer ID"]).trim());

  document.getElementById("invNo").innerText = bill["Bill ID"];
  setPrintDate();
  document.getElementById("invCustName").innerText = bill["Customer Name"];
  document.getElementById("invMobile").innerText = cust ? cust["Mobile No"] : "";
  document.getElementById("invAddress").innerText = cust ? cust["Address"] : "";
  
  const amount = parseFloat(String(bill["Amount"]).replace(/[^0-9.-]+/g, "")) || 0;
  const sgst = parseFloat(String(bill["SGST"]).replace(/[^0-9.-]+/g, "")) || 0;
  const cgst = parseFloat(String(bill["CGST"]).replace(/[^0-9.-]+/g, "")) || 0;
  const igst = parseFloat(String(bill["IGST"]).replace(/[^0-9.-]+/g, "")) || 0;
  const qnty = bill["Quantity"];
  const battery = bill["Battery Details"];
  
  let tHtml = `<tr><td><strong>${bill["Item"]}</strong><br><small>Company: ${bill["Vehicle Company"] || "-"}</small><br><small>Model: ${bill["Vehicle Model"] || "-"}</small><br><small>CH NO- ${bill["Chassis No"]}</small><br><small>MOT NO: ${bill["Engine No"]}</small></td>
    <td>${bill["HSN"]}</td><td>${qnty} PCS</td><td>₹${bill["Rate"]}</td><td>₹${amount.toFixed(2)}</td></tr>`;
  if(battery) tHtml += `<tr><td><strong>${battery}</strong><br><small>(${bill["Battery Warranty"]})</small></td><td>-</td><td>${qnty} PCS</td><td>-</td><td>-</td></tr>`;
  document.getElementById("invTableBody").innerHTML = tHtml;

  let taxHtml = "";
  if(sgst>0) taxHtml += `<div>SGST @ ${sgst}%: ₹${((amount*sgst)/100).toFixed(2)}</div>`;
  if(cgst>0) taxHtml += `<div>CGST @ ${cgst}%: ₹${((amount*cgst)/100).toFixed(2)}</div>`;
  if(igst>0) taxHtml += `<div>IGST @ ${igst}%: ₹${((amount*igst)/100).toFixed(2)}</div>`;
  document.getElementById("taxBreakdownList").innerHTML = taxHtml;

  const total = parseFloat(String(bill["Total Amount"]).replace(/[^0-9.-]+/g, "")) || 0;
  document.getElementById("invFinalTotal").innerText = total.toFixed(2);
  document.getElementById("invTotalInWords").innerText = convertNumberToWords(total);
  
  const b = bill["Bank Name"];
  if(b) {
    document.getElementById("invBankName").innerText = b; 
    document.getElementById("invIfsc").innerText = bill["Bank IFSC"] || "";
    document.getElementById("invAccNo").innerText = bill["Bank A/C No"] || ""; 
    document.getElementById("invBranch").innerText = bill["Bank Branch"] || "";
  } else {
    document.getElementById("invBankName").innerText = ""; 
    document.getElementById("invIfsc").innerText = "";
    document.getElementById("invAccNo").innerText = ""; 
    document.getElementById("invBranch").innerText = "";
  }
  
  window.print();
};