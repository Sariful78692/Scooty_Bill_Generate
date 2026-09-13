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

window.generateReport = function() {
  const fromInput = document.getElementById("reportFromDate");
  const toInput = document.getElementById("reportToDate");
  const from = fromInput?.value; 
  const to = toInput?.value || from;
  if (!from) return;

  const startDate = new Date(from + "T00:00:00");
  const endDate = new Date(to + "T23:59:59");
  if (startDate > endDate) { alert("From date cannot be after To date."); return; }

  const searchQuery = (document.getElementById("reportSearchText")?.value || "").trim().toLowerCase();

  let filteredAll = billDataList.filter(b => {
    const d = parseCustomDate(String(b["Date"] || ""));
    return d && !isNaN(d) && d >= startDate && d <= endDate;
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
  
  const limit = document.getElementById("reportPageSize")?.value || "all";
  const filteredBills = limit === "all" ? filteredAll : filteredAll.slice(0, Number(limit));
  
  const tbody = document.getElementById("report-table-body"); 
  if (!tbody) return; 
  tbody.innerHTML = "";
  
  if (!filteredBills.length) { 
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No sales found for this date range.</td></tr>`; 
    return; 
  }
  
  filteredBills.forEach(bill => {
    const tr = document.createElement("tr"); 
    const amt = parseAmount(bill["Total Amount"]);
    tr.innerHTML = `
      <td><strong>${bill["Bill ID"]}</strong></td>
      <td>${safeDisplay(bill["Customer Name"])}</td>
      <td><span class="badge">${safeDisplay(bill["Item"])}</span><br><small>${safeDisplay(bill["Vehicle Company"])}</small></td>
      <td>${safeDisplay(bill["Vehicle Model"])}</td>
      <td>₹${amt.toFixed(2)}</td>
      <td>
        <button class="btn-print" style="padding: 6px 10px; font-size: 12px;" onclick="printExistingBill('${bill["Bill ID"]}')"><i class="fa-solid fa-print"></i></button>
        <button class="btn-delete" style="padding: 6px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteGeneratedBill('${bill["Bill ID"]}')"><i class="fa-solid fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
};