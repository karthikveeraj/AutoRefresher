import { TimeUnit, toMilliseconds, validateInterval, formatBadgeText, storageKey } from "../src/types";

describe("toMilliseconds", () => {
  it("converts seconds to milliseconds", () => {
    expect(toMilliseconds(1, TimeUnit.Seconds)).toBe(1000);
    expect(toMilliseconds(30, TimeUnit.Seconds)).toBe(30000);
    expect(toMilliseconds(59, TimeUnit.Seconds)).toBe(59000);
  });

  it("converts minutes to milliseconds", () => {
    expect(toMilliseconds(1, TimeUnit.Minutes)).toBe(60000);
    expect(toMilliseconds(5, TimeUnit.Minutes)).toBe(300000);
    expect(toMilliseconds(60, TimeUnit.Minutes)).toBe(3600000);
  });

  it("converts hours to milliseconds", () => {
    expect(toMilliseconds(1, TimeUnit.Hours)).toBe(3600000);
    expect(toMilliseconds(24, TimeUnit.Hours)).toBe(86400000);
  });

  it("converts days to milliseconds", () => {
    expect(toMilliseconds(1, TimeUnit.Days)).toBe(86400000);
    expect(toMilliseconds(7, TimeUnit.Days)).toBe(604800000);
  });
});

describe("validateInterval", () => {
  it("accepts valid intervals", () => {
    expect(validateInterval(1, TimeUnit.Seconds)).toBeNull();
    expect(validateInterval(30, TimeUnit.Seconds)).toBeNull();
    expect(validateInterval(5, TimeUnit.Minutes)).toBeNull();
    expect(validateInterval(1, TimeUnit.Hours)).toBeNull();
    expect(validateInterval(7, TimeUnit.Days)).toBeNull();
  });

  it("rejects zero", () => {
    expect(validateInterval(0, TimeUnit.Seconds)).toBe("Interval must be at least 1.");
  });

  it("rejects negative numbers", () => {
    expect(validateInterval(-1, TimeUnit.Seconds)).toBe("Interval must be at least 1.");
    expect(validateInterval(-100, TimeUnit.Minutes)).toBe("Interval must be at least 1.");
  });

  it("rejects non-integer values", () => {
    expect(validateInterval(1.5, TimeUnit.Seconds)).toBe("Interval must be a whole number.");
    expect(validateInterval(0.1, TimeUnit.Minutes)).toBe("Interval must be a whole number.");
  });

  it("rejects NaN", () => {
    expect(validateInterval(NaN, TimeUnit.Seconds)).toBe("Interval must be a whole number.");
  });

  it("rejects Infinity", () => {
    expect(validateInterval(Infinity, TimeUnit.Seconds)).toBe("Interval must be a whole number.");
  });

  it("rejects intervals exceeding 7 days", () => {
    expect(validateInterval(8, TimeUnit.Days)).toBe("Interval cannot exceed 7 days.");
    expect(validateInterval(169, TimeUnit.Hours)).toBe("Interval cannot exceed 7 days."); // 169h > 7d
    expect(validateInterval(10081, TimeUnit.Minutes)).toBe("Interval cannot exceed 7 days."); // 10081m > 7d
    expect(validateInterval(604801, TimeUnit.Seconds)).toBe("Interval cannot exceed 7 days."); // > 7d in seconds
  });

  it("accepts exactly 7 days", () => {
    expect(validateInterval(7, TimeUnit.Days)).toBeNull();
    expect(validateInterval(168, TimeUnit.Hours)).toBeNull();
    expect(validateInterval(10080, TimeUnit.Minutes)).toBeNull();
    expect(validateInterval(604800, TimeUnit.Seconds)).toBeNull();
  });
});

describe("formatBadgeText", () => {
  it("formats seconds", () => {
    expect(formatBadgeText(5, TimeUnit.Seconds)).toBe("5s");
    expect(formatBadgeText(30, TimeUnit.Seconds)).toBe("30s");
  });

  it("formats minutes", () => {
    expect(formatBadgeText(1, TimeUnit.Minutes)).toBe("1m");
    expect(formatBadgeText(15, TimeUnit.Minutes)).toBe("15m");
  });

  it("formats hours", () => {
    expect(formatBadgeText(2, TimeUnit.Hours)).toBe("2h");
  });

  it("formats days", () => {
    expect(formatBadgeText(1, TimeUnit.Days)).toBe("1d");
  });
});

describe("storageKey", () => {
  it("creates a key from tab ID", () => {
    expect(storageKey(123)).toBe("tab-123");
    expect(storageKey(0)).toBe("tab-0");
    expect(storageKey(999999)).toBe("tab-999999");
  });
});
