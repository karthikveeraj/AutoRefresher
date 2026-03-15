import { TimeUnit, validateInterval, type StatusResponse } from "./types.js";

const intervalInput = document.getElementById("interval") as HTMLInputElement;
const unitSelect = document.getElementById("unit") as HTMLSelectElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;

let currentTabId: number | null = null;

// --- Helpers ---

function showError(msg: string): void {
  errorDiv.textContent = msg;
  errorDiv.hidden = false;
}

function clearError(): void {
  errorDiv.textContent = "";
  errorDiv.hidden = true;
}

function setActiveUI(interval: number, unit: TimeUnit): void {
  startBtn.hidden = true;
  stopBtn.hidden = false;
  intervalInput.disabled = true;
  unitSelect.disabled = true;
  statusDiv.textContent = `Refreshing every ${interval} ${unit}`;
  statusDiv.classList.add("active");
}

function setInactiveUI(): void {
  startBtn.hidden = false;
  stopBtn.hidden = true;
  intervalInput.disabled = false;
  unitSelect.disabled = false;
  statusDiv.textContent = "Inactive";
  statusDiv.classList.remove("active");
  clearError();
}

// --- Load current state on popup open ---

async function loadStatus(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  currentTabId = tab.id;

  const response: StatusResponse = await chrome.runtime.sendMessage({
    action: "getStatus",
    tabId: currentTabId,
  });

  if (response.enabled && response.interval !== undefined && response.unit !== undefined) {
    intervalInput.value = String(response.interval);
    unitSelect.value = response.unit;
    setActiveUI(response.interval, response.unit);
  } else {
    setInactiveUI();
  }
}

// --- Start handler ---

startBtn.addEventListener("click", async () => {
  if (currentTabId === null) return;

  const interval = parseInt(intervalInput.value, 10);
  const unit = unitSelect.value as TimeUnit;

  const error = validateInterval(interval, unit);
  if (error) {
    showError(error);
    return;
  }

  clearError();
  startBtn.disabled = true;
  startBtn.textContent = "Starting...";

  try {
    const response: StatusResponse = await chrome.runtime.sendMessage({
      action: "start",
      tabId: currentTabId,
      interval,
      unit,
    });

    if (response && response.enabled) {
      statusDiv.textContent = `\u2713 Auto-refresh started — every ${interval} ${unit}`;
      statusDiv.classList.add("active");
      // Auto-close popup after brief delay so user sees the confirmation
      setTimeout(() => window.close(), 1000);
    } else {
      startBtn.disabled = false;
      startBtn.textContent = "\u25B6 Start";
      showError("Failed to start refresh. Try again.");
    }
  } catch {
    startBtn.disabled = false;
    startBtn.textContent = "\u25B6 Start";
    showError("Failed to start refresh. Try again.");
  }
});

// --- Stop handler ---

stopBtn.addEventListener("click", async () => {
  if (currentTabId === null) return;

  stopBtn.disabled = true;

  await chrome.runtime.sendMessage({
    action: "stop",
    tabId: currentTabId,
  });

  stopBtn.disabled = false;
  setInactiveUI();
});

// --- Initialize ---

loadStatus();
