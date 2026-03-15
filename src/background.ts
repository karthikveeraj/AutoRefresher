import {
  type Message,
  type RefreshConfig,
  type StatusResponse,
  TimeUnit,
  toMilliseconds,
  formatBadgeText,
  storageKey,
} from "./types.js";

// --- Timer Management ---
// Always use chrome.alarms — setTimeout does NOT survive SW termination in MV3.
// For unpacked/dev extensions, alarms can fire at any frequency.
// In production Chrome enforces a ~30s minimum.

function alarmName(tabId: number): string {
  return `refresh-${tabId}`;
}

export async function startRefresh(tabId: number, interval: number, unit: TimeUnit): Promise<void> {
  // Stop any existing refresh for this tab first
  await stopRefresh(tabId);

  const intervalMs = toMilliseconds(interval, unit);
  const periodInMinutes = intervalMs / 60000;
  const config: RefreshConfig = { interval, unit, enabled: true };

  // Persist config
  await chrome.storage.local.set({ [storageKey(tabId)]: config });

  // Create repeating alarm
  chrome.alarms.create(alarmName(tabId), {
    delayInMinutes: periodInMinutes,
    periodInMinutes,
  });

  // Set active icon
  await chrome.action.setIcon({
    path: {
      "16": "icons/icon16-active.png",
      "48": "icons/icon48-active.png",
      "128": "icons/icon128-active.png",
    },
    tabId,
  });

  // Set tooltip
  const title = `Refreshing every ${interval} ${unit}`;
  try {
    await chrome.action.setTitle({ title, tabId });
  } catch {
    // Fallback: set global title
    await chrome.action.setTitle({ title });
  }
}

export async function stopRefresh(tabId: number): Promise<void> {
  // Clear alarm
  await chrome.alarms.clear(alarmName(tabId));

  // Remove config from storage
  await chrome.storage.local.remove(storageKey(tabId));

  // Set inactive icon
  await chrome.action.setIcon({
    path: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
    },
    tabId,
  });

  // Reset tooltip
  try {
    await chrome.action.setTitle({ title: "Auto Refresher", tabId });
  } catch {
    await chrome.action.setTitle({ title: "Auto Refresher" });
  }
}

export async function getStatus(tabId: number): Promise<StatusResponse> {
  const result = await chrome.storage.local.get(storageKey(tabId));
  const config = result[storageKey(tabId)] as RefreshConfig | undefined;

  if (config && config.enabled) {
    return { enabled: true, interval: config.interval, unit: config.unit };
  }
  return { enabled: false };
}

export function handleMessage(
  message: Message,
  sendResponse: (response: StatusResponse) => void
): boolean {
  if (!message || !message.action) return false;

  switch (message.action) {
    case "start":
      startRefresh(message.tabId, message.interval, message.unit).then(() => {
        sendResponse({ enabled: true, interval: message.interval, unit: message.unit });
      });
      return true; // async response

    case "stop":
      stopRefresh(message.tabId).then(() => {
        sendResponse({ enabled: false });
      });
      return true;

    case "getStatus":
      getStatus(message.tabId).then(sendResponse);
      return true;

    default:
      return false;
  }
}

export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  if (!alarm.name.startsWith("refresh-")) return;

  const tabId = parseInt(alarm.name.replace("refresh-", ""), 10);
  if (isNaN(tabId)) return;

  try {
    await chrome.tabs.reload(tabId);
  } catch {
    // Tab no longer exists — clean up
    await stopRefresh(tabId);
  }
}

// Re-apply active icon/badge after a tab finishes loading (chrome resets per-tab icon on navigation)
export async function handleTabUpdated(
  tabId: number,
  changeInfo: { status?: string }
): Promise<void> {
  if (changeInfo.status !== "complete") return;

  const result = await chrome.storage.local.get(storageKey(tabId));
  const config = result[storageKey(tabId)] as RefreshConfig | undefined;
  if (!config || !config.enabled) return;

  await chrome.action.setIcon({
    path: {
      "16": "icons/icon16-active.png",
      "48": "icons/icon48-active.png",
      "128": "icons/icon128-active.png",
    },
    tabId,
  });
  await chrome.action.setTitle({ title: `Refreshing every ${config.interval} ${config.unit}`, tabId });
}

export async function handleTabRemoved(tabId: number): Promise<void> {
  await stopRefresh(tabId);
}

export async function handleStartup(): Promise<void> {
  const allData = await chrome.storage.local.get(undefined);
  for (const [key, value] of Object.entries(allData)) {
    if (!key.startsWith("tab-")) continue;

    const config = value as RefreshConfig;
    if (!config.enabled) continue;

    const tabId = parseInt(key.replace("tab-", ""), 10);
    if (isNaN(tabId)) continue;

    // Verify the tab still exists
    try {
      await chrome.tabs.get(tabId);
    } catch {
      // Tab doesn't exist anymore — remove stale config
      await chrome.storage.local.remove(key);
      continue;
    }

    const intervalMs = toMilliseconds(config.interval, config.unit);
    const periodInMinutes = intervalMs / 60000;

    chrome.alarms.create(alarmName(tabId), {
      delayInMinutes: periodInMinutes,
      periodInMinutes,
    });

    await chrome.action.setIcon({
      path: {
        "16": "icons/icon16-active.png",
        "48": "icons/icon48-active.png",
        "128": "icons/icon128-active.png",
      },
      tabId,
    });
    await chrome.action.setTitle({ title: `Refreshing every ${config.interval} ${config.unit}`, tabId });
  }
}

// --- Register Listeners ---

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: StatusResponse) => void) => {
    return handleMessage(message, sendResponse);
  }
);

chrome.alarms.onAlarm.addListener(handleAlarm);
chrome.tabs.onRemoved.addListener(handleTabRemoved);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.runtime.onStartup.addListener(handleStartup);
