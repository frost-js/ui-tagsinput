# Frost UI TagsInput

[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-tagsinput?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-tagsinput)
[![license](https://img.shields.io/github/license/elusivecodes/FrostUI-TagsInput?style=flat-square)](./LICENSE)

Editable tags for Frost UI, with free text, local and asynchronous suggestions, removable chips, and native form integration.

## Highlights

- Free-entry tags backed by a native multiple select
- Local suggestions and asynchronous search with pagination
- Debounced, cancellable searches with protection against stale responses
- Case- and accent-insensitive matching and sorting
- Validation, trimming, selection limits, and configurable confirmation keys
- Keyboard navigation, accessible labels, and native required/disabled behavior
- Silent programmatic updates, form submission, and reset synchronization
- Filled and outline Frost UI v4 styles, three sizes, theme tokens, and RTL layouts
- Native `TagsInput` class and `tagsinput` fQuery plugin
- ESM and UMD bundles, source maps, and configurable Sass modules
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

This README describes v3. Until v3 is published, build this checkout to try it; the npm badge shows the currently published version.

### Browser projects / bundlers

Install TagsInput v3 with its Frost UI v4 and fQuery v5 peers:

```bash
npm i @fr0st/ui-tagsinput@3 @fr0st/ui@4 @fr0st/query@5
```

The package root resolves to the compiled ESM bundle. Import UI CSS first, component CSS second, and the default component export:

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-tagsinput/dist/frost-ui-tagsinput.min.css';
import TagsInput from '@fr0st/ui-tagsinput';

const tagsInput = TagsInput.init(document.querySelector('#tags'), {
    placeholder: 'Add some tags',
    fullWidth: true,
});
```

The peer dependencies share the application's UI and fQuery instances. Package exports expose the root, `dist/*`, and `src/*`. TagsInput requires a browser DOM; load it on the client in server-rendered applications.

### Browser (ESM)

Copy the component's `dist` directory to your site. Map UI, fQuery, and their shared core dependency before importing the component:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.min.css">
<link rel="stylesheet" href="/dist/frost-ui-tagsinput.min.css">

<label for="tags">Tags</label>
<select id="tags" multiple class="input-outline"></select>

<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@4/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@5/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import TagsInput from '/dist/frost-ui-tagsinput.esm.min.js';

    TagsInput.init(document.querySelector('#tags'));
</script>
```

### Browser (UMD)

Load UI's all-in-one bundle before TagsInput. It supplies the `UI` and `fQuery` globals:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui.min.css">
<link rel="stylesheet" href="/dist/frost-ui-tagsinput.min.css">

<label for="tags">Tags</label>
<select id="tags" multiple class="input-outline"></select>

<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@4/dist/frost-ui-bundle.min.js"></script>
<script src="/dist/frost-ui-tagsinput.min.js"></script>
<script>
    const tagsInput = UI.TagsInput.init(document.querySelector('#tags'));
</script>
```

The UMD bundle adds `TagsInput` to the existing `globalThis.UI` object. If using UI's separate build, load fQuery, UI, and TagsInput in that order. The all-in-one UI bundle already includes fQuery.

### Custom Sass builds

```bash
npm i -D sass
```

Create an application stylesheet:

```scss
@use '@fr0st/ui-tagsinput/src/scss/tagsinput' with (
    $tagsinput-item-spacing: .5rem,
    $tagsinput-btn-bg: var(--ui-info),
    $tagsinput-btn-color: var(--ui-info-contrast),
    $tagsinput-btn-hover-bg: var(--ui-info-highlight)
);
```

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

The module forwards the [component variables](./src/scss/_vars.scss), all declared with `!default`. Include UI CSS separately. Configure variables with `@use ... with (...)` before another stylesheet loads the module.

## Usage

Initialize a labeled `<select multiple>`. Its classes control the generated input's style and size:

```html
<label for="tags">Topics</label>
<select id="tags" name="topics" multiple class="input-outline">
    <option value="Design" selected>Design</option>
    <option value="Development">Development</option>
    <option value="Testing">Testing</option>
</select>
```

```js
import TagsInput from '@fr0st/ui-tagsinput';

const tagsInput = TagsInput.init(document.querySelector('#tags'), {
    placeholder: 'Add a topic',
    minSearch: 0,
    fullWidth: true,
});

tagsInput.add('Documentation');
```

Tags are strings. Suggestions and chips use option **values**, while native option labels remain intact. Users can add values absent from the suggestions. `data` supplies suggestions; it does not select them or restrict free entry. Use selected native options or `setValue()` for initial tags, and `validTag` to restrict accepted values.

Calling `TagsInput.init()` again returns the existing instance. Options are applied at initialization; dispose and reinitialize to change options without a dedicated setter. A single select or non-select target is rejected before registration.

## Options

Options resolve in this order:

1. `TagsInput.defaults`
2. The select's `data-ui-*` attributes
3. Options passed to `TagsInput.init()`

Resolved `instance.options` are frozen. Set application-wide defaults before initializing components:

```js
TagsInput.defaults.fullWidth = true;
TagsInput.defaults.debounce = 300;
```

`TagsInput.classes` holds structural/state class names; custom class names need corresponding CSS.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `placeholder` | `string` | `''` | Label shown when the selection/search is empty and the editor is not focused. |
| `lang` | `object` | See below | Interface labels and status messages. |
| `data` | `(string \| number)[] \| null` | `null` | Local suggestions; otherwise read native option values. |
| `getResults` | `function \| null` | `null` | Load asynchronous suggestions; takes precedence over local data. |
| `renderResult` | `function` | `(value) => value` | Render a suggestion. |
| `renderSelection` | `function` | `(value) => value` | Render a selected tag. |
| `sanitize` | `function` | `(html) => $.sanitize(html)` | Sanitize strings used as HTML. |
| `isMatch` | `function` | Case/accent-insensitive substring match | `(value, term) => boolean` for local search. |
| `sortResults` | `function` | Normalized match position, then value | `(a, b, term) => number` for local sorting. |
| `validTag` | `function` | `(value) => !!value` | Validate each normalized string, including initial/API values. |
| `trimValue` | `boolean` | `false` | Trim selected values before validation and deduplication. |
| `maxSelections` | `number` | `0` | Selection limit; zero means unlimited. |
| `minSearch` | `number` | `1` | Minimum search length before suggestions appear. |
| `confirmKeys` | `string[]` | `[',', ' ']` | Additional keys that confirm free text. Enter also confirms. |
| `confirmOnBlur` | `boolean` | `true` | Confirm free text when focus leaves the entire control. |
| `clearOnBlur` | `boolean` | `true` | Clear free text on blur when `confirmOnBlur` is false. |
| `showClear` | `boolean` | `true` | Show a keyboard-operable removal button beside each tag. |
| `closeOnSelect` | `boolean` | `true` | Close suggestions after confirming a tag. |
| `debounce` | `number` | `250` | Remote-search delay in milliseconds. |
| `duration` | `number` | `100` | Menu opacity transition in milliseconds; respects reduced motion. |
| `maxHeight` | `string` | `'250px'` | Maximum scrolling menu height. |
| `appendTo` | `string \| HTMLElement \| null` | `null` | Menu destination; otherwise insert after the input group or generated control. |
| `fullWidth` | `boolean` | `false` | Match the menu width to the control. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | Preferred Popper placement. |
| `position` | `'start' \| 'center' \| 'end'` | `'start'` | Menu alignment. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement rather than flip it. |
| `spacing` | `number` | `0` | Gap between the menu and control. |
| `minContact` | `number \| false` | `false` | Minimum Popper contact with the control. |

Default `lang` values:

```js
{
    clear: 'Remove selection',
    error: 'Error loading data.',
    loading: 'Loading..',
    maxSelections: 'Selection limit reached.',
    search: 'Search',
}
```

### Local data, matching, and validation

```js
TagsInput.init(document.querySelector('#tags'), {
    data: ['Design', 'Development', 'Café', 'Testing'],
    trimValue: true,
    maxSelections: 3,
    validTag: (value) => value.length > 0 && value.length <= 30,
});
```

Local data is an array of primitive values. Numbers become strings; duplicates and nullish entries are removed. Without a term, suggestions retain their input order. Search normalizes both the candidate and term for case and accents, so `CAFÉ` matches `Cafe` and `Café`. Matches earlier in the string rank first, followed by normalized alphabetical order. Matching treats regular expression characters literally.

Selection normalization converts scalars/arrays to unique strings, removes nullish entries, optionally trims, validates, and applies the limit. Empty strings are rejected by the default validator. Whitespace-only strings remain valid unless trimming or custom validation rejects them. Limits are floored to nonnegative integers; negative or nonfinite limits become zero.

`confirmKeys` supplements Enter. With the default comma/space keys, use another key list when tags need spaces. Confirmation clears the editor even when the value is rejected or already selected. `confirmOnBlur` takes precedence over `clearOnBlur`; disable both to preserve unfinished input on blur. Composition input is not confirmed while IME composition is active.

### Asynchronous search and pagination

`getResults(request)` returns `{ results: values, showMore?: boolean }` or a promise/thenable for that object. Callbacks run with the component as `this` when declared as ordinary functions.

| Request | Meaning |
| --- | --- |
| `{ offset: 0 }` | First page for an empty search; `term` is omitted. Requires `minSearch: 0`. |
| `{ offset: 0, term: 'city' }` | First page for the search term. |
| `{ offset: 10, term: 'city' }` | Next page; offset counts raw previously returned entries, including duplicates. |

```js
const cities = Array.from({ length: 35 }, (_, index) => `City ${index + 1}`);

TagsInput.init(document.querySelector('#tags'), {
    minSearch: 0,
    getResults: async ({ offset, term = '' }) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const matches = cities.filter((value) =>
            value.toLowerCase().includes(term.toLowerCase()));
        return {
            results: matches.slice(offset, offset + 10),
            showMore: offset + 10 < matches.length,
        };
    },
});
```

The callback owns remote filtering and ordering. Results are normalized to strings and deduplicated across pages. Scrolling near the bottom loads another page; short pages load automatically until the menu can scroll. Empty pages stop pagination even if `showMore` is true. An empty first page hides the menu; a later empty page keeps existing suggestions. Synchronous throws, rejected promises, and malformed responses show `lang.error`. Search again or reopen to retry.

New searches, ineligible terms, hide, disable, and disposal invalidate queued/in-flight work. If the returned object has `cancel()`, TagsInput calls it; otherwise the operation may continue, but stale results are ignored. For example, a real service can return a cancellable fetch promise:

```js
function getResults({ offset, term = '' }) {
    const controller = new AbortController();
    const query = new URLSearchParams({ offset: String(offset), term });
    const pending = fetch(`/api/tags?${query}`, { signal: controller.signal })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Unable to load tags');
            }
            return response.json(); // { results: ['Design', ...], showMore: true }
        });
    pending.cancel = () => controller.abort();
    return pending;
}
```

Return that promise directly so its `cancel` method remains available. `setValue()` is synchronous and accepts free-entry values without looking them up remotely; requests have no value-resolution variant.

### Rendering and sanitization

Both renderers receive `(value, element)`. Return an HTML string, return an `HTMLElement`, or fill the destination and return nothing:

```js
TagsInput.init(document.querySelector('#tags'), {
    data: ['Design', 'Development', 'Testing'],
    renderResult(value, element) {
        const label = document.createElement('strong');
        label.textContent = value;
        element.append(label, document.createTextNode(' — suggested topic'));
    },
    renderSelection: (value) => value,
});
```

Returned strings, placeholders, and status messages pass through `sanitize`. Returned elements and direct DOM changes bypass string sanitization; use `textContent` for untrusted text. Accessible result names and removal labels use the tag value. Keep essential identifying information in that value even when adding custom markup.

## Data attributes

Serializable options accept kebab-case `data-ui-*` attributes:

```html
<select id="tags" multiple class="input-filled"
    data-ui-toggle="tagsinput"
    data-ui-placeholder="Add up to three topics"
    data-ui-max-selections="3"
    data-ui-trim-value="true"
    data-ui-min-search="0"
    data-ui-full-width="true"
    data-ui-data='["Design", "Development", "Testing"]'
    data-ui-confirm-keys='[","]'>
</select>
```

Array/object values use JSON. Other examples include `data-ui-show-clear="false"`, `data-ui-close-on-select="false"`, `data-ui-confirm-on-blur="false"`, and `data-ui-debounce="300"`. Supply callbacks and DOM nodes through JavaScript.

Initialization is explicit. The demo uses this shared selector after initializing examples with custom callbacks:

```js
$('[data-ui-toggle="tagsinput"]').tagsinput();
```

`data-ui-toggle="tagsinput"` does not initialize the add-on by itself. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `TagsInput.init(node, options?)` | `TagsInput` | Return the existing instance or initialize a native multiple select. |
| `add(value)` | `void` | Silently add a string or number after normalization. |
| `disable()` | `void` | Disable native/generated controls and close the menu. |
| `dispose()` | `void` | Cancel owned work, remove generated markup/listeners, and restore the native select. |
| `enable()` | `void` | Enable the native control; a disabled ancestor fieldset still takes precedence. |
| `getMaxSelections()` | `number` | Current limit; zero means unlimited. |
| `getPlaceholder()` | `string` | Current empty selection label. |
| `getValue()` | `string[]` | An independent copy of the selected values. |
| `hide()` | `void` | Close suggestions and cancel search work unless the hide event is canceled. |
| `remove(value)` | `void` | Silently remove a normalized tag. |
| `removeAll()` | `void` | Silently clear every selection. |
| `setMaxSelections(limit)` | `void` | Change the limit and silently truncate excess selections. |
| `setPlaceholder(text)` | `void` | Change the empty selection label. |
| `setValue(value)` | `void` | Silently select a scalar/array; `null` or `undefined` clears the selection. |
| `show()` | `void` | Open suggestions unless disabled or canceled; respects the search minimum. |
| `toggle()` | `void` | Toggle suggestions. |
| `update()` | `void` | Refresh editor width and menu position. |

`instance.node` exposes the original select and `instance.options` the frozen options. Disposal restores the select's original hiding state, `tabindex`, and `aria-hidden`, while preserving option identities, labels, reset defaults, and current values. Reinitialize to create a new instance after disposal. Private fields and methods are not extension points.

## Events

Events are dispatched on the native select:

| Event | When |
| --- | --- |
| `change.ui.tagsinput` | An effective user selection/removal changed the value. |
| `show.ui.tagsinput` | Before opening; cancel with `event.preventDefault()`. |
| `shown.ui.tagsinput` | The opening transition completed. |
| `hide.ui.tagsinput` | Before closing; cancel with `event.preventDefault()`. |
| `hidden.ui.tagsinput` | The closing transition completed. |

```js
import $ from '@fr0st/query';

$.addEvent('#tags', 'change.ui.tagsinput', (event) => {
    console.log(TagsInput.init(event.currentTarget).getValue());
});
```

fQuery exposes the namespace on `event.namespace`; the native type is `change`, `show`, etc. Initialization, API setters, form resets, and selection no-ops do not emit a component change event. Backspace, confirmation, and removal buttons emit one change per effective edit. Applications can explicitly notify after an API update with `$.triggerEvent(select, 'change.ui.tagsinput')`.

Lifecycle listeners may dispose the component; interrupted transitions do not emit stale completion events. Disabling an open control forces it closed even if a hide listener cancels the event.

## fQuery API

Importing TagsInput registers `tagsinput` on `fQuery.QuerySet`:

```js
import $ from '@fr0st/query';
import '@fr0st/ui-tagsinput';

const tagsInput = $('#tags').tagsinput({ fullWidth: true });
$('#tags').tagsinput('setValue', ['Design', 'Testing']);
$('#tags').tagsinput('add', 'Documentation');
const values = $('#tags').tagsinput('getValue');
$('#tags').tagsinput('remove', 'Design');
$('#tags').tagsinput('removeAll');
$('#tags').tagsinput('show');
$('#tags').tagsinput('hide');
$('#tags').tagsinput('dispose');
```

An options object initializes every matched select. A method name dispatches the public method with the remaining arguments. The first component or method result is returned.

## Accessibility

- Label the native select with `<label for>`, `aria-label`, or `aria-labelledby`. The editable combobox inherits its accessible name; clicking an associated label focuses the editor.
- Native `required`, disabled fieldsets, and `aria-describedby`, `aria-errormessage`, and `aria-invalid` are synchronized. Invalid native validation focuses the visible editor.
- The editor exposes its listbox relationship, expanded state, and active suggestion. Results expose selected state.
- Arrow keys open/navigate suggestions. Enter chooses the active result or confirms free text; confirmation prevents accidental form submission. Escape closes; Tab follows normal focus order and the configured blur policy.
- Backspace with an empty editor removes the last tag. Removal buttons are keyboard-operable and named `Remove selection: <value>` by default.
- IME composition is respected, and menu transitions honor reduced motion.

The original select remains in the form but is visually hidden and removed from keyboard navigation while the component is active. Essential field instructions should use labels/descriptions rather than only the placeholder.

## Forms

Use the native `name`, `required`, `disabled`, and `form` attributes normally:

```html
<form id="topics-form">
    <label for="topics">Topics</label>
    <select id="topics" name="topics" multiple required class="input-outline">
        <option value="Design" selected>Design</option>
        <option value="Testing">Testing</option>
    </select>
    <button type="submit">Submit</button>
    <button type="reset">Reset</button>
</form>
```

```js
TagsInput.init(document.querySelector('#topics'));
document.querySelector('#topics-form').addEventListener('submit', (event) => {
    event.preventDefault();
    console.log(new FormData(event.currentTarget).getAll('topics'));
});
```

The synchronized native select supplies submitted values; disabled fields are excluded. New tags create native options only when selected. Existing options keep their identity, labels, and defaults. `getValue()` follows selection order, while native `FormData` follows option order.

Reset restores native defaults and asynchronously updates the chips, clears the search, and closes the menu. Generated options are removed when no longer selected unless explicitly marked `defaultSelected`. Canceled resets leave the current state intact; reset emits no component change event. External form association and changes to the select's `form` attribute are supported.

After changing native selections programmatically, dispatch a bubbling `change` event to synchronize the component. Native option additions/removals are observed; `update()` only refreshes sizing and positioning.

## Themes and RTL

Load UI CSS before TagsInput CSS. Use `input-filled` or `input-outline` and optional `input-sm` / `input-lg` on the native select. See [the demo](./demo/index.html#integration) for input groups, floating labels, and modal-contained menus.

Colors inherit UI theme tokens. UI follows the system theme unless `data-ui-theme="light"` or `data-ui-theme="dark"` is set on the document or an ancestor. A menu appended outside a scoped theme needs that theme on its destination too.

```css
.tagsinput-menu {
    --ui-tagsinput-item-padding-y: .5rem;
    --ui-tagsinput-item-focus-bg: var(--ui-primary);
}
```

Set `dir="rtl"` on the document, an ancestor, or the select before initialization. Logical spacing and Popper start/end placement follow the copied direction. Changing `dir` on the select is observed; reinitialize after changing only an ancestor's direction.

## Migrating from v2

- Upgrade to UI 4 and fQuery 5. The package root is compiled ESM; browser globals come from the UMD files in `dist`.
- Initialize only `<select multiple>` elements. Tags normalize to unique strings, including numeric zero. `getValue()` returns a copy.
- `setValue`, `add`, `remove`, `removeAll`, and `setMaxSelections` are silent. Listen for user edits or explicitly dispatch notification after API updates.
- `setValue(null)` clears the selection. `trimValue` defaults to `false`; enable it to trim before validation and deduplication.
- Native options, labels, reset defaults, fieldset disabled state, and external native changes are preserved/synchronized.
- Replace underscore-field and prototype-module access with public methods and the inherited `node` / `options` getters. Prototype composition has been removed; `src/js/wrapper.js` is now `src/js/browser.js`.
- Replace Sass `@import` customization with `@use ... with (...)`. The variables partial is `_vars.scss`, and chips now use UI primary tokens with logical spacing. The custom Sass example above demonstrates the previous info color palette.

## Development

Use Node.js matching `^20.19.0 || ^22.13.0 || >=24`.

```bash
npm ci
npx playwright install --with-deps
npm run lint
npm test
npm run test:coverage
```

`npm test` builds JavaScript/CSS and runs Chromium, Firefox, and WebKit. `npm run test:browser`, `npm run test:headed`, and `npm run test:ui` use existing bundles; rebuild after source changes. `npm run lint:sass:unused` checks Sass variables.

Source-mapped Chromium coverage writes `coverage/index.html` and `coverage/lcov.info`. CI covers Node 20/22/24 with Chromium and Node 24 with Firefox/WebKit. Commit regenerated distribution files; CI rejects stale or untracked output.

To view the demo after building, serve the repository root, for example with `python3 -m http.server 8080`, then open `http://localhost:8080/demo/`. The demo uses UI v4 CDN assets and local TagsInput bundles. Async examples use deterministic local sample data.

Published GitHub releases trigger the npm publishing workflow with provenance. Configure npm trusted publishing for the `publish.yml` workflow and enable the repository in Codecov before relying on these integrations.

## License

Frost UI TagsInput is released under the [MIT License](./LICENSE).
