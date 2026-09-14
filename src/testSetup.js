import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Every test may render its own router tree. Cleaning the DOM after each test
// prevents a previous RouterProvider from remaining mounted and duplicating
// pages or navigation state in later tests.
afterEach(() => {
  cleanup();
});

// Node's own experimental native `localStorage` global shadows jsdom's
// implementation in this Node/jsdom version combination, leaving
// window.localStorage undefined instead of jsdom's usual in-memory shim
// (surfaces as "ExperimentalWarning: localStorage is not available
// because --localstorage-file was not provided"). A minimal in-memory
// polyfill sidesteps the version-compatibility question entirely, since
// nothing under test relies on real persistence across process restarts.
if (typeof window !== "undefined" && !window.localStorage) {
  class MemoryStorage {
    #store = new Map();
    getItem(key) {
      return this.#store.has(key) ? this.#store.get(key) : null;
    }
    setItem(key, value) {
      this.#store.set(key, String(value));
    }
    removeItem(key) {
      this.#store.delete(key);
    }
    clear() {
      this.#store.clear();
    }
  }
  Object.defineProperty(window, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}
