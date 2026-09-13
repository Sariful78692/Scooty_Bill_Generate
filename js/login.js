const AUTH_KEY = "daduAuth";

function getAuth() {
  return JSON.parse(localStorage.getItem(AUTH_KEY) || JSON.stringify({ username: "admin", password: "admin123" }));
}

function forgotUsername() {
  alert("Your username is: " + getAuth().username);
}

function forgotPassword() {
  const u = prompt("Enter your username:");
  alert(u === getAuth().username ? "Your password is: " + getAuth().password : "Username not found.");
}

document.addEventListener("DOMContentLoaded", function () {
  // যদি আগে থেকেই লগইন করা থাকে, সরাসরি index.html এ পাঠিয়ে দাও
  if (localStorage.getItem("daduLoggedIn") === "true") {
    location.replace("index.html");
    return;
  }

  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const auth = getAuth();
      const u = document.getElementById("login-username").value.trim();
      const p = document.getElementById("login-password").value;
      if (u === auth.username && p === auth.password) {
        localStorage.setItem("daduLoggedIn", "true");
        location.replace("index.html");
      } else {
        document.getElementById("login-message").innerText = "Invalid username or password";
      }
    });
  }

  const toggleBtn = document.getElementById("toggle-password");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      const pwd = document.getElementById("login-password");
      const isHidden = pwd.type === "password";
      pwd.type = isHidden ? "text" : "password";
      this.classList.toggle("fa-eye", !isHidden);
      this.classList.toggle("fa-eye-slash", isHidden);
    });
  }
});