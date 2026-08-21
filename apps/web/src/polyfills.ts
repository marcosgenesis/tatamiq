import "core-js/stable";

/**
 * Some UI dependencies use WeakRef opportunistically for focus/cache bookkeeping.
 * Older iPad Safari versions do not implement it; a strong-reference fallback is
 * acceptable here because it preserves behavior at the cost of a little GC help.
 */
if (!("WeakRef" in globalThis)) {
  class WeakRefFallback<T extends object> {
    readonly #target: T;

    constructor(target: T) {
      this.#target = target;
    }

    deref() {
      return this.#target;
    }
  }

  Object.defineProperty(globalThis, "WeakRef", {
    configurable: true,
    writable: true,
    value: WeakRefFallback,
  });
}

if (!("FinalizationRegistry" in globalThis)) {
  class FinalizationRegistryFallback {
    register() {}
    unregister() {
      return false;
    }
  }

  Object.defineProperty(globalThis, "FinalizationRegistry", {
    configurable: true,
    writable: true,
    value: FinalizationRegistryFallback,
  });
}
