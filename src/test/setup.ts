import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Ensure the DOM is reset between tests (vitest does not enable globals, so
// @testing-library/react's automatic afterEach cleanup is not registered).
afterEach(() => {
  cleanup();
});
