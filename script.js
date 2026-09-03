// Paste your deployed Google Apps Script Web App URL here
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwL-sMRsWJuU7MvItAq-F9-hrh_ysWsCfWCF9w2VJdxBwyiIWcstPwalI3T4_6gUshWMQ/exec";

let customerDataList = [];
let currentBillCustomerObj = null;
let savedBankDetails = {}; // ব্যাঙ্ক ডিটেইলস পপআপের ডাটা স্টোর করার জন্য

document.addEventListener("DOMContentLoaded", function () {
  const submenuToggles = document.querySelectorAll(".submenu-toggle");
  submenuToggles.forEach((toggle) => {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      this.parentElement.classList.toggle("open");
    });
  });

  const photoInput = document.getElementById("photoInput");
  const photoPreview = document.getElementById("photoPreview");

  if(photoInput) {
    photoInput.addEventListener("change", function () {
      const file = this.files[0];
      if (file) {
        if (file.size > 50 * 1024) {
          alert("Photo size must be 50 KB or less!");
          this.value = "";
          photoPreview.classList.add("hidden-preview");
          photoPreview.src = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
          photoPreview.src = e.target.result;
          photoPreview.classList.remove("hidden-preview");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const form = document.getElementById("customer-form");
  if(form) form.addEventListener("submit", handleCustomerFormSubmit);

  loadCustomers();
});

function showSection(sectionId) {
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((sec) => sec.classList.add("hidden"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden");
  
  if (sectionId === "bill-generate-section") {
    renderBillCustomerTable(customerDataList);
  }
}

function openCustomerEntry() {
  resetForm();
  showSection("customer-entry-section");
}

function promptAddNewOccupation() {
  const newOcc = prompt("Enter new Occupation:");
  if (newOcc && newOcc.trim() !== "") {
    const cleanOcc = newOcc.trim();
    const select = document.getElementById("occupationSelect");
    select.appendChild(new Option(cleanOcc, cleanOcc));
    select.value = cleanOcc;
  }
}

function resetForm() {
  const form = document.getElementById("customer-form");
  if(form) form.reset();
  document.getElementById("edit-customer-id").value = "";
  document.getElementById("existing-photo-url").value = "";
  document.getElementById("form-title").innerText = "Customer Entry Form";
  document.getElementById("submit-btn").innerText = "Save Customer";
  document.getElementById("cancel-btn").classList.add("hidden");
  document.getElementById("photoPreview").classList.add("hidden-preview");
}

function cancelEdit() {
  resetForm();
  showSection("customer-details-section");
}

function filterCustomerView(filterType, filterValue) {
  showSection("customer-details-section");
  const title = document.getElementById("details-view-title");
  let filtered = filterType === "vehicle" ? customerDataList.filter(c => (c["Vehicle"] || "").trim() === filterValue.trim()) : customerDataList;
  title.innerText = filterType === "vehicle" ? `Customer Details - ${filterValue}` : "Customer Details (All)";
  renderCustomerTable(filtered);
}

async function handleCustomerFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.innerText = "Saving...";

  const editId = document.getElementById("edit-customer-id").value;
  const existingPhoto = document.getElementById("existing-photo-url").value;
  const photoFileInput = document.getElementById("photoInput");

  let photoBase64 = "", photoName = "", photoMimeType = "";
  if (photoFileInput.files && photoFileInput.files[0]) {
    const file = photoFileInput.files[0];
    photoName = file.name; photoMimeType = file.type;
    photoBase64 = await convertFileToBase64(file);
  }

  const payload = {
    action: editId ? "update" : "create",
    id: editId || null,
    customerName: document.getElementById("customerName").value.trim(),
    guardianName: document.getElementById("guardianName").value.trim(),
    gender: document.getElementById("gender").value,
    dob: document.getElementById("dob").value,
    religion: document.getElementById("religion").value.trim(),
    aadhaarNo: document.getElementById("aadhaarNo").value.trim(),
    mobileNo: document.getElementById("mobileNo").value.trim(),
    address: document.getElementById("address").value.trim(),
    vehicle: document.getElementById("vehicleSelect").value,
    chassisNo: document.getElementById("chassisNo").value.trim(),
    engineNo: document.getElementById("engineNo").value.trim(),
    occupation: document.getElementById("occupationSelect").value,
    existingPhotoUrl: existingPhoto,
    photoBase64, photoName, photoMimeType
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.status === "success") {
      alert(editId ? "Customer updated successfully!" : "Customer saved successfully!");
      resetForm();
      await loadCustomers(true); 
      showSection("customer-details-section");
    } else {
      alert("Error: " + result.message);
    }
  } catch (err) {
    alert("Submission failed.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = editId ? "Update Customer" : "Save Customer";
  }
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

async function loadCustomers(forceReload = false) {
  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    customerDataList = data.customers || [];
    renderCustomerTable(customerDataList);
    updateDashboardCounts();
  } catch (err) {
    console.error("Failed to load data.");
  }
}

function updateDashboardCounts() {
  let scooty = 0, bike = 0, cycle = 0;
  customerDataList.forEach(c => {
    let v = (c["Vehicle"] || "").trim();
    if (v === "Scooty") scooty++;
    if (v === "Bike") bike++;
    if (v === "Cycle") cycle++;
  });
  document.getElementById("count-total").innerText = customerDataList.length;
  document.getElementById("count-scooty").innerText = scooty;
  document.getElementById("count-bike").innerText = bike;
  document.getElementById("count-cycle").innerText = cycle;
}

function renderCustomerTable(list) {
  const thead = document.getElementById("customer-table-head");
  const tbody = document.getElementById("customer-table-body");
  if (!tbody || !thead) return;

  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Mobile</th>
      <th>Address</th>
      <th>Vehicle</th>
      <th>Chassis No</th>
      <th>Engine No</th>
      <th>Occupation</th>
      <th>Actions</th>
    </tr>
  `;

  tbody.innerHTML = "";
  list.forEach((cust) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td>${cust["Address"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td>${cust["Chassis Number"] || "-"}</td>
      <td>${cust["Engine Number"] || "-"}</td>
      <td>${cust["Occupation"] || ""}</td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" title="Edit" onclick="editCustomer('${cust["ID"]}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-delete" title="Delete" onclick="deleteCustomer('${cust["ID"]}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Bill Generation & Search Logic --- //
function renderBillCustomerTable(list) {
  const tbody = document.getElementById("bill-customer-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  list.forEach(cust => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cust["Customer Name"] || ""}</strong></td>
      <td>${cust["Mobile No"] || ""}</td>
      <td><span class="badge">${cust["Vehicle"] || ""}</span></td>
      <td><button class="btn-primary" onclick="openBillCreatePage('${cust["ID"]}')"><i class="fa-solid fa-file-invoice"></i> Generate Bill</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterBillCustomers() {
  const query = document.getElementById("billSearchInput").value.toLowerCase();
  const filtered = customerDataList.filter(c => 
    (c["Customer Name"] || "").toLowerCase().includes(query) || 
    (c["Mobile No"] || "").toLowerCase().includes(query)
  );
  renderBillCustomerTable(filtered);
}

function openBillCreatePage(custId) {
  const cust = customerDataList.find(c => String(c["ID"]) === String(custId));
  if (!cust) return;
  currentBillCustomerObj = cust;

  document.getElementById("activeBillCustId").value = cust["ID"];
  document.getElementById("billCustomerNameTitle").innerText = cust["Customer Name"] + " (" + (cust["Vehicle"] || "") + ")";
  document.getElementById("billChassis").value = cust["Chassis Number"] || "";
  document.getElementById("billEngine").value = cust["Engine Number"] || "";
  
  document.getElementById("billItem").value = cust["Vehicle"] || "";
  document.getElementById("billHsn").value = "";
  document.getElementById("billQnty").value = 1;
  document.getElementById("billRate").value = "";
  document.getElementById("billAmount").value = "";
  document.getElementById("billSgst").value = "";
  document.getElementById("billCgst").value = "";
  document.getElementById("billIgst").value = "";
  document.getElementById("billTotal").value = "";
  document.getElementById("billBattery").value = "";
  document.getElementById("billWarranty").value = "";
  document.getElementById("billBankSelect").value = "";

  // নতুন বিল পেজ ওপেন হলে প্রিন্ট বাটন হাইড থাকবে
  document.getElementById("print-bill-btn").classList.add("hidden");

  showSection("bill-create-page");
}

function calculateBillAmounts() {
  const qnty = parseFloat(document.getElementById("billQnty").value) || 0;
  const rate = parseFloat(document.getElementById("billRate").value) || 0;
  const amount = qnty * rate;
  document.getElementById("billAmount").value = amount;

  const sgst = parseFloat(document.getElementById("billSgst").value) || 0;
  const cgst = parseFloat(document.getElementById("billCgst").value) || 0;
  const igst = parseFloat(document.getElementById("billIgst").value) || 0;

  const total = amount + (amount * (sgst + cgst + igst) / 100);
  document.getElementById("billTotal").value = total.toFixed(2);
}

// --- Dynamic Bank Add & Popup Logic --- //
function promptAddNewBank() {
  const bankName = prompt("Enter new Bank Name:");
  if (bankName && bankName.trim() !== "") {
    const cleanName = bankName.trim();
    const select = document.getElementById("billBankSelect");
    if (!Array.from(select.options).some(o => o.value === cleanName)) {
      select.add(new Option(cleanName, cleanName));
    }
    select.value = cleanName;
    handleBankSelection(select);
  }
}

function handleBankSelection(selectElem) {
  const bankName = selectElem.value;
  if (bankName !== "") {
    document.getElementById("bankModalTitle").innerText = "Bank Details (" + bankName + ")";
    if (savedBankDetails[bankName]) {
      document.getElementById("bankIfsc").value = savedBankDetails[bankName].ifsc || "";
      document.getElementById("bankAccName").value = savedBankDetails[bankName].accName || "";
      document.getElementById("bankAccNo").value = savedBankDetails[bankName].accNo || "";
      document.getElementById("bankBranch").value = savedBankDetails[bankName].branch || "";
    } else {
      document.getElementById("bankIfsc").value = "";
      document.getElementById("bankAccName").value = "";
      document.getElementById("bankAccNo").value = "";
      document.getElementById("bankBranch").value = "";
    }
    document.getElementById("bank-modal").classList.remove("hidden");
  }
}

function closeBankModal() {
  const bankName = document.getElementById("billBankSelect").value;
  if (bankName) {
    savedBankDetails[bankName] = {
      ifsc: document.getElementById("bankIfsc").value,
      accName: document.getElementById("bankAccName").value,
      accNo: document.getElementById("bankAccNo").value,
      branch: document.getElementById("bankBranch").value
    };
  }
  document.getElementById("bank-modal").classList.add("hidden");
}

function preventRefreshInput(inputElem) {
  inputElem.value = inputElem.value;
}

// --- Save Bill to Database & Show Print Button --- //
async function saveBillToDatabase() {
  const custId = document.getElementById("activeBillCustId").value;
  const custName = currentBillCustomerObj ? currentBillCustomerObj["Customer Name"] : "";

  const payload = {
    action: "save_bill",
    custId: custId,
    customerName: custName,
    item: document.getElementById("billItem").value,
    hsn: document.getElementById("billHsn").value,
    chassisNo: document.getElementById("billChassis").value,
    engineNo: document.getElementById("billEngine").value,
    quantity: document.getElementById("billQnty").value,
    rate: document.getElementById("billRate").value,
    amount: document.getElementById("billAmount").value,
    sgst: document.getElementById("billSgst").value,
    cgst: document.getElementById("billCgst").value,
    igst: document.getElementById("billIgst").value,
    totalAmount: document.getElementById("billTotal").value,
    batteryDetails: document.getElementById("billBattery").value,
    batteryWarranty: document.getElementById("billWarranty").value,
    bankName: document.getElementById("billBankSelect").value
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    const result = await res.json();
    if (result.status === "success") {
      alert("Bill saved successfully to Database!");
      // ডাটাবেসে সেভ হওয়ার পরেই কেবল প্রিন্ট বাটন দৃশ্যমান হবে
      document.getElementById("print-bill-btn").classList.remove("hidden");
    } else {
      alert("Failed to save bill.");
    }
  } catch (err) {
    alert("Error connecting to server.");
  }
}

// --- Print Bill Invoice Matching Image Layout --- //
// সংখ্যাকে কথায় (In Words - Indian Numbering System) রূপান্তর করার ফাংশন
function convertNumberToWords(num) {
  if (isNaN(num) || num === 0) return "Zero Rupees";
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function getWords(n) {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? getWords(n % 100) : '');
    return '';
  }

  let n = Math.floor(num);
  let str = '';

  if (n >= 10000000) {
    str += getWords(Math.floor(n / 10000000)) + 'Crore ';
    n %= 10000000;
  }
  if (n >= 100000) {
    str += getWords(Math.floor(n / 100000)) + 'Lakh ';
    n %= 100000;
  }
  if (n >= 1000) {
    str += getWords(Math.floor(n / 1000)) + 'Thousand ';
    n %= 1000;
  }
  if (n >= 100) {
    str += getWords(Math.floor(n / 100)) + 'Hundred ';
    n %= 100;
  }
  if (n > 0) {
    str += getWords(n);
  }

  return str.trim() + ' Rupees';
}

// Print Bill Invoice matching the updated layout
function printBillInvoice() {
  if (!currentBillCustomerObj) return;

  // বর্তমান তারিখ DD-MM-YYYY ফরম্যাটে জেনারেট করা
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const formattedCurrentDate = day + "-" + month + "-" + year;

  document.getElementById("invDate").innerText = formattedCurrentDate;
  document.getElementById("invCustName").innerText = currentBillCustomerObj["Customer Name"] || "";
  document.getElementById("invMobile").innerText = currentBillCustomerObj["Mobile No"] || "";
  document.getElementById("invAddress").innerText = currentBillCustomerObj["Address"] || "";

  const item = document.getElementById("billItem").value;
  const hsn = document.getElementById("billHsn").value;
  const qnty = document.getElementById("billQnty").value;
  const rate = document.getElementById("billRate").value;
  const amount = parseFloat(document.getElementById("billAmount").value) || 0;
  const chassis = document.getElementById("billChassis").value;
  const engine = document.getElementById("billEngine").value;
  const battery = document.getElementById("billBattery").value;
  const warranty = document.getElementById("billWarranty").value;
  const total = parseFloat(document.getElementById("billTotal").value) || 0;
  
  const sgstRate = parseFloat(document.getElementById("billSgst").value) || 0;
  const cgstRate = parseFloat(document.getElementById("billCgst").value) || 0;
  const igstRate = parseFloat(document.getElementById("billIgst").value) || 0;

  let tableHtml = `
    <tr>
      <td><strong>${item}</strong><br><small>CH NO- ${chassis}</small><br><small>MOT NO: ${engine}</small></td>
      <td>${hsn}</td>
      <td>${qnty} PCS</td>
      <td>₹${rate}</td>
      <td>₹${amount.toFixed(2)}</td>
    </tr>
  `;

  if (battery) {
    tableHtml += `
      <tr>
        <td><strong>${battery}</strong><br><small>(${warranty})</small></td>
        <td>-</td>
        <td>${qnty} PCS</td>
        <td>-</td>
        <td>-</td>
      </tr>
    `;
  }

  document.getElementById("invTableBody").innerHTML = tableHtml;

  let taxHtml = "";
  if (sgstRate > 0) {
    let sgstVal = (amount * sgstRate) / 100;
    taxHtml += `<div>SGST @ ${sgstRate}%: ₹${sgstVal.toFixed(2)}</div>`;
  }
  if (cgstRate > 0) {
    let cgstVal = (amount * cgstRate) / 100;
    taxHtml += `<div>CGST @ ${cgstRate}%: ₹${cgstVal.toFixed(2)}</div>`;
  }
  if (igstRate > 0) {
    let igstVal = (amount * igstRate) / 100;
    taxHtml += `<div>IGST @ ${igstRate}%: ₹${igstVal.toFixed(2)}</div>`;
  }
  document.getElementById("taxBreakdownList").innerHTML = taxHtml;

  document.getElementById("invFinalTotal").innerText = total.toFixed(2);
  document.getElementById("invTotalInWords").innerText = convertNumberToWords(total);

  const bankName = document.getElementById("billBankSelect").value;
  if (bankName && savedBankDetails[bankName]) {
    document.getElementById("invBankName").innerText = bankName;
    document.getElementById("invIfsc").innerText = savedBankDetails[bankName].ifsc;
    document.getElementById("invAccNo").innerText = savedBankDetails[bankName].accNo;
    document.getElementById("invBranch").innerText = savedBankDetails[bankName].branch;
  }

  window.print();
}

function editCustomer(id) {
  const cust = customerDataList.find(c => c["ID"] == id);
  if (!cust) return;
  document.getElementById("edit-customer-id").value = cust["ID"];
  document.getElementById("existing-photo-url").value = cust["Photo URL"] || "";
  document.getElementById("customerName").value = cust["Customer Name"] || "";
  document.getElementById("guardianName").value = cust["Guardian Name"] || "";
  document.getElementById("gender").value = cust["Gender"] || "";
  document.getElementById("dob").value = cust["DOB"] ? cust["DOB"].substring(0, 10) : "";
  document.getElementById("religion").value = cust["Religion"] || "";
  document.getElementById("aadhaarNo").value = cust["Aadhaar No"] || "";
  document.getElementById("mobileNo").value = cust["Mobile No"] || "";
  document.getElementById("address").value = cust["Address"] || "";
  document.getElementById("vehicleSelect").value = cust["Vehicle"] || "";
  document.getElementById("chassisNo").value = cust["Chassis Number"] || "";
  document.getElementById("engineNo").value = cust["Engine Number"] || "";
  document.getElementById("occupationSelect").value = cust["Occupation"] || "";

  document.getElementById("cancel-btn").classList.remove("hidden");
  document.getElementById("form-title").innerText = "Edit Customer Details";
  document.getElementById("submit-btn").innerText = "Update Customer";
  showSection("customer-entry-section");
}

async function deleteCustomer(id) {
  if (!confirm("Are you sure you want to delete this customer?")) return;
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete", id }) });
    const result = await res.json();
    if (result.status === "success") { alert("Deleted successfully!"); loadCustomers(true); } 
    else alert("Failed to delete.");
  } catch (err) { alert("Delete failed."); }
}