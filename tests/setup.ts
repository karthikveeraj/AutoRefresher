// Mock chrome APIs for testing

const createEvent = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
  hasListeners: jest.fn(),
});

const chromeMock = {
  alarms: {
    create: jest.fn(),
    clear: jest.fn().mockResolvedValue(true),
    get: jest.fn(),
    getAll: jest.fn(),
    clearAll: jest.fn(),
    onAlarm: createEvent(),
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    reload: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    get: jest.fn(),
    onRemoved: createEvent(),
    onUpdated: createEvent(),
  },
  action: {
    setBadgeText: jest.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: jest.fn().mockResolvedValue(undefined),
    setIcon: jest.fn().mockResolvedValue(undefined),
    setTitle: jest.fn().mockResolvedValue(undefined),
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: createEvent(),
    onStartup: createEvent(),
  },
};

(globalThis as any).chrome = chromeMock;

