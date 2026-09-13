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
            <div class="form-group"><label>Product Serial No</label><input type="text" id="partSerial" list="serialSuggestions" placeholder="Serial / Batch No" autocomplete="off" /><datalist id="serialSuggestions"></datalist></div>
            <div class="form-group"><label>Quantity</label><input type="number" step="any" id="partQty" oninput="calculatePartTotal()" required /></div>
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

window.onPartNameChange = function() {
  const name = document.getElementById("partName").value;
  const stock = getPartStock(name);
  if(document.getElementById("currentStockDisplay")) document.getElementById("currentStockDisplay").value = stock;

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
    tr.innerHTML = `<td><strong>${item["ID"]}</strong></td><td>${item["Date"]}</td><td>${item["Product Name"]}</td><td>${item["Serial No"] || "-"}</td><td>${item["Quantity"]}</td><td>₹${parseFloat(item["Price"] || 0).toFixed(2)}</td><td>${(parseFloat(item["CGST"] || 0) + parseFloat(item["SGST"] || 0))}%</td><td>₹${parseFloat(item["Amount"] || 0).toFixed(2)}</td><td><div class="action-btns"><button class="btn-edit" onclick='editPartEntry(${JSON.stringify(item)}, "${type}")'><i class="fa-solid fa-pen"></i></button><button class="btn-delete" onclick='deletePartEntry("${item["ID"]}", "${type}")'><i class="fa-solid fa-trash"></i></button></div></td>`;
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
    action: id ? "update_part_transaction" : "save_part_transaction", type: type, id: id || null,
    date: document.getElementById("partDate").value, productName: name, serialNo: document.getElementById("partSerial").value.trim(),
    quantity: qty, price: document.getElementById("partPrice").value, cgst: document.getElementById("partCgst").value,
    sgst: document.getElementById("partSgst").value, amount: document.getElementById("partAmount").value
  };

  const btn = document.getElementById("partSubmitBtn"); btn.disabled = true; btn.innerText = "Processing...";
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
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
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete_part_transaction", type: type, id: id }) });
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

    rowsHtml += `<tr><td><strong>${prod}</strong></td><td>${pQty}</td><td>₹${pAmt.toFixed(2)}</td><td>${sQty}</td><td>₹${sAmt.toFixed(2)}</td><td style="color: ${productMargin >= 0 ? '#15803d' : '#b91c1c'}; font-weight: bold;">₹${productMargin.toFixed(2)}</td><td><span class="badge" style="background:${globalStock <= 2 ? '#fee2e2; color:#b91c1c;' : '#dcfce7; color:#15803d;'}">${globalStock}</span></td></tr>`;
  });

  const today = new Date().toISOString().split("T")[0];
  app.innerHTML = `<section class="content-section"><h1><i class="fa-solid fa-chart-pie"></i> Spare Parts Balance Sheet</h1><div class="form-card" style="display: flex; gap: 15px; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap;"><div class="form-group"><label>From Date</label><input type="date" id="balFromDate" value="${fromDate || today}"></div><div class="form-group"><label>To Date</label><input type="date" id="balToDate" value="${toDate || today}"></div><button class="btn-primary" onclick="filterBalanceSheet()">Search</button><button class="btn-secondary" onclick="renderPartsBalanceReport()">Reset All</button></div><div class="dashboard-cards" style="margin-bottom: 25px;"><div class="stat-card border-blue"><div class="stat-info"><span class="stat-title">Total Purchase Cost</span><h2 class="stat-value">₹${totalPurchaseAmt.toFixed(2)}</h2></div></div><div class="stat-card border-green"><div class="stat-info"><span class="stat-title">Total Sale Revenue</span><h2 class="stat-value">₹${totalSaleAmt.toFixed(2)}</h2></div></div><div class="stat-card ${totalNetMargin >= 0 ? 'border-purple' : 'border-red'}"><div class="stat-info"><span class="stat-title">Actual Net Margin (Profit)</span><h2 class="stat-value">₹${totalNetMargin.toFixed(2)}</h2></div></div></div><div class="table-responsive"><h3>Product-wise Stock & Financial Balance</h3><table><thead><tr><th>Product Name</th><th>Purchased Qty</th><th>Purchase Value</th><th>Sold Qty</th><th>Sale Value</th><th>Margin (Profit)</th><th>Current Stock</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="7" class="text-center">No transactions found for this period.</td></tr>`}</tbody></table></div></section>`;
};

window.filterBalanceSheet = function() {
  const from = document.getElementById("balFromDate").value;
  const to = document.getElementById("balToDate").value;
  renderPartsBalanceReport(from, to);
};