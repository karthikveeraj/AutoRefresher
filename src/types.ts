export enum TimeUnit {
  Seconds = "seconds",
  Minutes = "minutes",
  Hours = "hours",
  Days = "days",
}

export interface RefreshConfig {
  interval: number;
  unit: TimeUnit;
  enabled: boolean;
}

export interface StartMessage {
  action: "start";
  tabId: number;
  interval: number;
  unit: TimeUnit;
}

export interface StopMessage {
  action: "stop";
  tabId: number;
}

export interface GetStatusMessage {
  action: "getStatus";
  tabId: number;
}

export type Message = StartMessage | StopMessage | GetStatusMessage;

export interface StatusResponse {
  enabled: boolean;
  interval?: number;
  unit?: TimeUnit;
}

const MAX_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function toMilliseconds(interval: number, unit: TimeUnit): number {
  switch (unit) {
    case TimeUnit.Seconds:
      return interval * 1000;
    case TimeUnit.Minutes:
      return interval * 60 * 1000;
    case TimeUnit.Hours:
      return interval * 60 * 60 * 1000;
    case TimeUnit.Days:
      return interval * 24 * 60 * 60 * 1000;
  }
}

export function validateInterval(interval: number, unit: TimeUnit): string | null {
  if (!Number.isFinite(interval) || !Number.isInteger(interval)) {
    return "Interval must be a whole number.";
  }
  if (interval < 1) {
    return "Interval must be at least 1.";
  }
  const ms = toMilliseconds(interval, unit);
  if (ms > MAX_INTERVAL_MS) {
    return "Interval cannot exceed 7 days.";
  }
  return null; // valid
}

export function formatBadgeText(interval: number, unit: TimeUnit): string {
  const abbrev: Record<TimeUnit, string> = {
    [TimeUnit.Seconds]: "s",
    [TimeUnit.Minutes]: "m",
    [TimeUnit.Hours]: "h",
    [TimeUnit.Days]: "d",
  };
  return `${interval}${abbrev[unit]}`;
}

export function storageKey(tabId: number): string {
  return `tab-${tabId}`;
}
