let customerCurrentPage = 1;
let customerFilteredRows = [];

window.filterCustomerView = function() {
  const title = document.getElementById("details-view-title");
  if(!title) return;
  
  let filtered = currentFilter !== "all" 
      ? customerDataList.filter(c => (c["Vehicle"] || "").trim() === currentFilter) 
      : customerDataList;
      
  title.innerText = currentFilter !== "all" ? `Customer Details - ${currentFilter}` : "Customer Details (All)";
  
  // লেটেস্ট এন্ট্রি প্রথমে দেখানোর জন্য (Reverse Order)
  customerCurrentPage = 1;
  renderCustomerTable([...filtered].reverse());
};

window.filterCustomerDetailsTable = function() {
  const query = document.getElementById("customerSearchInput").value.toLowerCase().trim();
  
  // বর্তমান ফিল্টার (Scooty, Bike, Cycle বা All) অনুযায়ী ডেটা নেওয়া হচ্ছে
  let filtered = currentFilter !== "all" 
      ? customerDataList.filter(c => (c["Vehicle"] || "").trim() === currentFilter) 
      : customerDataList;

  // নাম অথবা মোবাইল নাম্বার দিয়ে ফিল্টার করা হচ্ছে
  if (query !== "") {
    filtered = filtered.filter(c => {
      const name = String(c["Customer Name"] || "").toLowerCase();
      const mobile = String(c["Mobile No"] || "").toLowerCase();
      return name.includes(query) || mobile.includes(query);
    });
  }

  // রিভার্স অর্ডার ঠিক রেখে রেন্ডার করা হচ্ছে
  customerCurrentPage = 1;
  renderCustomerTable([...filtered].reverse());
};

window.renderCustomerTable = function(list) {
  const thead = document.getElementById("customer-table-head");
  const tbody = document.getElementById("customer-table-body");
  if (!tbody || !thead) return;
  customerFilteredRows = list;
  const limit = document.getElementById("customerPageSize")?.value || "10";
  const pageSize = limit === "all" ? Math.max(list.length, 1) : Number(limit);
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  customerCurrentPage = Math.min(customerCurrentPage, pageCount);
  const startIndex = (customerCurrentPage - 1) * pageSize;
  list = list.slice(startIndex, startIndex + pageSize);
  const pagination = document.getElementById("customer-pagination");
  const rangeStart = list.length ? startIndex + 1 : 0;
  const rangeEnd = list.length ? startIndex + list.length : 0;
  if (pagination) pagination.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;border:1px solid #dbe3ee;border-radius:10px;background:#f8fafc;color:#526783;"><label style="display:flex;align-items:center;gap:10px;">Customers per page <select id="customerPageSize" onchange="changeCustomerPageSize(this.value)" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;"><option value="10" ${limit === "10" ? "selected" : ""}>10</option><option value="25" ${limit === "25" ? "selected" : ""}>25</option><option value="50" ${limit === "50" ? "selected" : ""}>50</option><option value="100" ${limit === "100" ? "selected" : ""}>100</option><option value="all" ${limit === "all" ? "selected" : ""}>All</option></select></label><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span>Showing ${rangeStart}–${rangeEnd} of ${customerFilteredRows.length}</span><button type="button" class="btn-secondary" onclick="changeCustomerPage(-1)" ${customerCurrentPage <= 1 ? "disabled" : ""}>Previous</button><button type="button" class="btn-secondary" onclick="changeCustomerPage(1)" ${customerCurrentPage >= pageCount ? "disabled" : ""}>Next</button></div></div>`;
  
  thead.innerHTML = `<tr><th>Photo</th><th>Name</th><th>Mobile</th><th>Vehicle</th><th>Company</th><th>Model</th><th>Actions</th></tr>`;
  tbody.innerHTML = "";
  
  if(list.length === 0) { 
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No customers found.</td></tr>`; 
    return; 
  }

  const billsByCustomerId = new Map();
  (billDataList || []).forEach(bill => {
    const customerId = String(bill["Customer ID"] || "").trim();
    if (customerId) billsByCustomerId.set(customerId, bill);
  });
  
  list.forEach(cust => {
    const tr = document.createElement("tr");
    const directPhotoUrl = getDirectDriveUrl(cust["Photo URL"]);
    const photoHtml = directPhotoUrl 
        ? `<a href="${directPhotoUrl}" target="_blank"><img src="${directPhotoUrl}" class="cust-photo-img" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;"></a>` 
        : `<i class="fa-solid fa-user-circle fa-2x" style="color: #cbd5e1;"></i>`;

    // 1. "Bills" ডাটাবেস থেকে কাস্টমারের বিল খোঁজা হচ্ছে
    const latestBill = billsByCustomerId.get(String(cust["ID"] || "").trim());
    
    // 2. পেন্ডিং ব্যাজ ডিজাইন
    const pendingBadge = `<span style="color: #d97706; font-size: 11px; font-weight: 700; background: #fef3c7; padding: 3px 6px; border-radius: 4px; display: inline-block; white-space: nowrap;">Pending Generate Bill</span>`;
    
    let compText = pendingBadge;
    let modelText = pendingBadge;

    // 3. যদি Bills পেজে ডেটা থাকে, তবে সেখান থেকে Company এবং Model টেনে আনা হবে
    if (latestBill) {
      
      compText = String(latestBill["Vehicle Company"] || "").trim();
      modelText = String(latestBill["Vehicle Model"] || "").trim();
      
      // বিল থাকলেও যদি ফাঁকা থাকে, তবে হাইফেন (-) দেখাবে
      if(!compText || compText === "") compText = "-";
      if(!modelText || modelText === "") modelText = "-";
    }

    tr.innerHTML = `
      <td>${photoHtml}</td>
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td>${compText}</td>
      <td>${modelText}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editCustomer('${cust["ID"]}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-delete" onclick="deleteCustomer('${cust["ID"]}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
};

window.changeCustomerPage = function(delta) {
  customerCurrentPage += delta;
  renderCustomerTable(customerFilteredRows);
};

window.changeCustomerPageSize = function(value) {
  let filtered = currentFilter !== "all" ? customerDataList.filter(c => (c["Vehicle"] || "").trim() === currentFilter) : customerDataList;
  const query = document.getElementById("customerSearchInput")?.value.toLowerCase().trim() || "";
  if (query) filtered = filtered.filter(c => String(c["Customer Name"] || "").toLowerCase().includes(query) || String(c["Mobile No"] || "").toLowerCase().includes(query));
  const reversed = [...filtered].reverse();
  customerCurrentPage = 1;
  renderCustomerTable(reversed);
};

window.editCustomer = function(id) {
  const cust = customerDataList.find(c => c["ID"] == id);
  if (!cust) return;
  
  loadPage('Customer/customer-entry.html', 'customerEntry').then(() => {
    // 1. ফর্মে ডেটা বসানো
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
    if (document.getElementById("district")) document.getElementById("district").value = cust["District"] || "";
    if (document.getElementById("state")) document.getElementById("state").value = cust["State"] || "West Bengal";
    if (document.getElementById("pin")) document.getElementById("pin").value = cust["PIN Code"] || cust["PIN"] || "";
    document.getElementById("vehicleSelect").value = cust["Vehicle"] || "";
    
    if(document.getElementById("chassisNo")) document.getElementById("chassisNo").value = cust["Chassis Number"] || "";
    if(document.getElementById("engineNo")) document.getElementById("engineNo").value = cust["Engine Number"] || "";
    
    const occSelect = document.getElementById("occupationSelect");
    const occVal = cust["Occupation"] || "";
    if(occVal && occSelect && !Array.from(occSelect.options).some(o => o.value === occVal)) {
        occSelect.add(new Option(occVal, occVal));
    }
    if(occSelect) occSelect.value = occVal;

    const photoPreview = document.getElementById("photoPreview");
    const directPhotoUrl = getDirectDriveUrl(cust["Photo URL"]);
    if (directPhotoUrl && photoPreview) {
      photoPreview.src = directPhotoUrl; 
      photoPreview.classList.remove("hidden-preview");
    } else if(photoPreview) {
      photoPreview.classList.add("hidden-preview"); 
      photoPreview.src = "";
    }

    // 2. হেডিং এবং সাবমিট বাটনের নাম পরিবর্তন করা
    const formTitle = document.getElementById("form-title");
    if (formTitle) formTitle.innerText = "Edit Customer Details";

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.innerText = "Update";
      submitBtn.style.backgroundColor = "#eab308"; // হলুদ কালার
      submitBtn.style.color = "#000"; // কালো টেক্সট
    }

    const cancelBtn = document.getElementById("cancel-btn");
    if (cancelBtn) cancelBtn.classList.remove("hidden");
  });
};
window.deleteCustomer = async function(id) {
  if (!confirm("Are you sure you want to delete this customer?")) return;
  try {
    const res = await apiFetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete", id: id }) });
    const result = await res.json();
    if (result.status === "success") {
      showToast("Customer deleted successfully!");
      await loadCustomers(true);
      await loadPage("Customer/customer-details.html", "customerDetails", currentFilter || "all");
    } else alert("Failed to delete customer.");
  } catch (err) { alert("Delete failed: " + err.message); }
};
