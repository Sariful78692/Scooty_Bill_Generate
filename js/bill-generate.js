window.toggleBillViews = function(view) {
  if (view === 'search') {
    document.getElementById("bill-create-page").classList.add("hidden"); 
    document.getElementById("bill-generate-section").classList.remove("hidden"); 
  } else {
    document.getElementById("bill-generate-section").classList.add("hidden"); 
    document.getElementById("bill-create-page").classList.remove("hidden"); 
  }
};

window.handlePrintClick = function(custId) {
  const cleanId = String(custId || "").trim();
  const custBills = billDataList.filter(b => String(b["Customer ID"] || "").trim() === cleanId);

  if (custBills.length === 0) {
    alert("No bill found for this customer.");
    return;
  }

  if (custBills.length === 1) {
    printExistingBill(custBills[0]["Bill ID"]);
    return;
  }

  // একাধিক বিল থাকলে — তারিখ বেছে নেওয়ার মডাল দেখাও
  const sel = document.getElementById("printSelectBillId");
  sel.innerHTML = "";

  // সর্বশেষ বিল উপরে দেখানোর জন্য উল্টো করে সাজানো
  const sortedBills = [...custBills].reverse();

  sortedBills.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b["Bill ID"];
    opt.text = `${b["Bill ID"]} — ${b["Date"] || "No Date"} — ₹${b["Total Amount"] || "0"}`;
    sel.appendChild(opt);
  });

  document.getElementById("print-select-modal").classList.remove("hidden");
};

window.closePrintSelectModal = function() {
  document.getElementById("print-select-modal").classList.add("hidden");
};

window.confirmPrintSelectedBill = function() {
  const sel = document.getElementById("printSelectBillId");
  const billId = sel.value;
  closePrintSelectModal();
  if (billId) printExistingBill(billId);
};

window.renderBillCustomerTable = function(list) {
  const tbody = document.getElementById("bill-customer-tbody");
  if (!tbody) return;
  const tableHead = document.querySelector("#bill-customer-table thead");
  if (tableHead) tableHead.innerHTML = `<tr><th>Name</th><th>Mobile</th><th>Vehicle</th><th>Company</th><th>Model</th><th>Action</th></tr>`;
  tbody.innerHTML = "";
  if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center">No customers.</td></tr>`; return; }
  
  list.forEach(cust => {
    const tr = document.createElement("tr");

    const custId = String(cust["ID"] || "").trim();
    const custBills = custId === "" ? [] : billDataList.filter(
      b => String(b["Customer ID"] || "").trim() === custId
    );
    const latestBill = custBills.length ? custBills[custBills.length - 1] : null;
    const company = latestBill?.["Vehicle Company"] || cust["Vehicle Company"] || "-";
    const model = latestBill?.["Vehicle Model"] || cust["Vehicle Model"] || "-";

    let actionBtns = `<button type="button" class="btn-primary" onclick="openBillCreatePage('${custId}')">Bill Generate</button>`;
    
    if (custBills.length > 0) {
      const latestBill = custBills[custBills.length - 1]; 
      const latestBillId = String(latestBill["Bill ID"] || "").trim();
      if (latestBillId) {
        actionBtns += ` <button type="button" class="btn-print" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Print Bill" onclick="handlePrintClick('${custId}')"><i class="fa-solid fa-print"></i></button>`;
        actionBtns += ` <button type="button" class="btn-edit" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Edit Bill" onclick="editGeneratedBill('${latestBillId}')"><i class="fa-solid fa-pen"></i></button>`;
        actionBtns += ` <button type="button" class="btn-delete" style="padding: 10px; font-size: 13px; margin-left: 5px;" title="Delete Bill" onclick="deleteGeneratedBill('${latestBillId}')"><i class="fa-solid fa-trash"></i></button>`;
      }
    }

    tr.innerHTML = `
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td>${company}</td>
      <td>${model}</td>
      <td style="display:flex; gap:5px;">${actionBtns}</td>
    `;
    tbody.appendChild(tr);
  });
};

window.filterBillCustomers = function() {
  const query = document.getElementById("billSearchInput").value.toLowerCase();
  const filtered = customerDataList.filter(c => 
    (c["Customer Name"] || "").toLowerCase().includes(query) || (c["Mobile No"] || "").toLowerCase().includes(query)
  );
  renderBillCustomerTable(filtered.reverse());
};

window.openBillCreatePage = function(custId) {
  const cust = customerDataList.find(c => String(c["ID"]) === String(custId));
  if (!cust) return;
  currentBillCustomerObj = cust;
  document.getElementById("activeBillCustId").value = cust["ID"];
  document.getElementById("activeBillId").value = ""; 
  document.getElementById("billCustomerNameTitle").innerText = "Create Bill for: " + cust["Customer Name"] + " (" + (cust["Vehicle"] || "") + ")";
  
  document.getElementById("billItem").value = cust["Vehicle"] || "";
  
  // ✅ Company Dropdown Setup
  const compSelect = document.getElementById("billCompany");
  const cVal = (cust["Vehicle Company"] || "").trim().toUpperCase();
  if (compSelect) {
    if (cVal && !Array.from(compSelect.options).some(o => o.value === cVal)) compSelect.add(new Option(cVal, cVal));
    compSelect.value = cVal;
  }

  // ✅ Model Dropdown Setup
  const modelSelect = document.getElementById("billModel");
  const mVal = (cust["Vehicle Model"] || "").trim().toUpperCase();
  if (modelSelect) {
    if (mVal && !Array.from(modelSelect.options).some(o => o.value === mVal)) modelSelect.add(new Option(mVal, mVal));
    modelSelect.value = mVal;
  }

  document.getElementById("billChassis").value = cust["Chassis Number"] || "";
  document.getElementById("billEngine").value = cust["Engine Number"] || "";
  
  ["billHsn","billRate","billAmount","billSgst","billCgst","billIgst","billTotal","billBattery","billBatterySerial","billCharger","billChargerSerial","billWarranty","billBankSelect"].forEach(id => {
    if(document.getElementById(id)) document.getElementById(id).value = "";
  });
  document.getElementById("billQnty").value = 1;
  document.getElementById("print-bill-btn").classList.add("hidden");
  document.getElementById("save-bill-btn").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Bill`;
  toggleBillViews('create');
};

// ================= COMPANY & MODEL ADD METHODS (নতুন) =================
window.promptAddNewCompany = function() {
  const compName = prompt("Enter New Vehicle Company Name:");
  if (compName && compName.trim() !== "") {
    const cleanName = compName.trim().toUpperCase();
    const sel = document.getElementById("billCompany");
    if(sel && !Array.from(sel.options).some(o => o.value === cleanName)) {
      sel.add(new Option(cleanName, cleanName));
    }
    if(sel) sel.value = cleanName;
    saveBillCatalog("companies", cleanName);
  }
};

window.promptAddNewModel = function() {
  const modelName = prompt("Enter New Vehicle Model Name:");
  if (modelName && modelName.trim() !== "") {
    const cleanName = modelName.trim().toUpperCase();
    const sel = document.getElementById("billModel");
    if(sel && !Array.from(sel.options).some(o => o.value === cleanName)) {
      sel.add(new Option(cleanName, cleanName));
    }
    if(sel) sel.value = cleanName;
    saveBillCatalog("models", cleanName);
  }
};

function saveBillCatalog(type, value) {
  const key = "daduBillCatalog_" + type;
  const values = JSON.parse(localStorage.getItem(key) || "[]");
  if (!values.includes(value)) values.push(value);
  localStorage.setItem(key, JSON.stringify(values));
}
function loadBillCatalog(type, id) {
  const sel = document.getElementById(id); if (!sel) return;
  JSON.parse(localStorage.getItem("daduBillCatalog_" + type) || "[]").forEach(v => { if (!Array.from(sel.options).some(o => o.value === v)) sel.add(new Option(v, v)); });
}
function editBillCatalog(type, id, label) {
  const sel = document.getElementById(id), old = sel?.value;
  if (!old) return alert("Please select a " + label + " first.");
  const value = prompt("Edit " + label + " name:", old); if (!value?.trim()) return;
  const clean = value.trim().toUpperCase(); const option = Array.from(sel.options).find(o => o.value === old);
  if (option) { option.value = clean; option.text = clean; } sel.value = clean;
  const values = JSON.parse(localStorage.getItem("daduBillCatalog_" + type) || "[]").filter(v => v !== old);
  if (!values.includes(clean)) values.push(clean); localStorage.setItem("daduBillCatalog_" + type, JSON.stringify(values));
}
function deleteBillCatalog(type, id, label) {
  const sel = document.getElementById(id), value = sel?.value;
  if (!value) return alert("Please select a " + label + " first.");
  if (!confirm("Delete this " + label + "?")) return;
  Array.from(sel.options).find(o => o.value === value)?.remove(); sel.value = "";
  localStorage.setItem("daduBillCatalog_" + type, JSON.stringify(JSON.parse(localStorage.getItem("daduBillCatalog_" + type) || "[]").filter(v => v !== value)));
}
window.editSelectedCompany = () => editBillCatalog("companies", "billCompany", "company");
window.deleteSelectedCompany = () => deleteBillCatalog("companies", "billCompany", "company");
window.editSelectedModel = () => editBillCatalog("models", "billModel", "model");
window.deleteSelectedModel = () => deleteBillCatalog("models", "billModel", "model");
window.initBillCatalogs = () => { loadBillCatalog("companies", "billCompany"); loadBillCatalog("models", "billModel"); };

// Bank Methods
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
     } else savedBankDetails[cleanName] = {ifsc:"", accName:"", accNo:"", branch:""};
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

window.saveBillToDatabase = async function() {
  const custId = document.getElementById("activeBillCustId").value;
  const billIdInput = document.getElementById("activeBillId");
  const existingBillId = billIdInput ? billIdInput.value : "";
  const totalAmount = document.getElementById("billTotal").value;

  if (!existingBillId) {
    const isDuplicate = billDataList.find(b => String(b["Customer ID"]).trim() === String(custId).trim() && parseFloat(String(b["Total Amount"]).replace(/[^0-9.-]+/g, "")) === parseFloat(totalAmount));
    if (isDuplicate) {
      alert("This bill is already saved! You can directly print it.");
      document.getElementById("invNo").innerText = isDuplicate["Bill ID"];
      document.getElementById("activeBillId").value = isDuplicate["Bill ID"];
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

  function formatDateForStorage(date = new Date()) { 
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return String(date.getDate()).padStart(2, '0') + ' ' + months[date.getMonth()] + ' ' + date.getFullYear(); 
  }

  const payload = {
    action: existingBillId ? "update_bill" : "save_bill", billId: existingBillId, custId: custId, 
    customerName: currentBillCustomerObj["Customer Name"], item: document.getElementById("billItem").value, 
    vehicleCompany: document.getElementById("billCompany").value, vehicleModel: document.getElementById("billModel").value,
    hsn: document.getElementById("billHsn").value, chassisNo: document.getElementById("billChassis").value, 
    engineNo: document.getElementById("billEngine").value, quantity: document.getElementById("billQnty").value, 
    rate: document.getElementById("billRate").value, amount: document.getElementById("billAmount").value, 
    sgst: document.getElementById("billSgst").value, cgst: document.getElementById("billCgst").value, 
    igst: document.getElementById("billIgst").value, totalAmount: parseAmount(totalAmount).toFixed(2),
    date: formatDateForStorage(), batteryDetails: document.getElementById("billBattery").value,
    batteryWarranty: document.getElementById("billWarranty").value, batterySerialNo: document.getElementById("billBatterySerial")?.value || "",
    charger: document.getElementById("billCharger")?.value || "", chargerSerialNo: document.getElementById("billChargerSerial")?.value || "", 
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
      const finalBillId = existingBillId || result.invoiceNo;
      alert(existingBillId ? "Bill Updated Successfully!" : "Bill saved! Invoice No: " + finalBillId);
      document.getElementById("invNo").innerText = finalBillId;
      document.getElementById("activeBillId").value = finalBillId;
      
      if (!existingBillId) {
        document.getElementById("print-bill-btn").classList.remove("hidden");
      } else {
        toggleBillViews('search'); 
      }

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
  
  // ✅ Company Options Setup for Edit
  const cVal = (bill["Vehicle Company"] || "").trim().toUpperCase();
  const compSelect = document.getElementById("billCompany");
  if(compSelect && cVal && !Array.from(compSelect.options).some(o => o.value === cVal)) compSelect.add(new Option(cVal, cVal));

  // ✅ Model Options Setup for Edit
  const mVal = (bill["Vehicle Model"] || "").trim().toUpperCase();
  const modelSelect = document.getElementById("billModel");
  if(modelSelect && mVal && !Array.from(modelSelect.options).some(o => o.value === mVal)) modelSelect.add(new Option(mVal, mVal));

  const fields = ["billItem","billCompany","billModel","billHsn","billChassis","billEngine","billQnty","billRate","billAmount","billSgst","billCgst","billIgst","billBattery","billWarranty","billBatterySerial","billCharger","billChargerSerial"];
  const dbFields = ["Item","Vehicle Company","Vehicle Model","HSN","Chassis No","Engine No","Quantity","Rate","Amount","SGST","CGST","IGST","Battery Details","Battery Warranty","Battery Serial No","Charger","Charger Serial No"];
  
  for(let i=0; i<fields.length; i++){
      if(document.getElementById(fields[i])) document.getElementById(fields[i]).value = bill[dbFields[i]] || "";
  }
  document.getElementById("billTotal").value = String(bill["Total Amount"]).replace(/[^0-9.-]+/g, "") || "";
  
  const bankSelect = document.getElementById("billBankSelect");
  const bName = bill["Bank Name"] || "";
  if (bName && !Array.from(bankSelect.options).some(o => o.value === bName)) bankSelect.add(new Option(bName, bName));
  bankSelect.value = bName;

  savedBankDetails[bName] = { ifsc: bill["Bank IFSC"] || "", accName: bill["Bank A/C Name"] || "", accNo: bill["Bank A/C No"] || "", branch: bill["Bank Branch"] || "" };
  document.getElementById("save-bill-btn").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update Bill`;
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

// ================= Print Helper Functions (একবারই ডিফাইন করা) =================
function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function convertNumberToWords(num) {
  if (isNaN(num) || Number(num) === 0) return "Zero Rupees";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function belowThousand(number) {
    let result = "";
    if (number >= 100) { result += ones[Math.floor(number / 100)] + " Hundred "; number %= 100; }
    if (number >= 20) { result += tens[Math.floor(number / 10)] + " "; number %= 10; }
    if (number > 0) result += ones[number] + " ";
    return result;
  }
  let number = Math.floor(Number(num)); let result = "";
  if (number >= 10000000) { result += belowThousand(Math.floor(number / 10000000)) + "Crore "; number %= 10000000; }
  if (number >= 100000) { result += belowThousand(Math.floor(number / 100000)) + "Lakh "; number %= 100000; }
  if (number >= 1000) { result += belowThousand(Math.floor(number / 1000)) + "Thousand "; number %= 1000; }
  if (number > 0) result += belowThousand(number);
  return result.trim() + " Rupees";
}

function setPrintDate(dateValue = "") {
  const dateElement = document.getElementById("invDate");
  if (!dateElement) return;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function formatNice(d) { return String(d.getDate()).padStart(2, "0") + " " + months[d.getMonth()] + " " + d.getFullYear(); }
  if (!dateValue) { dateElement.innerText = formatNice(new Date()); return; }
  const text = String(dateValue).trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) { dateElement.innerText = formatNice(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))); return; }
  m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) { dateElement.innerText = formatNice(new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))); return; }
  const monthNames = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  m = text.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})/);
  if (m && monthNames[m[2].toLowerCase()] !== undefined) { dateElement.innerText = formatNice(new Date(Number(m[3]), monthNames[m[2].toLowerCase()], Number(m[1]))); return; }
  dateElement.innerText = text;
}
function setInvoiceText(id, value) { const el = document.getElementById(id); if (el) el.innerText = value || ""; }
function getInvoiceValue(id) { return document.getElementById(id)?.value || ""; }

function createDynamicTaxHTML(amount, cgstRate, sgstRate, igstRate) {
  const cgstAmount = roundMoney(amount * cgstRate / 100);
  const sgstAmount = roundMoney(amount * sgstRate / 100);
  const igstAmount = roundMoney(amount * igstRate / 100);
  const totalGstAmount = roundMoney(cgstAmount + sgstAmount + igstAmount);
  let html = "";
  if (cgstRate > 0) html += `<div style="margin: 2px 0;">CGST @ ${cgstRate}%: ₹${cgstAmount.toFixed(2)}</div>`;
  if (sgstRate > 0) html += `<div style="margin: 2px 0;">SGST @ ${sgstRate}%: ₹${sgstAmount.toFixed(2)}</div>`;
  if (igstRate > 0) html += `<div style="margin: 2px 0;">IGST @ ${igstRate}%: ₹${igstAmount.toFixed(2)}</div>`;
  if (totalGstAmount > 0) html += `<div style="font-weight: bold; margin-top: 4px;">Total GST Amount: ₹${totalGstAmount.toFixed(2)}</div>`;
  return html;
}

function createInvoiceRow(data) {
  return `<tr><td><strong>${data.item}</strong><br><small>Company: ${data.company}</small><br><small>Model: ${data.model}</small><br><small>Chassis Number: ${data.chassis}</small><br><small>Motor Number: ${data.engine}</small></td><td style="text-align: center;">${data.hsn}</td><td style="text-align: center;">${data.quantity} PCS</td><td style="text-align: right;">₹${data.rate.toFixed(2)}</td><td style="text-align: right;">₹${data.amount.toFixed(2)}</td></tr>`;
}

function showInvoiceAndPrint() {
  const invoice = document.getElementById("printable-invoice-area");
  if (!invoice) return alert("Printable invoice template পাওয়া যায়নি।");
  invoice.classList.remove("hidden");
  invoice.style.display = "block";
  invoice.style.visibility = "visible";
  setTimeout(function() {
    window.print();
    setTimeout(() => {
      invoice.classList.add("hidden");
      invoice.style.display = "none";
    }, 100);
  }, 150);
}

window.printGeneratedBill = function () {
  const activeId = document.getElementById("activeBillId").value || document.getElementById("invNo").innerText;
  if (activeId && activeId.trim() !== "") {
    printExistingBill(activeId.trim());
    return;
  }
  alert("Please save the bill first before printing.");
};

window.printExistingBill = function (billId) {
  const cleanId = String(billId || "").trim();
  if (!cleanId) return alert("Invalid Bill ID.");

  const bill = billDataList.find(item => String(item["Bill ID"] || "").trim() === cleanId);
  if (!bill) return alert("Bill Data Not Found! Please Wait or Refresh.");

  const customer = customerDataList.find(item => String(item["ID"] || "").trim() === String(bill["Customer ID"] || "").trim());

  setPrintDate(bill["Date"]); 
  setInvoiceText("invNo", bill["Bill ID"]); 
  setInvoiceText("invCustName", bill["Customer Name"]);
  setInvoiceText("invMobile", customer?.["Mobile No"] || ""); 
  setInvoiceText("invAddress", customer?.["Address"] || "");
  
  const f = ["invCarItem","invCarCompany","invCarModel","invCarChassis","invCarMotor","invBattery","invBatterySerial","invCharger","invChargerSerial","invWarranty"];
  const b = ["Item","Vehicle Company","Vehicle Model","Chassis No","Engine No","Battery Details","Battery Serial No","Charger","Charger Serial No","Battery Warranty"];
  for(let i=0; i<f.length; i++) setInvoiceText(f[i], bill[b[i]] || "-");

  const amount = parseAmount(bill["Amount"]); 
  const quantity = parseFloat(bill["Quantity"]) || 0; 
  const rate = parseAmount(bill["Rate"]);
  
  const sgst = parseFloat(bill["SGST"]) || 0; 
  const cgst = parseFloat(bill["CGST"]) || 0; 
  const igst = parseFloat(bill["IGST"]) || 0;
  
  const totalGstAmount = roundMoney(roundMoney(amount * sgst / 100) + roundMoney(amount * cgst / 100) + roundMoney(amount * igst / 100));
  const total = roundMoney(amount + totalGstAmount);

  const tableBody = document.getElementById("invTableBody");
  if (tableBody) tableBody.innerHTML = createInvoiceRow({ item: bill["Item"] || "-", company: bill["Vehicle Company"] || "-", model: bill["Vehicle Model"] || "-", chassis: bill["Chassis No"] || "-", engine: bill["Engine No"] || "-", hsn: bill["HSN"] || "-", quantity, rate, amount });

  const taxBox = document.getElementById("taxBreakdownList");
  if (taxBox) taxBox.innerHTML = createDynamicTaxHTML(amount, cgst, sgst, igst);

  setInvoiceText("invSubtotal", amount.toFixed(2)); 
  setInvoiceText("invFinalTotal", total.toFixed(2)); 
  setInvoiceText("invTotalInWords", convertNumberToWords(total));
  setInvoiceText("invBankName", bill["Bank Name"] || ""); 
  setInvoiceText("invIfsc", bill["Bank IFSC"] || ""); 
  setInvoiceText("invAccNo", bill["Bank A/C No"] || ""); 
  setInvoiceText("invBranch", bill["Bank Branch"] || "");
  
  showInvoiceAndPrint();
};
