window.initReportPage = function() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  
  if(document.getElementById("reportFromDate")) document.getElementById("reportFromDate").value = `${yyyy}-${mm}-${dd}`;
  if(document.getElementById("reportToDate")) document.getElementById("reportToDate").value = `${yyyy}-${mm}-${dd}`;
  
  generateReport();
  const searchBtn = document.getElementById("reportSearchButton");
  if(searchBtn) searchBtn.addEventListener("click", window.searchReport);
};

window.safeDisplay = function(value) { return String(value ?? '').replace(/safina/gi, '').replace(/\s{2,}/g, ' ').trim(); };

window.searchReport = function() { generateReport(); return false; };

let reportCurrentPage = 1;
let reportFilteredBills = [];

window.generateReport = function(resetPage = true) {
  const fromInput = document.getElementById("reportFromDate");
  const toInput = document.getElementById("reportToDate");
  const from = fromInput?.value; 
  const to = toInput?.value || from;
  if (!from) return;

  const startDate = new Date(from + "T00:00:00");
  const endDate = new Date(to + "T23:59:59");
  if (startDate > endDate) { alert("From date cannot be after To date."); return; }

  const searchQuery = (document.getElementById("reportSearchText")?.value || "").trim().toLowerCase();
  const branchFilterGroup = document.getElementById("reportBranchFilterGroup");
  const branchFilter = document.getElementById("reportBranchFilter");
  const isMainBranch = String(currentBranch).trim().toLowerCase() === "main branch";
  if (branchFilterGroup) branchFilterGroup.style.display = isMainBranch ? "block" : "none";
  const branchOptionsKey = (availableBranches || []).join("|");
  if (isMainBranch && branchFilter && branchFilter.dataset.branches !== branchOptionsKey) {
    const previousValue = branchFilter.value || "all";
    branchFilter.innerHTML = `<option value="all">All Branches</option>` + (availableBranches || []).map(branch => `<option value="${escapeHtml(branch)}">${escapeHtml(branch)}</option>`).join("");
    branchFilter.value = [...branchFilter.options].some(option => option.value === previousValue) ? previousValue : "all";
    branchFilter.dataset.branches = branchOptionsKey;
  }
  const selectedBranch = isMainBranch ? (branchFilter?.value || "all") : currentBranch;

  let filteredAll = billDataList.filter(b => {
    const d = parseCustomDate(String(b["Date"] || ""));
    const matchesBranch = selectedBranch === "all" || String(b["Branch"] || "Main Branch").trim().toLowerCase() === selectedBranch.trim().toLowerCase();
    return matchesBranch && d && !isNaN(d) && d >= startDate && d <= endDate;
  });

  // ✅ নতুন: সর্বশেষ বিল সবার উপরে দেখানোর জন্য রিভার্স
filteredAll = filteredAll.reverse();

  // ✅ নতুন: Name/Mobile সার্চ ফিল্টার
  if (searchQuery) {
    filteredAll = filteredAll.filter(b => {
      const cust = customerDataList.find(c => String(c["ID"]).trim() === String(b["Customer ID"]).trim());
      const nameMatch = String(b["Customer Name"] || "").toLowerCase().includes(searchQuery);
      const mobileMatch = String(cust?.["Mobile No"] || "").toLowerCase().includes(searchQuery);
      return nameMatch || mobileMatch;
    });
  }

  const total = filteredAll.reduce((sum, bill) => sum + parseAmount(bill["Total Amount"]), 0);
  if(document.getElementById("reportTotalSales")) document.getElementById("reportTotalSales").innerText = total.toFixed(2);
  
  if (resetPage) reportCurrentPage = 1;
  const limit = document.getElementById("reportPageSize")?.value || "10";
  reportFilteredBills = filteredAll;
  const pageSize = limit === "all" ? Math.max(filteredAll.length, 1) : Number(limit);
  const pageCount = Math.max(1, Math.ceil(filteredAll.length / pageSize));
  reportCurrentPage = Math.min(reportCurrentPage, pageCount);
  const filteredBills = filteredAll.slice((reportCurrentPage - 1) * pageSize, reportCurrentPage * pageSize);
  const pagination = document.getElementById("report-pagination");
  if (pagination) pagination.innerHTML = `<span>Page ${reportCurrentPage} of ${pageCount}</span><button type="button" class="btn-primary" onclick="changeReportPage(-1)" ${reportCurrentPage <= 1 ? "disabled" : ""}>Previous</button><button type="button" class="btn-primary" onclick="changeReportPage(1)" ${reportCurrentPage >= pageCount ? "disabled" : ""}>Next</button>`;
  
  const tbody = document.getElementById("report-table-body"); 
  if (!tbody) return; 
  tbody.innerHTML = "";
  
  if (!filteredBills.length) { 
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No sales found for this date range.</td></tr>`;
    return; 
  }
  
  filteredBills.forEach(bill => {
    const tr = document.createElement("tr"); 
    const amt = parseAmount(bill["Total Amount"]);
    const billId = String(bill["Bill ID"] || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const actions = `<button class="btn-print" style="padding: 6px 10px; font-size: 12px;" onclick="printExistingBill('${billId}')"><i class="fa-solid fa-print"></i></button>${isMainBranch ? ` <button class="btn-edit" style="padding: 6px 10px; font-size: 12px; margin-left: 5px;" onclick="editGeneratedBill('${billId}')"><i class="fa-solid fa-pen"></i></button> <button class="btn-delete" style="padding: 6px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteGeneratedBill('${billId}')"><i class="fa-solid fa-trash"></i></button>` : ""}`;
    tr.innerHTML = `
      <td><strong>${bill["Bill ID"]}</strong></td>
      <td>${safeDisplay(bill["Branch"] || "Main Branch")}</td>
      <td>${safeDisplay(bill["Customer Name"])}</td>
      <td><span class="badge">${safeDisplay(bill["Item"])}</span><br><small>${safeDisplay(bill["Vehicle Company"])}</small></td>
      <td>${safeDisplay(bill["Vehicle Model"])}</td>
      <td>₹${amt.toFixed(2)}</td>
      <td>${actions}</td>`;
    tbody.appendChild(tr);
  });
};

window.changeReportPage = function(delta) {
  reportCurrentPage += delta;
  generateReport(false);
};
