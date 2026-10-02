const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4XiryrzR8BmYzNSPhVufvDfmORZ7FUTZOWQ-_r-NTZBRwsY9Gntlwjd66ZCqWgR7m/exec";

document.addEventListener("DOMContentLoaded", function () {
  if (localStorage.getItem("daduSessionToken") && localStorage.getItem("daduBranch")) {
    location.replace("index.html");
    return;
  }

  const form = document.getElementById("login-form");
  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const message = document.getElementById("login-message");
    const button = form.querySelector('button[type="submit"]');
    const originalButtonHtml = button.innerHTML;

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Signing in…';
    message.textContent = "";
    message.classList.remove("is-error");
    message.classList.remove("is-pending");

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ action: "branch_login", username, password })
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success" || !result.token || !result.branch) {
        throw new Error(result.message || "Invalid branch ID or password");
      }

      localStorage.setItem("daduSessionToken", result.token);
      localStorage.setItem("daduBranch", result.branch);
      localStorage.setItem("daduCurrentBranch", result.branch);
      localStorage.setItem("daduLoggedIn", "true");
      location.replace("index.html");
    } catch (error) {
      message.textContent = error.message || "Could not connect to the database";
      message.classList.remove("is-pending");
      message.classList.add("is-error");
      button.disabled = false;
      button.innerHTML = originalButtonHtml;
    }
  });

  const toggleBtn = document.getElementById("toggle-password");
  toggleBtn?.addEventListener("click", function () {
    const pwd = document.getElementById("login-password");
    const isHidden = pwd.type === "password";
    pwd.type = isHidden ? "text" : "password";
    this.classList.toggle("fa-eye", !isHidden);
    this.classList.toggle("fa-eye-slash", isHidden);
  });
});
