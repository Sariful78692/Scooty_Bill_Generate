window.getPartStock = function(productName) {
  const pName = String(productName).trim().toLowerCase();
  const totalPurchased = partsPurchaseList.filter(p => String(p["Product Name"]).trim().toLowerCase() === pName).reduce((sum, item) => sum + (parseFloat(item["Quantity"]) || 0), 0);
  const totalSold = partsSaleList.filter(s => String(s["Product Name"]).trim().toLowerCase() === pName).reduce((sum, item) => sum + (parseFloat(item["Quantity"]) || 0), 0);
  return totalPurchased - totalSold;
};

window.renderPartsSection = function(type) {
  const isPurchase = type === "purchase";
  const title = isPurchase ? "Spare Parts Purchase" : "Spare Parts Sale";
  const app = document.getElementById("app-content");

  const allProducts = Array.from(new Set(partsPurchaseList.map(p => p["Product Name"]).filter(Boolean)));
  let stockSummaryHtml = `<div class="dashboard-cards" style="margin-bottom: 25px;">`;
  allProducts.forEach(prod => {
    stockSummaryHtml += `<div class="stat-card border-teal"><div class="stat-info"><span class="stat-title">${prod}</span><h2 class="stat-value">${getPartStock(prod)} in stock</h2></div></div>`;
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
            <div class="form-group"><label>Date</label><input type="date" id="partDate" required /></div>
            <div class="form-group"><label>Product Name</label><input type="text" id="partName" list="partsProductSuggestions" oninput="onPartNameChange()" placeholder="Enter / Search product name" required autocomplete="off" /><datalist id="partsProductSuggestions">${allProducts.map(p => `<option value="${p}">`).join('')}</datalist></div>
            <div class="form-group"><label>Current Available Stock</label><div style="display: flex; align-items: center; gap: 10px;"><input type="text" id="currentStockDisplay" readonly placeholder="0" style="background:#f1f5f9; font-weight:bold; width: 100px;" /><span id="lowStockWarning" style="color: #ea580c; font-weight: bold; font-size: 13px; display: none;"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock!</span><span id="outOfStockWarning" style="color: #dc2626; font-weight: bold; font-size: 13px; display: none;"><i class="fa-solid fa-ban"></i> Out of Stock!</span></div></div>
            ${!isPurchase ? '<div class="form-group"><label>Purchase Price (Per unit)</label><input type="text" id="partPurchasePrice" readonly placeholder="No purchase record" style="background:#f1f5f9; font-weight:bold;"></div>' : ''}
            <div class="form-group"><label>Product Serial No</label><input type="text" id="partSerial" list="serialSuggestions" placeholder="Serial / Batch No" autocomplete="off" /><datalist id="serialSuggestions"></datalist></div>
            <div class="form-group"><label>Quantity</label><input type="number" step="any" id="partQty" oninput="calculatePartTotal(); validatePartQuantity()" required /><small id="partQtyError" style="color:#dc2626; font-weight:bold; display:none;"></small></div>
            <div class="form-group"><label>Price (Per unit)</label><input type="number" step="any" id="partPrice" oninput="calculatePartTotal()" required /></div>
            <div class="form-group"><label>CGST (%)</label><input type="number" step="any" id="partCgst" value="0" oninput="calculatePartTotal()" /></div>
            <div class="form-group"><label>SGST (%)</label><input type="number" step="any" id="partSgst" value="0" oninput="calculatePartTotal()" /></div>
            <div class="form-group"><label>Total Amount</label><input type="text" id="partAmount" readonly style="background:#f8fafc; font-weight:bold;" /></div>
          </div>
          <div class="form-actions"><button type="submit" class="btn-primary" id="partSubmitBtn">Save ${isPurchase ? 'Purchase' : 'Sale'}</button><button type="button" class="btn-secondary hidden" id="partCancelBtn" onclick="renderPartsSection('${type}')">Cancel</button></div>
        </form>
      </div>
      <div class="table-responsive">
        <h3>${isPurchase ? 'Purchase History' : 'Sales History'}</h3>
        <table><thead><tr><th>ID</th><th>Date</th><th>Product Name</th><th>Serial No</th><th>Qty</th><th>Price</th><th>GST</th><th>Total Amount</th><th>Actions</th></tr></thead><tbody id="parts-table-body"></tbody></table>
      </div>
    </section>
  `;
  document.getElementById("partDate").value = new Date().toISOString().split("T")[0];
  renderPartsTable(type);
};

window.calculateVehicleTotalCost = function() {
  const cost = parseFloat(document.getElementById("costPrice")?.value) || 0;
  const cgst = parseFloat(document.getElementById("cgst")?.value) || 0;
  const sgst = parseFloat(document.getElementById("sgst")?.value) || 0;
  const igst = parseFloat(document.getElementById("igst")?.value) || 0;
  const total = document.getElementById("totalCostPrice");
  if (total) total.value = (cost * (1 + (cgst + sgst + igst) / 100)).toFixed(2);
};

let vehicleStockCurrentPage = 1;
let vehicleStockPageSize = "10";

window.changeVehicleStockPageSize = function(size) {
  vehicleStockPageSize = size;
  vehicleStockCurrentPage = 1;
  renderVehicleStock();
};

window.changeVehicleStockPage = function(direction) {
  vehicleStockCurrentPage = Math.max(1, vehicleStockCurrentPage + direction);
  renderVehicleStock();
};

window.renderVehicleStock = function() {
  const app = document.getElementById("app-content");
  const editing = window.editingVehicleStock || null;
  const fields = [
    ["date", "Date", "date", true],
    ["billNo", "Bill No", "text", true],
    ["vehicleName", "Vehicle Name", "text", true],
    ["vehicleCompany", "Vehicle Company", "text", true],
    ["vehicleModel", "Vehicle Model", "text", true],
    ["vehicleColour", "Vehicle Colour", "text", true],
    ["chassisNo", "Chassis No", "text", true],
    ["engineNo", "Engine No", "text", true],
    ["costPrice", "Cost Price", "number", true],
    ["cgst", "CGST (%)", "number", false, "CGST"],
    ["sgst", "SGST (%)", "number", false, "SGST"],
    ["igst", "IGST (%)", "number", false, "IGST"],
    ["totalCostPrice", "Total Cost Price", "number", true]
  ];
  const availableStock = getAvailableVehicleStockList();
  const stockRows = availableStock.slice().reverse();
  const pageSize = vehicleStockPageSize === "all" ? Math.max(stockRows.length, 1) : Number(vehicleStockPageSize);
  const pageCount = Math.max(1, Math.ceil(stockRows.length / pageSize));
  vehicleStockCurrentPage = Math.min(vehicleStockCurrentPage, pageCount);
  const startIndex = (vehicleStockCurrentPage - 1) * pageSize;
  const pageRows = stockRows.slice(startIndex, startIndex + pageSize);
  const rows = pageRows.map(item => `<tr>${fields.map(field => `<td>${escapeHtml(item[field[4] || field[1]] ?? "")}</td>`).join("")}<td><div class="action-btns"><button class="btn-edit" type="button" title="Edit" onclick="editVehicleStock('${escapeHtml(item.ID)}')"><i class="fa-solid fa-pen"></i></button><button class="btn-delete" type="button" title="Delete" onclick="deleteVehicleStock('${escapeHtml(item.ID)}')"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("");
  const rangeStart = pageRows.length ? startIndex + 1 : 0;
  const rangeEnd = pageRows.length ? startIndex + pageRows.length : 0;
  const pagination = `<div id="vehicle-stock-pagination" class="table-pagination"><label>Stock entries per page <select onchange="changeVehicleStockPageSize(this.value)"><option value="10" ${vehicleStockPageSize === "10" ? "selected" : ""}>10</option><option value="50" ${vehicleStockPageSize === "50" ? "selected" : ""}>50</option><option value="all" ${vehicleStockPageSize === "all" ? "selected" : ""}>All</option></select></label><div><span>Showing ${rangeStart}–${rangeEnd} of ${stockRows.length}</span><button type="button" class="btn-secondary" onclick="changeVehicleStockPage(-1)" ${vehicleStockCurrentPage <= 1 ? "disabled" : ""}>Previous</button><button type="button" class="btn-secondary" onclick="changeVehicleStockPage(1)" ${vehicleStockCurrentPage >= pageCount ? "disabled" : ""}>Next</button></div></div>`;
  app.innerHTML = `<section class="content-section"><h1><i class="fa-solid fa-warehouse"></i> Stock Management</h1><div class="form-card"><h3>${editing ? "Edit Vehicle Stock" : "Vehicle Stock Entry"}</h3><form id="vehicle-stock-form"><input type="hidden" id="vehicle-stock-id" value="${editing ? escapeHtml(editing.ID) : ""}"><div class="form-grid">${fields.map(([id, label, type, required]) => { const numeric = type === "number"; const readonly = id === "totalCostPrice"; const duplicateCheck = id === "chassisNo" || id === "engineNo"; const textInput = type === "text"; const inputHandler = textInput ? `this.value=this.value.toUpperCase();${duplicateCheck ? "validateVehicleStockDuplicates();" : ""}` : (duplicateCheck ? "validateVehicleStockDuplicates();" : ""); return `<div class="form-group"><label for="${id}">${label}</label><input id="${id}" name="${id}" type="${type}" ${numeric ? 'min="0" step="any"' : (textInput ? `maxlength="100" oninput="${inputHandler}"` : "")} ${required ? "required" : ""} ${readonly ? 'readonly style="background:#e2e8f0"' : ""} ${id === "costPrice" || id === "cgst" || id === "sgst" || id === "igst" ? 'oninput="calculateVehicleTotalCost()"' : ""} value="${editing ? escapeHtml(editing[fields.find(field => field[0] === id)?.[4] || label] ?? "") : ""}"></div>`; }).join("")}</div><div id="vehicle-stock-duplicate-warning" style="display:none;color:#dc2626;font-weight:700;margin-top:12px;">Already exist: this Chassis No or Engine No is already in stock.</div><div class="form-actions"><button class="btn-primary" id="vehicle-stock-submit" type="submit"><i class="fa-solid fa-${editing ? "floppy-disk" : "plus"}"></i> ${editing ? "Update" : "Submit"}</button>${editing ? `<button class="btn-secondary" type="button" id="vehicle-stock-cancel">Cancel</button>` : ""}</div></form></div><div class="table-responsive"><h3>Vehicle Stock List</h3>${pagination}<table><thead><tr>${fields.map(([, label]) => `<th>${label}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${rows || `<tr><td colspan="${fields.length + 1}" class="text-center">No vehicle stock entries yet.</td></tr>`}</tbody></table></div></section>`;
  calculateVehicleTotalCost();
  if (!document.getElementById("date").value) {
    const today = new Date();
    document.getElementById("date").value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }
  validateVehicleStockDuplicates();
  document.getElementById("vehicle-stock-cancel")?.addEventListener("click", () => { window.editingVehicleStock = null; renderVehicleStock(); });
  document.getElementById("vehicle-stock-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = document.getElementById("vehicle-stock-submit");
    const payload = Object.fromEntries(fields.map(([id]) => [id, document.getElementById(id).value.trim()]));
    const id = document.getElementById("vehicle-stock-id").value;
    if (validateVehicleStockDuplicates()) return;
    const originalButtonHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${id ? "Updating..." : "Submitting..."}`;
    try {
      const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:id ? "update_vehicle_stock" : "save_vehicle_stock", id, ...payload})});
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not save vehicle stock.");
      window.editingVehicleStock = null;
      showToast(id ? "Vehicle stock updated successfully!" : "Vehicle stock submitted successfully!");
      await loadVehicleStockData();
      renderVehicleStock();
    } catch (error) {
      showToast(error.message || "Could not connect to the server.", "error");
      button.disabled = false;
      button.innerHTML = originalButtonHtml;
    }
  });
};

window.validateVehicleStockDuplicates = function() {
  const normalize = value => String(value || "").trim().toLowerCase();
  const chassis = normalize(document.getElementById("chassisNo")?.value);
  const engine = normalize(document.getElementById("engineNo")?.value);
  const id = String(document.getElementById("vehicle-stock-id")?.value || "");
  const duplicate = (vehicleStockList || []).some(stock => String(stock.ID || "") !== id && ((chassis && normalize(stock["Chassis No"]) === chassis) || (engine && normalize(stock["Engine No"]) === engine)));
  const warning = document.getElementById("vehicle-stock-duplicate-warning");
  const button = document.getElementById("vehicle-stock-submit");
  if (warning) warning.style.display = duplicate ? "block" : "none";
  if (button) button.disabled = duplicate;
  return duplicate;
};

let stockReportSelectedBranch = "all";
window.renderVehicleStockReport = function(branchFilter = stockReportSelectedBranch) {
  const app = document.getElementById("app-content");
  if (!app) return;
  const isMainBranch = String(currentBranch || "").trim().toLowerCase() === "main branch";
  stockReportSelectedBranch = isMainBranch ? (branchFilter || "all") : currentBranch;
  const matchesBranch = row => stockReportSelectedBranch === "all" || String(row.Branch || "Main Branch").trim().toLowerCase() === stockReportSelectedBranch.trim().toLowerCase();
  const groups = new Map();
  const normalize = value => String(value || "").trim();
  const keyFor = (company, model, colour) => [company, model, colour].map(value => value.toLowerCase()).join("\u001f");
  const getGroup = (company, model, colour) => {
    company = normalize(company) || "Unknown Company";
    model = normalize(model) || "Unknown Model";
    colour = normalize(colour) || "Unspecified";
    const key = keyFor(company, model, colour);
    if (!groups.has(key)) groups.set(key, { company, model, colour, purchased: 0, sales: 0, present: 0, chassis: [], engines: [], units: [] });
    return groups.get(key);
  };

  // Stock rows still present are the unsold purchases. Sold bill quantities
  // are added back to reconstruct purchase totals after stock rows are consumed.
  (getAvailableVehicleStockList() || []).filter(matchesBranch).forEach(stock => {
    const group = getGroup(stock["Vehicle Company"], stock["Vehicle Model"], stock["Vehicle Colour"]);
    group.purchased += 1;
    group.present += 1;
    const chassis = normalize(stock["Chassis No"]);
    if (chassis) group.chassis.push(chassis);
    const engine = normalize(stock["Engine No"]);
    if (engine) group.engines.push(engine);
    group.units.push({ chassis: chassis || "—", engine: engine || "—" });
  });
  (billDataList || []).forEach(bill => {
    if (!normalize(bill.Item).toLowerCase().includes("scooty")) return;
    if (!matchesBranch(bill)) return;
    const quantity = Math.max(0, parseFloat(bill.Quantity) || 1);
    const group = getGroup(bill["Vehicle Company"], bill["Vehicle Model"], bill["Vehicle Colour"]);
    group.sales += quantity;
    group.purchased += quantity;
  });

  const rows = Array.from(groups.values()).sort((a, b) => a.company.localeCompare(b.company) || a.model.localeCompare(b.model) || a.colour.localeCompare(b.colour));
  const total = key => rows.reduce((sum, row) => sum + row[key], 0);
  app.innerHTML = `<section class="content-section"><h1><i class="fa-solid fa-chart-column"></i> Stock Report</h1><div class="dashboard-cards" style="margin:18px 0 24px"><div class="stat-card"><div class="stat-info"><span class="stat-title">Scooty Purchased</span><h2 class="stat-value">${total("purchased")}</h2></div></div><div class="stat-card"><div class="stat-info"><span class="stat-title">Scooty Sales</span><h2 class="stat-value">${total("sales")}</h2></div></div><div class="stat-card"><div class="stat-info"><span class="stat-title">Present Stock</span><h2 class="stat-value">${total("present")}</h2></div></div></div><h3 style="margin:0 0 14px">Company, Model &amp; Colour-wise Scooty Stock</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">${rows.length ? rows.map(row => `<article style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(15,23,42,.06);border-top:4px solid #2563eb"><div style="font-size:12px;color:#64748b">${escapeHtml(row.company)}</div><h3 style="margin:4px 0 12px;color:#0f172a">${escapeHtml(row.model)} <span style="font-weight:500;color:#475569">· ${escapeHtml(row.colour)}</span></h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center"><div style="padding:9px;background:#f8fafc;border-radius:8px"><small>Purchased</small><strong style="display:block;font-size:20px">${row.purchased}</strong></div><div style="padding:9px;background:#fff7ed;border-radius:8px"><small>Sales</small><strong style="display:block;font-size:20px">${row.sales}</strong></div><div style="padding:9px;background:#eff6ff;border-radius:8px"><small>Present</small><strong style="display:block;font-size:20px">${row.present}</strong></div></div><div style="margin-top:14px;font-size:13px;line-height:1.7"><strong>Available Scooty Details (${row.units.length})</strong>${row.units.length ? row.units.map((unit, index) => `<div style="padding:8px 0;border-bottom:1px solid #e2e8f0"><strong>${index + 1}.</strong> Chassis No: ${escapeHtml(unit.chassis)}<br><span style="padding-left:18px">Engine No: ${escapeHtml(unit.engine)}</span></div>`).join("") : `<div>Currently no stock available.</div>`}</div></article>`).join("") : `<p class="text-center">No scooty stock or sales data found.</p>`}</div></section>`;
  if (isMainBranch) {
    const branchOptions = [`<option value="all" ${stockReportSelectedBranch === "all" ? "selected" : ""}>All Branches</option>`, ...(availableBranches || []).map(branch => `<option value="${escapeHtml(branch)}" ${stockReportSelectedBranch.toLowerCase() === String(branch).trim().toLowerCase() ? "selected" : ""}>${escapeHtml(branch)}</option>`)].join("");
    app.querySelector("h1")?.insertAdjacentHTML("afterend", `<div class="form-group" style="max-width:320px;margin:0 0 16px"><label for="stockReportBranch">View Branch</label><select id="stockReportBranch" onchange="renderVehicleStockReport(this.value)" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff">${branchOptions}</select></div>`);
  } else {
    app.querySelector("h1")?.insertAdjacentHTML("afterend", `<p style="margin:-8px 0 16px;color:#64748b">Branch: <strong>${escapeHtml(currentBranch)}</strong></p>`);
  }
  const summaryCards = app.querySelectorAll(".dashboard-cards > .stat-card");
  const summaries = [
    ["purchase", "fa-cart-flatbed", "Purchased units"],
    ["sales", "fa-arrow-trend-up", "Sold units"],
    ["present", "fa-warehouse", "Available now"]
  ];
  summaryCards.forEach((card, index) => {
    const [type, icon, description] = summaries[index];
    card.classList.add("stock-report-summary", `stock-report-summary-${type}`);
    card.insertAdjacentHTML("afterbegin", `<span class="stock-report-summary-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>`);
    card.querySelector(".stat-info")?.insertAdjacentHTML("beforeend", `<span class="stock-report-summary-caption">${description}</span>`);
  });
  app.querySelector(".dashboard-cards")?.classList.add("stock-report-summary-grid");
};

window.editVehicleStock = function(id) {
  window.editingVehicleStock = (vehicleStockList || []).find(item => String(item.ID) === String(id)) || null;
  if (window.editingVehicleStock) renderVehicleStock();
};

window.deleteVehicleStock = async function(id) {
  if (!confirm("Delete this vehicle stock entry?")) return;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"delete_vehicle_stock", id})});
    const result = await response.json();
    if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not delete vehicle stock.");
    if (String(window.editingVehicleStock?.ID) === String(id)) window.editingVehicleStock = null;
    showToast("Vehicle stock deleted successfully!");
    await loadVehicleStockData();
    renderVehicleStock();
  } catch (error) {
    showToast(error.message || "Could not connect to the server.", "error");
  }
};

window.onPartNameChange = function() {
  const name = document.getElementById("partName").value;
  const stock = getPartStock(name);
  if(document.getElementById("currentStockDisplay")) document.getElementById("currentStockDisplay").value = stock;
  const qtyInput = document.getElementById("partQty");
  const isSaleForm = (document.getElementById("partsFormTitle")?.innerText || "").includes("Sale");
  if (qtyInput) {
    if (isSaleForm) {
      let editableStock = stock;
      const entryId = document.getElementById("partEntryId")?.value || "";
      const existingSale = partsSaleList.find(s => String(s["ID"]).trim() === String(entryId).trim());
      if (existingSale) editableStock += parseFloat(existingSale["Quantity"]) || 0;
      qtyInput.max = Math.max(0, editableStock);
    }
    else qtyInput.removeAttribute("max");
  }
  const purchasePriceInput = document.getElementById("partPurchasePrice");
  if (purchasePriceInput) purchasePriceInput.value = getPartPurchasePrice(name);

  const lowStockMsg = document.getElementById("lowStockWarning");
  const outOfStockMsg = document.getElementById("outOfStockWarning");
  const submitBtn = document.getElementById("partSubmitBtn");
  const isSale = (document.getElementById("partsFormTitle")?.innerText || "").includes("Sale");

  if (lowStockMsg) lowStockMsg.style.display = "none";
  if (outOfStockMsg) outOfStockMsg.style.display = "none";
  if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = "1"; submitBtn.style.cursor = "pointer"; }

  if (name.trim() !== "") {
    if (isSale) {
      if (stock <= 0) {
        if (outOfStockMsg) outOfStockMsg.style.display = "inline-block";
        if (submitBtn && !document.getElementById("partEntryId").value) { submitBtn.disabled = true; submitBtn.style.opacity = "0.5"; submitBtn.style.cursor = "not-allowed"; }
      } else if (stock < 10 && lowStockMsg) { lowStockMsg.style.display = "inline-block"; }
    }

    const serialDatalist = document.getElementById("serialSuggestions");
    const serialInput = document.getElementById("partSerial");
    if (serialDatalist && serialInput) {
      serialDatalist.innerHTML = ""; 
      const cleanName = String(name).trim().toLowerCase();
      let serialStock = {};
      partsPurchaseList.forEach(p => { if (String(p["Product Name"]).trim().toLowerCase() === cleanName) { const sNo = String(p["Serial No"] || "").trim(); if (sNo !== "") serialStock[sNo] = (serialStock[sNo] || 0) + (parseFloat(p["Quantity"]) || 0); } });
      partsSaleList.forEach(s => { if (String(s["Product Name"]).trim().toLowerCase() === cleanName) { const sNo = String(s["Serial No"] || "").trim(); if (sNo !== "" && serialStock[sNo] !== undefined) serialStock[sNo] -= (parseFloat(s["Quantity"]) || 0); } });
      
      let count = 0;
      for (let sNo in serialStock) { if (serialStock[sNo] > 0) { count++; const opt = document.createElement("option"); opt.value = sNo; serialDatalist.appendChild(opt); } }
      if (isSale && !document.getElementById("partEntryId").value) { serialInput.value = ""; serialInput.placeholder = count > 0 ? "Click/Type to choose Serial No" : "No Available Serial Found"; }
    }
  }
  validatePartQuantity();
};

window.validatePartQuantity = function() {
  const title = document.getElementById("partsFormTitle")?.innerText || "";
  const qtyInput = document.getElementById("partQty");
  const error = document.getElementById("partQtyError");
  if (!qtyInput || !title.includes("Sale")) return true;

  const id = document.getElementById("partEntryId")?.value || "";
  let available = getPartStock(document.getElementById("partName")?.value || "");
  if (id) {
    const existingSale = partsSaleList.find(s => String(s["ID"]).trim() === String(id).trim());
    if (existingSale) available += parseFloat(existingSale["Quantity"]) || 0;
  }
  const quantity = parseFloat(qtyInput.value) || 0;
  const invalid = quantity > available;
  qtyInput.setCustomValidity(invalid ? `Only ${available} item(s) available in stock.` : "");
  if (error) {
    error.textContent = invalid ? `Only ${available} available in stock.` : "";
    error.style.display = invalid ? "block" : "none";
  }
  return !invalid;
};

window.calculatePartTotal = function() {
  const qty = parseFloat(document.getElementById("partQty").value) || 0;
  const price = parseFloat(document.getElementById("partPrice").value) || 0;
  const cgst = parseFloat(document.getElementById("partCgst").value) || 0;
  const sgst = parseFloat(document.getElementById("partSgst").value) || 0;
  const base = qty * price;
  document.getElementById("partAmount").value = (base + (base * (cgst + sgst) / 100)).toFixed(2);
};

window.renderPartsTable = function(type) {
  const tbody = document.getElementById("parts-table-body");
  if (!tbody) return;
  const list = type === "purchase" ? partsPurchaseList : partsSaleList;
  tbody.innerHTML = "";
  if (list.length === 0) { tbody.innerHTML = `<tr><td colspan="9" class="text-center">No transactions found.</td></tr>`; return; }

  list.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${item["ID"]}</strong></td><td>${item["Date"]}</td><td>${item["Product Name"]}</td><td>${item["Serial No"] || "-"}</td><td>${formatIndianNumber(item["Quantity"])}</td><td>₹${formatIndianAmount(item["Price"] || 0)}</td><td>${(parseFloat(item["CGST"] || 0) + parseFloat(item["SGST"] || 0))}%</td><td>₹${formatIndianAmount(item["Amount"] || 0)}</td><td><div class="action-btns"><button class="btn-edit" onclick='editPartEntry(${JSON.stringify(item)}, "${type}")'><i class="fa-solid fa-pen"></i></button><button class="btn-delete" onclick='deletePartEntry("${item["ID"]}", "${type}")'><i class="fa-solid fa-trash"></i></button></div></td>`;
    tbody.appendChild(tr);
  });
};

window.handlePartsSubmit = async function(e, type) {
  e.preventDefault();
  const id = document.getElementById("partEntryId").value;
  const qty = parseFloat(document.getElementById("partQty").value) || 0;
  const name = document.getElementById("partName").value.trim();

  if (type === "sale") {
    let currentAvailable = getPartStock(name);
    if (id) { const existingSale = partsSaleList.find(s => s["ID"] === id); if (existingSale) currentAvailable += (parseFloat(existingSale["Quantity"]) || 0); }
    if (currentAvailable <= 0) { alert("Error: Out of stock! This product cannot be sold."); return; }
    if (qty > currentAvailable) { alert(`Insufficient stock! You only have ${currentAvailable} left.`); return; }
  }

  const payload = {
    action: id ? "update_part_transaction" : "save_part_transaction", type: type, id: id || null, branch: currentBranch,
    date: document.getElementById("partDate").value, productName: name, serialNo: document.getElementById("partSerial").value.trim(),
    quantity: qty, price: document.getElementById("partPrice").value, cgst: document.getElementById("partCgst").value,
    sgst: document.getElementById("partSgst").value, amount: document.getElementById("partAmount").value
  };

  const btn = document.getElementById("partSubmitBtn"); btn.disabled = true; btn.innerText = "Processing...";
  try {
    const res = await apiFetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.status === "success") { alert("Saved successfully!"); await loadCustomers(); renderPartsSection(type); } 
    else { alert("Error: " + (result.message || "Failed to save")); btn.disabled = false; btn.innerText = id ? "Update" : "Save Sale"; }
  } catch (err) { alert("Connection error: " + err.message); btn.disabled = false; btn.innerText = id ? "Update" : "Save Sale"; }
};

window.editPartEntry = function(item, type) {
  document.getElementById("partEntryId").value = item["ID"]; document.getElementById("partDate").value = item["Date"]; document.getElementById("partName").value = item["Product Name"];
  document.getElementById("partSerial").value = item["Serial No"] || ""; document.getElementById("partQty").value = item["Quantity"]; document.getElementById("partPrice").value = item["Price"];
  document.getElementById("partCgst").value = item["CGST"] || 0; document.getElementById("partSgst").value = item["SGST"] || 0; document.getElementById("partAmount").value = item["Amount"];
  onPartNameChange();
  document.getElementById("partsFormTitle").innerText = "Edit " + (type === "purchase" ? "Purchase" : "Sale");
  document.getElementById("partSubmitBtn").innerText = "Update"; document.getElementById("partCancelBtn").classList.remove("hidden");
};

window.deletePartEntry = async function(id, type) {
  if (!confirm("Are you sure you want to delete this record?")) return;
  try {
    const res = await apiFetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_part_transaction", type: type, id: id, branch: currentBranch }) });
    const result = await res.json();
    if (result.status === "success") { alert("Deleted successfully!"); await loadCustomers(); renderPartsSection(type); } 
    else alert("Failed to delete.");
  } catch (err) { alert("Error: " + err.message); }
};

window.renderPartsBalanceReport = function(fromDate = '', toDate = '') {
  const app = document.getElementById("app-content");
  const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
  const to = toDate ? new Date(toDate + "T23:59:59") : null;

  const filteredPurchases = partsPurchaseList.filter(p => { if (!from || !to) return true; const d = new Date(p["Date"]); return d >= from && d <= to; });
  const filteredSales = partsSaleList.filter(s => { if (!from || !to) return true; const d = new Date(s["Date"]); return d >= from && d <= to; });

  const productMap = new Map();
  [...filteredPurchases, ...filteredSales].forEach(item => {
    const rawName = item["Product Name"];
    if (rawName) { const cleanName = String(rawName).trim(); const key = cleanName.toLowerCase(); if (!productMap.has(key)) productMap.set(key, cleanName); }
  });
  const allProducts = Array.from(productMap.values());

  let totalPurchaseAmt = 0, totalSaleAmt = 0, totalNetMargin = 0, rowsHtml = "";

  allProducts.forEach(prod => {
    const prodKey = prod.toLowerCase();
    const pItems = filteredPurchases.filter(p => String(p["Product Name"]).trim().toLowerCase() === prodKey);
    const sItems = filteredSales.filter(s => String(s["Product Name"]).trim().toLowerCase() === prodKey);

    const pQty = pItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
    const pAmt = pItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
    const sQty = sItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
    const sAmt = sItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
    
    let avgPurchasePrice = 0;
    if (pQty > 0) avgPurchasePrice = pAmt / pQty;
    else {
      const globalPItems = partsPurchaseList.filter(p => String(p["Product Name"]).trim().toLowerCase() === prodKey);
      const globalPQty = globalPItems.reduce((s, i) => s + (parseFloat(i["Quantity"]) || 0), 0);
      const globalPAmt = globalPItems.reduce((s, i) => s + (parseFloat(i["Amount"]) || 0), 0);
      if (globalPQty > 0) avgPurchasePrice = globalPAmt / globalPQty;
    }

    const costOfGoodsSold = avgPurchasePrice * sQty;
    const productMargin = sAmt - costOfGoodsSold;
    totalPurchaseAmt += pAmt; totalSaleAmt += sAmt; totalNetMargin += productMargin;
    const globalStock = getPartStock(prod);

    rowsHtml += `<tr><td><strong>${prod}</strong></td><td>${formatIndianNumber(pQty)}</td><td>₹${formatIndianAmount(pAmt)}</td><td>${formatIndianNumber(sQty)}</td><td>₹${formatIndianAmount(sAmt)}</td><td style="color: ${productMargin >= 0 ? '#15803d' : '#b91c1c'}; font-weight: bold;">₹${formatIndianAmount(productMargin)}</td><td><span class="badge" style="background:${globalStock <= 2 ? '#fee2e2; color:#b91c1c;' : '#dcfce7; color:#15803d;'}">${formatIndianNumber(globalStock)}</span></td></tr>`;
  });

  const today = new Date().toISOString().split("T")[0];
  app.innerHTML = `<section class="content-section"><h1><i class="fa-solid fa-chart-pie"></i> Spare Parts Balance Sheet</h1><div class="form-card" style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap;"><div class="form-group"><label>From Date</label><input type="date" id="balFromDate" value="${fromDate || today}"></div><div class="form-group"><label>To Date</label><input type="date" id="balToDate" value="${toDate || today}"></div><button class="btn-primary" onclick="filterBalanceSheet()">Search</button><button class="btn-secondary" onclick="renderPartsBalanceReport()">Reset All</button></div><div class="dashboard-cards" style="margin-bottom: 25px;"><div class="stat-card border-blue"><div class="stat-info"><span class="stat-title">Total Purchase Cost</span><h2 class="stat-value">₹${formatIndianAmount(totalPurchaseAmt)}</h2></div></div><div class="stat-card border-green"><div class="stat-info"><span class="stat-title">Total Sale Revenue</span><h2 class="stat-value">₹${formatIndianAmount(totalSaleAmt)}</h2></div></div><div class="stat-card ${totalNetMargin >= 0 ? 'border-purple' : 'border-red'}"><div class="stat-info"><span class="stat-title">Actual Net Margin (Profit)</span><h2 class="stat-value">₹${formatIndianAmount(totalNetMargin)}</h2></div></div></div><div class="table-responsive"><h3>Product-wise Stock & Financial Balance</h3><table><thead><tr><th>Product Name</th><th>Purchased Qty</th><th>Purchase Value</th><th>Sold Qty</th><th>Sale Value</th><th>Margin (Profit)</th><th>Current Stock</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="7" class="text-center">No transactions found for this period.</td></tr>`}</tbody></table></div></section>`;
};

window.filterBalanceSheet = function() {
  const from = document.getElementById("balFromDate").value;
  const to = document.getElementById("balToDate").value;
  renderPartsBalanceReport(from, to);
};

window.getPartPurchasePrice = function(productName) {
  const cleanName = String(productName || "").trim().toLowerCase();
  const purchases = partsPurchaseList.filter(p => String(p["Product Name"] || "").trim().toLowerCase() === cleanName);
  if (!purchases.length) return "";
  const price = parseFloat(purchases[purchases.length - 1]["Price"]);
  return Number.isFinite(price) ? price.toFixed(2) : "";
};
