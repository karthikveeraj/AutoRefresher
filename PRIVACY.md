# Privacy Policy — Auto Refresher

**Last updated:** March 15, 2026

## Overview

Auto Refresher is a browser extension that automatically refreshes the active tab at a user-configured interval. This privacy policy explains how the extension handles your data.

## Data Collection

Auto Refresher does **not** collect, store, or transmit any personal information. Specifically:

- **No personal data** is collected — no names, emails, browsing history, or identifiers
- **No analytics or tracking** — no usage data is sent anywhere
- **No network requests** — the extension makes zero HTTP/fetch calls
- **No cookies** are accessed or modified
- **No remote code** is loaded — all code runs locally

## Data Storage

The extension stores only your refresh configuration (interval value and time unit) locally on your device using `chrome.storage.local`. This data:

- Never leaves your device
- Is not synced to any cloud service
- Is automatically deleted when you close the tab or stop the refresh

## Permissions

| Permission | Purpose |
|------------|---------|
| `alarms` | Schedule periodic refresh timers |
| `storage` | Save per-tab refresh settings locally |
| `activeTab` | Reload the current tab |
| `tabs` | Detect tab close for automatic cleanup |

These permissions are the minimum required for the extension to function. No additional permissions are requested.

## Third-Party Services

Auto Refresher does not integrate with or send data to any third-party services.

## Changes to This Policy

Any changes to this privacy policy will be posted in this file and reflected in the "Last updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue at:
https://github.com/karthikveeraj/AutoRefresher/issues
