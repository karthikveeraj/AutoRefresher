import { TimeUnit, formatBadgeText, storageKey } from "../src/types";
import {
  startRefresh,
  stopRefresh,
  getStatus,
  handleMessage,
  handleAlarm,
  handleTabRemoved,
  handleStartup,
} from "../src/background";

const chromeMock = (globalThis as any).chrome;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset default mock implementations
  chromeMock.alarms.clear.mockResolvedValue(true);
  chromeMock.storage.local.get.mockResolvedValue({});
  chromeMock.storage.local.set.mockResolvedValue(undefined);
  chromeMock.storage.local.remove.mockResolvedValue(undefined);
  chromeMock.tabs.reload.mockResolvedValue(undefined);
  chromeMock.action.setBadgeText.mockResolvedValue(undefined);
  chromeMock.action.setBadgeBackgroundColor.mockResolvedValue(undefined);
  chromeMock.action.setIcon.mockResolvedValue(undefined);
});

describe("startRefresh", () => {
  it("creates an alarm for intervals >= 60s", async () => {
    const tabId = 42;

    await startRefresh(tabId, 2, TimeUnit.Minutes);

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      [storageKey(tabId)]: { interval: 2, unit: TimeUnit.Minutes, enabled: true },
    });
    expect(chromeMock.alarms.create).toHaveBeenCalledWith(`refresh-${tabId}`, {
      delayInMinutes: 2,
      periodInMinutes: 2,
    });
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      text: "2m",
      tabId,
    });
    expect(chromeMock.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: "#4CAF50",
      tabId,
    });
  });

  it("creates an alarm for sub-minute intervals too", async () => {
    const tabId = 99;

    await startRefresh(tabId, 10, TimeUnit.Seconds);

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
      [storageKey(tabId)]: { interval: 10, unit: TimeUnit.Seconds, enabled: true },
    });
    // Now uses chrome.alarms for ALL intervals
    expect(chromeMock.alarms.create).toHaveBeenCalledWith(
      `refresh-${tabId}`,
      { delayInMinutes: 10000 / 60000, periodInMinutes: 10000 / 60000 }
    );
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      text: "10s",
      tabId,
    });
  });
});

describe("stopRefresh", () => {
  it("clears alarm, storage, and badge", async () => {
    const tabId = 42;

    await stopRefresh(tabId);

    expect(chromeMock.alarms.clear).toHaveBeenCalledWith(`refresh-${tabId}`);
    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith(storageKey(tabId));
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId });
  });
});

describe("getStatus", () => {
  it("returns enabled status when config exists", async () => {
    const tabId = 42;
    chromeMock.storage.local.get.mockResolvedValueOnce({
      [storageKey(tabId)]: {
        interval: 5,
        unit: TimeUnit.Minutes,
        enabled: true,
      },
    });

    const result = await getStatus(tabId);

    expect(result).toEqual({
      enabled: true,
      interval: 5,
      unit: TimeUnit.Minutes,
    });
  });

  it("returns disabled status when no config", async () => {
    chromeMock.storage.local.get.mockResolvedValueOnce({});

    const result = await getStatus(999);

    expect(result).toEqual({ enabled: false });
  });
});

describe("handleMessage", () => {
  it("handles start message and returns true", () => {
    const sendResponse = jest.fn();
    const result = handleMessage(
      { action: "start", tabId: 42, interval: 5, unit: TimeUnit.Minutes },
      sendResponse
    );
    expect(result).toBe(true);
  });

  it("handles stop message and returns true", () => {
    const sendResponse = jest.fn();
    const result = handleMessage(
      { action: "stop", tabId: 42 },
      sendResponse
    );
    expect(result).toBe(true);
  });

  it("handles getStatus message and returns true", () => {
    const sendResponse = jest.fn();
    const result = handleMessage(
      { action: "getStatus", tabId: 42 },
      sendResponse
    );
    expect(result).toBe(true);
  });

  it("returns false for unknown actions", () => {
    const sendResponse = jest.fn();
    const result = handleMessage(
      { action: "unknown" } as any,
      sendResponse
    );
    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it("returns false for null message", () => {
    const sendResponse = jest.fn();
    const result = handleMessage(null as any, sendResponse);
    expect(result).toBe(false);
  });
});

describe("handleAlarm", () => {
  it("reloads the correct tab", async () => {
    await handleAlarm({ name: "refresh-42", scheduledTime: Date.now() });

    expect(chromeMock.tabs.reload).toHaveBeenCalledWith(42);
  });

  it("ignores non-refresh alarms", async () => {
    await handleAlarm({ name: "other-alarm", scheduledTime: Date.now() });

    expect(chromeMock.tabs.reload).not.toHaveBeenCalled();
  });

  it("cleans up when tab no longer exists", async () => {
    chromeMock.tabs.reload.mockRejectedValueOnce(new Error("No tab"));

    await handleAlarm({ name: "refresh-123", scheduledTime: Date.now() });

    expect(chromeMock.alarms.clear).toHaveBeenCalledWith("refresh-123");
    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith(storageKey(123));
  });
});

describe("handleTabRemoved", () => {
  it("cleans up when a tab is closed", async () => {
    await handleTabRemoved(77);

    expect(chromeMock.alarms.clear).toHaveBeenCalledWith("refresh-77");
    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith(storageKey(77));
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId: 77 });
  });
});

describe("handleStartup", () => {
  it("re-registers alarms from stored configs", async () => {
    const tabId = 50;
    chromeMock.storage.local.get.mockResolvedValueOnce({
      [storageKey(tabId)]: {
        interval: 5,
        unit: TimeUnit.Minutes,
        enabled: true,
      },
    });
    chromeMock.tabs.get.mockResolvedValueOnce({ id: tabId });

    await handleStartup();

    expect(chromeMock.alarms.create).toHaveBeenCalledWith(`refresh-${tabId}`, {
      delayInMinutes: 5,
      periodInMinutes: 5,
    });
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      text: "5m",
      tabId,
    });
  });

  it("removes stale configs for closed tabs", async () => {
    const tabId = 999;
    chromeMock.storage.local.get.mockResolvedValueOnce({
      [storageKey(tabId)]: {
        interval: 10,
        unit: TimeUnit.Seconds,
        enabled: true,
      },
    });
    chromeMock.tabs.get.mockRejectedValueOnce(new Error("No tab"));

    await handleStartup();

    expect(chromeMock.storage.local.remove).toHaveBeenCalledWith(storageKey(tabId));
  });

  it("skips disabled configs", async () => {
    chromeMock.storage.local.get.mockResolvedValueOnce({
      [storageKey(200)]: {
        interval: 5,
        unit: TimeUnit.Minutes,
        enabled: false,
      },
    });

    await handleStartup();

    expect(chromeMock.alarms.create).not.toHaveBeenCalled();
  });

  it("skips non-tab storage keys", async () => {
    chromeMock.storage.local.get.mockResolvedValueOnce({
      someOtherKey: "value",
    });

    await handleStartup();

    expect(chromeMock.alarms.create).not.toHaveBeenCalled();
    expect(chromeMock.tabs.get).not.toHaveBeenCalled();
  });
});

