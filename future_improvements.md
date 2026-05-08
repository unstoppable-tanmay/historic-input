# Future improvements

Ideas for evolving **Historic Input**; not committed work.

## UX and behavior

- Optional **dropdown / overlay** for shell-style suggestions (filter by prefix) instead of only invisible history plus arrow keys.
- **Deduping policy** options: skip if duplicate of any entry, move duplicate to most recent, case-insensitive dedupe.
- **Trim / normalize** hooks: whitespace rules, max length per entry before save.
- Clear **draft vs history browsing** in the UI (e.g. badge or style when navigating history vs typing a new line).
- Extra **keyboard** shortcuts: Escape restores draft; Page Up/Down for larger steps; optional reverse search (Ctrl+R style).

## API and configuration

- **`init({ root })`**: Limit scanning to a subtree or Shadow DOM root for widgets and embeds.
- **`refresh()` / `attach(element)`**: Explicit attachment when `MutationObserver` is undesirable or insufficient.
- **Custom serializer**: `serialize(value)` / `deserialize(stored)` for non-plain-string payloads or encryption hooks.
- More **`data-history-*`** knobs if new policies are added (e.g. dedupe mode).

## Storage and privacy

- Stronger **session vs local** documentation for sensitive fields (baseline: `data-history-storage`).
- **Quota handling**: catch `QuotaExceededError`, trim oldest entries, optional callback.
- **Scoping**: optional pathname or app id in the key prefix for multi-page or multi-tenant UIs.

## Accessibility

- If a visible list is added: **`aria-autocomplete`**, **`aria-controls`**, **`aria-expanded`**, listbox roles.
- Optional **live region** announcements for history position (“3 of 10”) when that UI exists.

## Frameworks and SSR

- Thin **React / Vue / Svelte** helpers: lifecycle-wrapped `init` / teardown and guidance for controlled inputs.
- **SSR-safe** entry: no-op until `document` exists, or a dedicated browser-only export consumed from `useEffect` / `onMounted`.

## Quality and distribution

- **Unit tests** with mocked `Storage`, idle vs trusted `InputEvent`, arrow navigation and idle cancellation.
- **E2E** (e.g. Playwright) against the vanilla example.
- Optional **lite build** without `MutationObserver` for smaller bundles.

## Documentation

- **Changelog**, browser notes (e.g. `InputEvent.isTrusted` for idle).
- **Cookbook**: controlled React patterns (uncontrolled ref vs syncing `value`).

Prioritize based on audience (e.g. minimal bundle vs React-heavy vs Chrome-like omnibox UX).
