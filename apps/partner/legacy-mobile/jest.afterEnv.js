global.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const suppressedConsoleErrorPatterns = [
  /The current testing environment is not configured to support act/,
  /You seem to have overlapping act\(\) calls/,
  /An update to VirtualizedList inside a test was not wrapped in act/,
];

const originalConsoleError = console.error;

jest.spyOn(console, "error").mockImplementation((...args) => {
  const [firstArg] = args;
  const message = typeof firstArg === "string" ? firstArg : "";

  if (suppressedConsoleErrorPatterns.some((pattern) => pattern.test(message))) {
    return;
  }

  originalConsoleError(...args);
});
