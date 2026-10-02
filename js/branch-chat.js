let branchChatSelectedTarget = "";
let branchChatPollTimer = null;
let branchChatRequestPending = false;
let branchChatLastSignature = "";
let branchChatLastTarget = "";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("branch-chat-form");
  form?.addEventListener("submit", sendBranchChatMessage);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !document.getElementById("branch-chat-panel")?.classList.contains("hidden")) toggleBranchChat(false);
  });
});

window.toggleBranchChat = async function(forceOpen) {
  const panel = document.getElementById("branch-chat-panel");
  const button = document.getElementById("branch-chat-toggle");
  if (!panel || !button) return;
  const shouldOpen = forceOpen === undefined ? panel.classList.contains("hidden") : Boolean(forceOpen);
  panel.classList.toggle("hidden", !shouldOpen);
  panel.setAttribute("aria-hidden", String(!shouldOpen));
  button.setAttribute("aria-expanded", String(shouldOpen));
  button.setAttribute("aria-label", shouldOpen ? "Close branch chat" : "Open branch chat");
  if (!shouldOpen) {
    clearInterval(branchChatPollTimer);
    branchChatPollTimer = null;
    return;
  }
  if (!mainDataLoaded) {
    setBranchChatStatus("Loading branch list…");
    try { await loadCustomers(); }
    catch (error) { setBranchChatStatus(error.message || "Could not load branch list."); return; }
  }
  setupBranchChatTarget();
  await loadBranchChatMessages();
  clearInterval(branchChatPollTimer);
  branchChatPollTimer = setInterval(() => {
    if (!panel.classList.contains("hidden")) loadBranchChatMessages(true);
  }, 12000);
  document.getElementById("branch-chat-input")?.focus();
};

function setupBranchChatTarget() {
  const isMain = String(currentBranch || "").trim().toLowerCase() === "main branch";
  const wrap = document.getElementById("branch-chat-target-wrap");
  const select = document.getElementById("branch-chat-target");
  const subtitle = document.getElementById("branch-chat-subtitle");
  if (!wrap || !select) return;
  if (!isMain) {
    wrap.hidden = true;
    branchChatSelectedTarget = "Main Branch";
    if (subtitle) subtitle.textContent = `Conversation with Main Branch · ${currentBranch}`;
    return;
  }
  wrap.hidden = false;
  const targets = (availableBranches || []).filter(branch => String(branch).trim().toLowerCase() !== "main branch");
  const signature = targets.join("|");
  if (select.dataset.targets !== signature) {
    select.innerHTML = targets.length
      ? targets.map(branch => `<option value="${escapeHtml(branch)}">${escapeHtml(branch)}</option>`).join("")
      : `<option value="">No branch users found</option>`;
    select.dataset.targets = signature;
  }
  if (!targets.some(branch => branch.toLowerCase() === branchChatSelectedTarget.toLowerCase())) branchChatSelectedTarget = targets[0] || "";
  select.value = branchChatSelectedTarget;
  if (subtitle) subtitle.textContent = branchChatSelectedTarget ? `Conversation with ${branchChatSelectedTarget}` : "Create a branch user to start a conversation";
  const sendButton = document.getElementById("branch-chat-send");
  if (sendButton) sendButton.disabled = !branchChatSelectedTarget;
}

window.loadBranchChatMessages = async function(silent = false) {
  if (branchChatRequestPending) return;
  const isMain = String(currentBranch || "").trim().toLowerCase() === "main branch";
  if (isMain) {
    const selectedTarget = document.getElementById("branch-chat-target")?.value || "";
    if (selectedTarget !== branchChatLastTarget) branchChatLastSignature = "";
    branchChatSelectedTarget = selectedTarget;
    const subtitle = document.getElementById("branch-chat-subtitle");
    if (subtitle) subtitle.textContent = branchChatSelectedTarget ? `Conversation with ${branchChatSelectedTarget}` : "Create a branch user to start a conversation";
  } else branchChatSelectedTarget = "Main Branch";
  if (branchChatSelectedTarget !== branchChatLastTarget) {
    branchChatLastTarget = branchChatSelectedTarget;
    branchChatLastSignature = "";
  }
  if (!branchChatSelectedTarget) {
    renderBranchChatMessages([]);
    return;
  }
  branchChatRequestPending = true;
  const requestedTarget = branchChatSelectedTarget;
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"list_branch_messages", targetBranch:requestedTarget})});
    const result = await response.json();
    if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not load messages.");
    if (requestedTarget !== branchChatSelectedTarget) return;
    const messages = result.messages || [];
    const signature = messages.length ? `${messages.length}:${messages[messages.length - 1].id}` : "empty";
    if (signature !== branchChatLastSignature) {
      branchChatLastSignature = signature;
      renderBranchChatMessages(messages);
    }
    if (!silent) setBranchChatStatus("");
  } catch (error) {
    if (!silent) setBranchChatStatus(error.message || "Could not connect to chat.");
  } finally {
    branchChatRequestPending = false;
  }
};

async function sendBranchChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById("branch-chat-input");
  const button = document.getElementById("branch-chat-send");
  const message = String(input?.value || "").trim();
  if (!message || !branchChatSelectedTarget || !button) return;
  button.disabled = true;
  setBranchChatStatus("Sending…");
  try {
    const response = await apiFetch(APPS_SCRIPT_URL, {method:"POST", body:JSON.stringify({action:"send_branch_message", targetBranch:branchChatSelectedTarget, message})});
    const result = await response.json();
    if (!response.ok || result.status !== "success") throw new Error(result.message || "Could not send message.");
    input.value = "";
    branchChatLastSignature = "";
    setBranchChatStatus("");
    await loadBranchChatMessages();
  } catch (error) {
    setBranchChatStatus(error.message || "Could not send message.");
  } finally {
    button.disabled = !branchChatSelectedTarget;
  }
}

function renderBranchChatMessages(messages) {
  const container = document.getElementById("branch-chat-messages");
  if (!container) return;
  if (!messages.length) {
    container.innerHTML = `<div class="branch-chat-empty">No messages yet. Start the conversation.</div>`;
    return;
  }
  container.innerHTML = messages.map(item => {
    const ownMessage = String(item.fromBranch || "").trim().toLowerCase() === String(currentBranch || "").trim().toLowerCase();
    const parsedDate = new Date(item.timestamp);
    const time = Number.isNaN(parsedDate.getTime()) ? String(item.timestamp || "") : parsedDate.toLocaleString([], {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});
    return `<article class="branch-chat-message ${ownMessage ? "mine" : ""}"><div class="branch-chat-message-text">${escapeHtml(item.message || "")}</div><div class="branch-chat-message-meta">${escapeHtml(item.fromBranch || "Branch")} · ${escapeHtml(time)}</div></article>`;
  }).join("");
  container.scrollTop = container.scrollHeight;
}

function setBranchChatStatus(message) {
  const status = document.getElementById("branch-chat-status");
  if (status) status.textContent = message;
}
