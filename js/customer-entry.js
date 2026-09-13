window.initCustomerEntryForm = function() {
  const form = document.getElementById("customer-form");
  if(form) form.addEventListener("submit", handleCustomerFormSubmit);
  const photoInput = document.getElementById("photoInput");
  if (photoInput) photoInput.addEventListener("change", function () {
    if (this.files[0] && this.files[0].size > 1024 * 1024) {
      showToast("Please upload below 1 MB");
      this.value = "";
    }
  });
};

window.resetForm = function() {
  const form = document.getElementById("customer-form");
  if(form) form.reset();
  
  document.getElementById("edit-customer-id").value = "";
  document.getElementById("existing-photo-url").value = "";
  
  // আগের অবস্থায় ফিরিয়ে আনা
  const formTitle = document.getElementById("form-title");
  if(formTitle) formTitle.innerText = "Customer Entry Form";
  
  const submitBtn = document.getElementById("submit-btn");
  if(submitBtn) { 
      submitBtn.innerText = "Submit"; 
      submitBtn.style.backgroundColor = ""; 
      submitBtn.style.color = ""; 
  }
  
  const cBtn = document.getElementById("cancel-btn");
  if(cBtn) cBtn.classList.add("hidden");
  
  const pp = document.getElementById("photoPreview");
  if(pp) { 
      pp.classList.add("hidden-preview"); 
      pp.src = ""; 
  }
};

window.cancelEdit = function() {
  resetForm(); loadPage('Customer/customer-details.html', 'customerDetails', 'all');
};

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
};

async function compressImage(file) {
  if (!file.type.startsWith("image/") || file.size < 100000) return file;
  const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 1200 / image.width); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.75));
}

window.handleCustomerFormSubmit = async function(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  const editId = document.getElementById("edit-customer-id").value;

  const nameVal = document.getElementById("customerName")?.value.trim() || "";
  const mobileVal = document.getElementById("mobileNo")?.value.trim() || "";
  const aadhaarVal = document.getElementById("aadhaarNo")?.value.trim() || "";
  const vehicleVal = document.getElementById("vehicleSelect")?.value || "";
  const companyVal = document.getElementById("vehicleCompany")?.value.trim() || "";
  const modelVal = document.getElementById("vehicleModel")?.value.trim() || "";
  const chassisVal = document.getElementById("chassisNo")?.value.trim() || "";
  const engineVal = document.getElementById("engineNo")?.value.trim() || "";

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
    if (isDuplicate) { alert("This customer is already saved! All details match an existing record."); return; }
  }

  submitBtn.disabled = true; submitBtn.innerText = "Saving...";
  let uiRecoveryTimer;

  try {
    let photoBase64 = "", photoName = "", photoMimeType = "";
    const photoInput = document.getElementById("photoInput");

    if (photoInput && photoInput.files[0]) {
      const originalFile = photoInput.files[0];
      const file = await compressImage(originalFile);
      photoName = file.name || originalFile.name || "customer-photo.jpg";
      photoMimeType = file.type || originalFile.type || "image/jpeg";
      photoBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Photo could not be read"));
        reader.readAsDataURL(file);
      });
    }

    const payload = {
      action: editId ? "update" : "create", id: editId || null,
      customerName: nameVal, guardianName: document.getElementById("guardianName")?.value.trim() || "",
      gender: document.getElementById("gender")?.value || "", dob: document.getElementById("dob")?.value || "",
      religion: document.getElementById("religion")?.value.trim() || "", aadhaarNo: aadhaarVal, mobileNo: mobileVal,
      address: document.getElementById("address")?.value.trim() || "", vehicle: vehicleVal, vehicleCompany: companyVal,
      vehicleModel: modelVal, chassisNo: chassisVal, engineNo: engineVal,
      occupation: document.getElementById("occupationSelect")?.value || "",
      existingPhotoUrl: document.getElementById("existing-photo-url")?.value || "", photoBase64, photoName, photoMimeType
    };

    uiRecoveryTimer = setTimeout(() => { submitBtn.disabled = false; submitBtn.innerText = "Retry Save"; }, 12000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload), signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Server returned " + response.status);
    const result = await response.json();
    if (result.status === "success") {
      alert(editId ? "Customer updated successfully!" : "Customer saved successfully!");
      resetForm(); await loadCustomers(true); loadPage("Customer/customer-details.html", "customerDetails", "all");
    } else throw new Error(result.message || "Save failed");
  } catch (err) {
    if (err.name === "AbortError") alert("Save timed out. Please check your internet connection.");
    else alert("Submission failed: " + err.message);
  } finally {
    clearTimeout(uiRecoveryTimer); submitBtn.disabled = false; submitBtn.innerText = editId ? "Update Customer" : "Save Customer";
  }
};