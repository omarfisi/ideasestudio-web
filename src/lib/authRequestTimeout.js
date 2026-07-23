// Wraps any auth SDK call so a hung/slow request (rate-limiting, a stuck
// GoTrueClient internal lock, a bad connection — the cause doesn't matter)
// can never leave the checkout UI stuck on "Iniciando sesión…" forever.
//
// Takes a FACTORY, not an already-started promise: withAuthTimeout(() =>
// supabase.auth.signInWithPassword({...})). This starts the timer before
// invoking the operation, and — the part that matters most — the
// resulting promise/thenable is consumed with exactly one `.then()` call,
// ever, no matter what. A `supabase.auth.*` call happens to return a
// genuine native Promise today, but this makes no assumption about that:
// a thenable that runs side effects inside `.then()` (e.g. anything that
// starts a network request from there) would misbehave badly if `.then()`
// were called on it more than once.
//
// The operation keeps running in the background after a timeout "wins" —
// this never calls anything Supabase-specific to abort it (no
// AbortController; the SDK doesn't take one for these calls). Because the
// single `.then()` call is attached unconditionally up front, a late
// resolution or rejection (arriving after the timeout already settled
// this promise) is still observed by that same handler and simply
// discarded — it can never surface as an unhandled rejection and can
// never re-settle an already-settled promise (that's a no-op by Promise
// semantics, reinforced here by the explicit `settled` flag).
export class AuthRequestTimeoutError extends Error {
  constructor() {
    super("AUTH_REQUEST_TIMEOUT");
    this.name = "AuthRequestTimeoutError";
  }
}

export const DEFAULT_AUTH_TIMEOUT_MS = 15000;

export function withAuthTimeout(requestFactory, timeoutMs = DEFAULT_AUTH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new AuthRequestTimeoutError());
    }, timeoutMs);

    function finish(settleFn, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      settleFn(value);
    }

    let requestResult;
    try {
      requestResult = requestFactory();
    } catch (syncError) {
      finish(reject, syncError);
      return;
    }

    // Exactly one .then() call, ever, on whatever the factory returned.
    Promise.resolve(requestResult).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error)
    );
  });
}
