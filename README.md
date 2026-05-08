# Historic Input

Vanilla DOM enhancement for `<input>` and `<textarea>`: persist values per `data-history` tag and recall them with arrow up / down.

## Install

```bash
npm install historic-input
```

## Usage

```html
<input type="search" data-history="my-tag" />
```

```javascript
import { init } from "historic-input";

const stop = init();

// later: stop();
```

Call `init()` once after the DOM is ready (for example at the end of `<body>` or inside `DOMContentLoaded`). It finds every `input[data-history]` and `textarea[data-history]`, attaches listeners, and watches for new nodes with `MutationObserver`.

## Options

Pass an object to `init`:

| Option | Default | Description |
|--------|---------|-------------|
| `storage` | `localStorage` | Default `Storage` for fields that omit `data-history-storage`. |
| `storageKeyPrefix` | `DEFAULT_STORAGE_KEY_PREFIX` (`"historic-input:"`) | Prefix for keys; full key is `prefix + tag`. |
| `maxEntries` | `50` | Maximum strings stored per tag. |
| `commitOn` | `["blur", "enter"]` | When to append the current value: `"blur"`, `"enter"` (single-line `<input>` only). |
| `commitAfterIdleMs` | `0` | If greater than `0`, also save after this many milliseconds without an input event (global default). |
| `clearHistoryKey` | *(none)* | Default key for clearing stored history when a field has focus; overridden per field by `data-history-clear-key`. Values use the same rules as that attribute (see below). |

Returned function removes listeners, observers, and idle timers.

## Per-field attributes

On the same element as `data-history="..."`:

| Attribute | Description |
|-----------|-------------|
| `data-history-storage` | `local` uses `localStorage`, `session` uses `sessionStorage`. Omit to use the `storage` option from `init`. The same tag string with **different** storage values refers to **different** buckets. |
| `data-history-max` | Overrides `maxEntries` for that element’s tag. |
| `data-history-commit` | Space- or comma-separated: `blur`, `enter`. Overrides `commitOn`. |
| `data-history-idle-ms` | Idle delay in milliseconds; overrides `commitAfterIdleMs`. Use `0` to disable idle for that field. |
| `data-history-clear-key` | When set, pressing that key while the field is focused removes all saved history for this field’s tag in this field’s storage (`local` vs `session`). Does not clear the visible input text. Modifiers (Ctrl, Alt, Meta) are ignored for this shortcut; the handler matches other behavior and skips when those are held. |

Use a value comparable to `KeyboardEvent.key`: for example `Escape`, `Delete`, `F2`, or a single letter. Shorthand: `Esc` / `escape` → `Escape`, `Del` / `delete` → `Delete`.

Optional **`init({ clearHistoryKey: 'Escape' })`** sets a default clear key for fields that omit `data-history-clear-key`.

## Clear history programmatically

```javascript
import {
  clearHistory,
  DEFAULT_STORAGE_KEY_PREFIX,
} from "historic-input";

clearHistory("my-tag");

clearHistory("my-tag", { storage: sessionStorage });

clearHistory("my-tag", {
  storage: localStorage,
  storageKeyPrefix: DEFAULT_STORAGE_KEY_PREFIX,
});
```

`clearHistory` removes the stored list for that tag in the given `Storage`. Match `storage` and `storageKeyPrefix` to how the field was configured (`data-history-storage`, `init({ storage })`, `init({ storageKeyPrefix })`).

## Idle save and arrow keys

Idle commits run only after **real user edits**: trusted `input` events from typing, paste, cut, etc.

Changing the field value with **arrow up / down** (history browsing) does not start or reset the idle timer and does not count as typing for idle purposes. Synthetic `input` events used for framework compatibility are ignored for idle. Any **pending** idle commit from earlier typing is **cancelled** when you navigate history with the arrows, so a timer started while typing cannot fire after you have moved to another history line.

There is no separate React or Angular package: **Historic Input** attaches to real DOM nodes. Use the same `data-history` attributes in JSX or Angular templates and call **`init()` once** after the document contains your fields (the library observes dynamically added nodes).

## React

Install **`historic-input`** alongside React. Call **`init()`** once from **`useEffect`** and return the teardown function on unmount. **`useEffect` runs only on the client**, which avoids touching `document` during SSR.

```tsx
import { useEffect } from "react";
import { init } from "historic-input";

export function App() {
  useEffect(() => {
    const stop = init();
    return stop;
  }, []);

  return (
    <input type="search" data-history="react-demo" placeholder="Search" />
  );
}
```

Put **`data-history`** (and other `data-history-*` attributes) on **`input` / `textarea`** elements like any DOM attribute: **`data-history-clear-key="Esc"`**, **`data-history-storage="session"`**, etc.

**Controlled inputs** (`value={state}`): React may overwrite the field value when state updates. Prefer **uncontrolled** fields (**`defaultValue`**) for smoothest behavior with Historic Input, or keep state in sync when history navigation updates the value.

## Angular

Install **`historic-input`**. Start **`init()`** after the view exists (**`ngAfterViewInit`**) and stop it in **`ngOnDestroy`**. Gate **`init`** with **`isPlatformBrowser`** so SSR builds never touch **`document`**.

```typescript
import {
  Component,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { init } from "historic-input";

@Component({
  selector: "app-root",
  standalone: true,
  template: `
    <input type="search" data-history="angular-demo" placeholder="Search" />
  `,
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private stop?: () => void;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stop = init();
  }

  ngOnDestroy(): void {
    this.stop?.();
  }
}
```

Use **`data-history`** and related attributes on elements in templates the same way as in plain HTML.

## Example / feature page

From the repo root:

```bash
npm install
npm run build
npm run example
```

The **`examples/vanilla/`** page is the library feature overview: same plain styling with **install**, **quick start**, **options**, **attributes**, **programmatic clear**, **idle / arrows**, **React**, **Angular**, **live demos**, and **run locally** in one HTML file.

## Future ideas

See [`future_improvements.md`](./future_improvements.md).

## License

MIT
