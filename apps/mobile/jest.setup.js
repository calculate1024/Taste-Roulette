// Mock expo modules that fail in test environment
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
