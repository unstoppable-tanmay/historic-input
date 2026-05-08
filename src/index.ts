export type CommitTrigger = "blur" | "enter";

export type HistoryInputOptions = {
  storage?: Storage;
  maxEntries?: number;
  storageKeyPrefix?: string;
  commitOn?: CommitTrigger[];
  commitAfterIdleMs?: number;
  clearHistoryKey?: string;
};

export type ClearHistoryOptions = {
  storage?: Storage;
  storageKeyPrefix?: string;
};

export const DEFAULT_STORAGE_KEY_PREFIX = "historic-input:";

const DEFAULT_MAX_ENTRIES = 50;

const DEFAULT_COMMIT_ON: CommitTrigger[] = ["blur", "enter"];

type HistoryElement = HTMLInputElement | HTMLTextAreaElement;

type AttachedState = {
  tag: string;
  historyIndex: number;
  draft: string;
  maxEntries: number;
  commitOn: CommitTrigger[];
  idleMs: number;
  idleTimer: ReturnType<typeof setTimeout> | undefined;
  onKeyDown: (event: Event) => void;
  onBlur: () => void;
  onInput: (event: Event) => void;
};

function storageKey(prefix: string, tag: string): string {
  return `${prefix}${tag}`;
}

function loadList(storage: Storage, key: string): string[] {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function saveList(storage: Storage, key: string, items: string[]): void {
  storage.setItem(key, JSON.stringify(items));
}

function isTextLikeInput(el: HTMLInputElement): boolean {
  const type = el.type;
  return (
    type !== "hidden" &&
    type !== "checkbox" &&
    type !== "radio" &&
    type !== "file" &&
    type !== "button" &&
    type !== "submit" &&
    type !== "reset" &&
    type !== "image" &&
    type !== "range" &&
    type !== "color"
  );
}

function parseCommitOnAttribute(raw: string | null): CommitTrigger[] | null {
  if (raw === null) return null;
  const tokens = raw
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((token) => token.length > 0);
  const next: CommitTrigger[] = [];
  for (const token of tokens) {
    if (token === "blur" || token === "enter") {
      next.push(token);
    }
  }
  return next.length > 0 ? next : null;
}

function resolveMaxEntries(el: HTMLElement, fallback: number): number {
  const raw = el.getAttribute("data-history-max");
  if (raw === null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function resolveCommitOn(
  el: HTMLElement,
  fallback: CommitTrigger[]
): CommitTrigger[] {
  const parsed = parseCommitOnAttribute(el.getAttribute("data-history-commit"));
  return parsed ?? fallback;
}

function resolveIdleMs(el: HTMLElement, fallback: number): number {
  const raw = el.getAttribute("data-history-idle-ms");
  if (raw !== null) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

function resolveStorage(el: HTMLElement, fallback: Storage): Storage {
  const raw = el.getAttribute("data-history-storage");
  if (raw === null) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "session") return sessionStorage;
  if (v === "local") return localStorage;
  return fallback;
}

function canonicalClearKey(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (lower === "esc" || lower === "escape") return "Escape";
  if (lower === "del" || lower === "delete") return "Delete";
  return t;
}

function resolveClearKey(
  el: HTMLElement,
  initDefault: string | undefined
): string | null {
  const attr = el.getAttribute("data-history-clear-key");
  if (attr !== null && attr.trim() !== "") {
    return canonicalClearKey(attr);
  }
  if (initDefault !== undefined && initDefault.trim() !== "") {
    return canonicalClearKey(initDefault);
  }
  return null;
}

function keyMatchesClearKey(configured: string, eventKey: string): boolean {
  if (eventKey === configured) return true;
  if (configured.length === 1 && eventKey.length === 1) {
    return configured.toLowerCase() === eventKey.toLowerCase();
  }
  return false;
}

function clearIdleTimer(state: AttachedState): void {
  if (state.idleTimer !== undefined) {
    clearTimeout(state.idleTimer);
    state.idleTimer = undefined;
  }
}

function commitIfNonEmpty(
  storage: Storage,
  prefix: string,
  tag: string,
  value: string,
  maxEntries: number
): void {
  const trimmed = value.trim();
  if (trimmed === "") return;
  const key = storageKey(prefix, tag);
  const list = loadList(storage, key);
  if (list.length > 0 && list[list.length - 1] === trimmed) return;
  list.push(trimmed);
  const capped = list.slice(-maxEntries);
  saveList(storage, key, capped);
}

export function clearHistory(
  tag: string,
  options?: ClearHistoryOptions
): void {
  const storage = options?.storage ?? localStorage;
  const prefix = options?.storageKeyPrefix ?? DEFAULT_STORAGE_KEY_PREFIX;
  storage.removeItem(storageKey(prefix, tag));
}

export function init(options: HistoryInputOptions = {}): () => void {
  const defaultStorage = options.storage ?? localStorage;
  const defaultMaxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const prefix = options.storageKeyPrefix ?? DEFAULT_STORAGE_KEY_PREFIX;
  const defaultCommitOn = options.commitOn ?? DEFAULT_COMMIT_ON;
  const defaultIdleMs = options.commitAfterIdleMs ?? 0;
  const defaultClearKey = options.clearHistoryKey;

  const attached = new Map<HistoryElement, AttachedState>();

  function attach(el: HistoryElement): void {
    const tag = el.getAttribute("data-history");
    if (tag === null || tag === "" || attached.has(el)) return;
    if (el instanceof HTMLInputElement && !isTextLikeInput(el)) return;

    const fieldStorage = resolveStorage(el, defaultStorage);
    const maxEntries = resolveMaxEntries(el, defaultMaxEntries);
    const commitOn = resolveCommitOn(el, defaultCommitOn);
    const idleMs = resolveIdleMs(el, defaultIdleMs);
    const clearKey = resolveClearKey(el, defaultClearKey);

    const state: AttachedState = {
      tag,
      historyIndex: -1,
      draft: el.value,
      maxEntries,
      commitOn,
      idleMs,
      idleTimer: undefined,
      onKeyDown(event: Event) {
        if (!(event instanceof KeyboardEvent)) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;

        if (clearKey !== null && keyMatchesClearKey(clearKey, event.key)) {
          event.preventDefault();
          clearIdleTimer(state);
          clearHistory(tag, {
            storage: fieldStorage,
            storageKeyPrefix: prefix,
          });
          state.historyIndex = -1;
          state.draft = el.value;
          return;
        }

        if (event.key === "Enter" && el instanceof HTMLInputElement) {
          if (commitOn.includes("enter")) {
            clearIdleTimer(state);
            commitIfNonEmpty(
              fieldStorage,
              prefix,
              tag,
              el.value,
              maxEntries
            );
          }
          state.historyIndex = -1;
          state.draft = el.value;
          return;
        }

        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

        const list = loadList(fieldStorage, storageKey(prefix, tag));
        if (list.length === 0) return;

        event.preventDefault();
        clearIdleTimer(state);

        if (event.key === "ArrowUp") {
          if (state.historyIndex === -1) {
            state.draft = el.value;
            state.historyIndex = list.length - 1;
          } else if (state.historyIndex > 0) {
            state.historyIndex -= 1;
          }
          el.value = list[state.historyIndex] ?? "";
        } else {
          if (state.historyIndex === -1) return;
          if (state.historyIndex < list.length - 1) {
            state.historyIndex += 1;
            el.value = list[state.historyIndex] ?? "";
          } else {
            state.historyIndex = -1;
            el.value = state.draft;
          }
        }

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      },
      onBlur() {
        clearIdleTimer(state);
        if (commitOn.includes("blur")) {
          commitIfNonEmpty(fieldStorage, prefix, tag, el.value, maxEntries);
        }
        state.historyIndex = -1;
        state.draft = el.value;
      },
      onInput(event: Event) {
        if (!(event instanceof InputEvent) || event.isTrusted !== true) {
          return;
        }
        clearIdleTimer(state);
        if (idleMs <= 0) return;
        state.idleTimer = setTimeout(() => {
          state.idleTimer = undefined;
          commitIfNonEmpty(fieldStorage, prefix, tag, el.value, maxEntries);
          state.historyIndex = -1;
          state.draft = el.value;
        }, idleMs);
      },
    };

    attached.set(el, state);
    el.addEventListener("keydown", state.onKeyDown);
    el.addEventListener("blur", state.onBlur);
    el.addEventListener("input", state.onInput);
  }

  function scan(root: ParentNode): void {
    const nodes = root.querySelectorAll<HistoryElement>(
      "input[data-history], textarea[data-history]"
    );
    nodes.forEach((node) => {
      attach(node);
    });
  }

  scan(document.body);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const added of record.addedNodes) {
        if (added instanceof HTMLElement) {
          if (
            (added instanceof HTMLInputElement ||
              added instanceof HTMLTextAreaElement) &&
            added.hasAttribute("data-history")
          ) {
            attach(added);
          }
          scan(added);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    for (const [element, st] of attached) {
      clearIdleTimer(st);
      element.removeEventListener("keydown", st.onKeyDown);
      element.removeEventListener("blur", st.onBlur);
      element.removeEventListener("input", st.onInput);
    }
    attached.clear();
  };
}
