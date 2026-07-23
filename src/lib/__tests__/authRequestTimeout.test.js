import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withAuthTimeout, AuthRequestTimeoutError, DEFAULT_AUTH_TIMEOUT_MS } from "@/lib/authRequestTimeout.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withAuthTimeout — factory contract", () => {
  it("invokes the factory exactly once", async () => {
    const factory = vi.fn(() => Promise.resolve("ok"));
    await withAuthTimeout(factory, 5000);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("starts the timer before invoking the factory", () => {
    const order = [];
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    const factory = vi.fn(() => {
      order.push("factory");
      return new Promise(() => {});
    });

    withAuthTimeout(factory, 5000);

    order.unshift(setTimeoutSpy.mock.calls.length > 0 ? "timer" : "no-timer");
    expect(order).toEqual(["timer", "factory"]);
    setTimeoutSpy.mockRestore();
  });

  it("resolves with the factory's result when it settles before the timeout", async () => {
    const result = withAuthTimeout(() => Promise.resolve({ data: "ok" }), 5000);
    await expect(result).resolves.toEqual({ data: "ok" });
  });

  it("propagates a normal async rejection", async () => {
    const result = withAuthTimeout(() => Promise.reject(new Error("boom")), 5000);
    await expect(result).rejects.toThrow("boom");
  });

  it("rejects with AuthRequestTimeoutError once the timeout elapses (never-resolving promise)", async () => {
    const result = withAuthTimeout(() => new Promise(() => {}), 5000);
    const assertion = expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it("rejects with AuthRequestTimeoutError for a custom thenable that never settles", async () => {
    let thenCalls = 0;
    const neverSettlingThenable = {
      then() {
        thenCalls += 1;
        // Deliberately never calls resolve/reject — simulates a hung
        // operation that isn't even a real Promise.
      },
    };

    const result = withAuthTimeout(() => neverSettlingThenable, 5000);
    const assertion = expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(thenCalls).toBe(1);
  });

  it("calls .then() on a custom thenable exactly once, even if it resolves normally", async () => {
    let thenCalls = 0;
    const thenable = {
      then(resolve) {
        thenCalls += 1;
        resolve("thenable-value");
      },
    };

    await expect(withAuthTimeout(() => thenable, 5000)).resolves.toBe("thenable-value");
    expect(thenCalls).toBe(1);
  });

  it("handles a synchronous throw from the factory", async () => {
    const result = withAuthTimeout(() => {
      throw new Error("sync failure");
    }, 5000);
    await expect(result).rejects.toThrow("sync failure");
  });

  it("clears its internal timer once the factory's result wins the race", async () => {
    const clearSpy = vi.spyOn(global, "clearTimeout");
    await withAuthTimeout(() => Promise.resolve("fast"), 5000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("uses a 15 second default timeout", () => {
    expect(DEFAULT_AUTH_TIMEOUT_MS).toBe(15000);
  });

  it("never leaves an unhandled rejection when the factory's promise rejects late, after the timeout already won", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    let rejectLate;
    const latePromise = new Promise((_resolve, reject) => {
      rejectLate = reject;
    });

    const result = withAuthTimeout(() => latePromise, 1000);
    const assertion = expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    rejectLate(new Error("late network failure"));
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(unhandled).not.toHaveBeenCalled();
    process.off("unhandledRejection", unhandled);
  });

  it("never lets a late resolution change the already-settled timeout result", async () => {
    let resolveLate;
    const latePromise = new Promise((resolve) => {
      resolveLate = resolve;
    });

    const result = withAuthTimeout(() => latePromise, 1000);
    const assertion = expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    // Resolving after the timeout already won must not throw or alter
    // the outcome — `result` already settled as a rejection.
    resolveLate("too-late");
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
  });
});
