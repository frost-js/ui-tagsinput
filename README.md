# Frost UI TagsInput

[![CI](https://github.com/frost-js/ui-tagsinput/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/frost-js/ui-tagsinput/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/frost-js/ui-tagsinput/branch/main/graph/badge.svg)](https://codecov.io/gh/frost-js/ui-tagsinput)
[![npm version](https://img.shields.io/npm/v/%40fr0st%2Fui-tagsinput?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-tagsinput)
[![npm downloads](https://img.shields.io/npm/dm/%40fr0st%2Fui-tagsinput?style=flat-square)](https://www.npmjs.com/package/@fr0st/ui-tagsinput)
[![JS gzip size](https://img.badgesize.io/frost-js/ui-tagsinput/main/dist/frost-ui-tagsinput.min.js?compression=gzip&label=JS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-tagsinput/blob/main/dist/frost-ui-tagsinput.min.js)
[![CSS gzip size](https://img.badgesize.io/frost-js/ui-tagsinput/main/dist/frost-ui-tagsinput.min.css?compression=gzip&label=CSS%20gzip%20size&style=flat-square)](https://github.com/frost-js/ui-tagsinput/blob/main/dist/frost-ui-tagsinput.min.css)
[![license](https://img.shields.io/github/license/frost-js/ui-tagsinput?style=flat-square)](./LICENSE)

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
- Existing-instance reuse with frozen resolved options
- Prebuilt ESM and UMD bundles with source maps
- Expanded and minified component CSS with source maps
- JSDoc-powered IntelliSense

Explore [the demo](./demo/index.html) for interactive examples.

## Installation

### Browser projects / bundlers

```bash
npm i @fr0st/ui-tagsinput
```

Frost UI TagsInput's package entry point is ESM-only and requires a browser DOM. Import the default `TagsInput` export and the stylesheets in browser projects and bundlers.

```js
import '@fr0st/ui/dist/frost-ui.min.css';
import '@fr0st/ui-tagsinput/dist/frost-ui-tagsinput.min.css';
import TagsInput from '@fr0st/ui-tagsinput';
```

`@fr0st/ui` and `@fr0st/query` are peer dependencies so the component shares the application's instances.

### Browser (ESM)

The ESM bundle imports `@fr0st/ui` and `@fr0st/query`. fQuery also imports `@fr0st/core`, so map all three dependencies when loading the bundle directly in a browser:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-tagsinput@latest/dist/frost-ui-tagsinput.min.css">
<script type="importmap">
{
    "imports": {
        "@fr0st/core": "https://cdn.jsdelivr.net/npm/@fr0st/core@latest/dist/frost-core.esm.min.js",
        "@fr0st/query": "https://cdn.jsdelivr.net/npm/@fr0st/query@latest/dist/fquery.esm.min.js",
        "@fr0st/ui": "https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.esm.min.js"
    }
}
</script>
<script type="module">
    import TagsInput from 'https://cdn.jsdelivr.net/npm/@fr0st/ui-tagsinput@latest/dist/frost-ui-tagsinput.esm.min.js';
</script>
```

### Browser (UMD)

Load the bundles from your own copy or a CDN:

```html
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="/path/to/dist/frost-ui-tagsinput.min.css">
<script src="/path/to/dist/frost-ui-bundle.min.js"></script>
<script src="/path/to/dist/frost-ui-tagsinput.min.js"></script>
<!-- or -->
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui.min.css">
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@fr0st/ui-tagsinput@latest/dist/frost-ui-tagsinput.min.css">
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui@latest/dist/frost-ui-bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@fr0st/ui-tagsinput@latest/dist/frost-ui-tagsinput.min.js"></script>
<script>
    const { TagsInput } = globalThis.UI;
</script>
```

The UMD bundle adds `TagsInput` to the existing `globalThis.UI` object. Load Frost UI's all-in-one bundle first; it supplies the `UI` and `fQuery` globals.

The package root resolves to the prebuilt ESM bundle. Published files under `dist/` and `src/` are also available through matching package subpaths.

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

Options are resolved in this order:

1. Component defaults
2. The element's `data-ui-*` attributes
3. Options passed to `TagsInput.init()`

Resolved `instance.options` are shallow-frozen.

Options resolve in this order:

1. `TagsInput.defaults`
2. The select's `data-ui-*` attributes
3. Options passed to `TagsInput.init()`

 Set application-wide defaults before initializing components:

```js
TagsInput.defaults.fullWidth = true;
TagsInput.defaults.debounce = 300;
```

`TagsInput.classes` holds structural/state class names; custom class names need corresponding CSS.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `appendTo` | `string \| HTMLElement \| null` | `null` | Menu destination; otherwise insert after the input group or generated control. |
| `clearOnBlur` | `boolean` | `true` | Clear free text on blur when `confirmOnBlur` is false. |
| `closeOnSelect` | `boolean` | `true` | Close suggestions after confirming a tag. |
| `confirmKeys` | `string[]` | `[',', ' ']` | Additional keys that confirm free text. Enter also confirms. |
| `confirmOnBlur` | `boolean` | `true` | Confirm free text when focus leaves the entire control. |
| `data` | `(string \| number)[] \| null` | `null` | Local suggestions; otherwise read native option values. |
| `debounce` | `number` | `250` | Remote-search delay in milliseconds. |
| `duration` | `number` | `100` | Menu opacity transition in milliseconds; respects reduced motion. |
| `fixed` | `boolean` | `false` | Preserve the preferred placement rather than flip it. |
| `fullWidth` | `boolean` | `false` | Match the menu width to the control. |
| `getResults` | `function \| null` | `null` | Load asynchronous suggestions; takes precedence over local data. |
| `isMatch` | `function` | Case/accent-insensitive substring match | `(value, term) => boolean` for local search. |
| `lang` | `object` | See below | Interface labels and status messages. |
| `maxHeight` | `string` | `'250px'` | Maximum scrolling menu height. |
| `maxSelections` | `number` | `0` | Selection limit; zero means unlimited. |
| `minContact` | `number \| false` | `false` | Minimum Popper contact with the control. |
| `minSearch` | `number` | `1` | Minimum search length before suggestions appear. |
| `placeholder` | `string` | `''` | Label shown when the selection/search is empty and the editor is not focused. |
| `placement` | `'auto' \| 'top' \| 'bottom' \| 'start' \| 'end'` | `'bottom'` | Preferred Popper placement. |
| `position` | `'start' \| 'center' \| 'end'` | `'start'` | Menu alignment. |
| `renderResult` | `function` | `(value) => value` | Render a suggestion. |
| `renderSelection` | `function` | `(value) => value` | Render a selected tag. |
| `sanitize` | `function` | `(html) => $.sanitize(html)` | Sanitize strings used as HTML. |
| `showClear` | `boolean` | `true` | Show a keyboard-operable removal button beside each tag. |
| `sortResults` | `function` | Normalized match position, then value | `(a, b, term) => number` for local sorting. |
| `spacing` | `number` | `0` | Gap between the menu and control. |
| `trimValue` | `boolean` | `false` | Trim selected values before validation and deduplication. |
| `validTag` | `function` | `(value) => !!value` | Validate each normalized string, including initial/API values. |

Default `lang` values:

```js
const lang = {
    clear: 'Remove selection',
    error: 'Error loading data.',
    loading: 'Loading..',
    maxSelections: 'Selection limit reached.',
    search: 'Search',
};
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

`confirmKeys` supplements Enter. With the default comma/space keys, use another key list when tags need spaces. Confirmation clears the editor even when the value is rejected or already selected. `confirmOnBlur` takes precedence over `clearOnBlur`; disable both to preserve unfinished input on blur. Input and confirmation keys respect the native event’s `isComposing` flag.

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

New searches, ineligible terms, successful hides, and disposal invalidate queued/in-flight work. Disabling requests a hide using the same cancellable lifecycle event. If the returned object has `cancel()`, TagsInput calls it; otherwise the operation may continue, but stale results are ignored. For example, a real service can return a cancellable fetch promise:

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

Synchronous validation, matching, and rendering callbacks are not coordinated with nested `setValue()` calls. Matching and sorting callbacks should only return their result; use lifecycle listeners to dispose the component.

Returned strings, placeholders, and status messages pass through `sanitize`. Returned elements and direct DOM changes bypass string sanitization; use `textContent` for untrusted text. Accessible result names and removal labels use the tag value. Keep essential identifying information in that value even when adding custom markup.

## Data attributes

Use kebab-case `data-ui-*` attributes for serializable options. Arrays and objects use JSON. Supply callbacks and DOM nodes through JavaScript.

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

Other examples include `data-ui-show-clear="false"`, `data-ui-close-on-select="false"`, `data-ui-confirm-on-blur="false"`, and `data-ui-debounce="300"`.

```js
import $ from '@fr0st/query';
import '@fr0st/ui-tagsinput';

$('[data-ui-toggle="tagsinput"]').tagsinput();
```

Data attributes configure options; they do not initialize TagsInput by themselves. Initialize the component through the class or fQuery plugin. Changing an option's data attribute after initialization does not reconfigure the existing instance.

## Methods

| Method | Returns | Description |
| --- | --- | --- |
| `TagsInput.init(node, options?)` | `TagsInput` | Return the existing instance for an element or create one. |
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
| `update()` | `void` | Refresh the menu position. |

Disposal restores the select's original hiding state, `tabindex`, and `aria-hidden`, while preserving option identities, labels, reset defaults, and current values. Reinitialize to create a new instance after disposal. Private fields and methods are not extension points.

## Lifecycle

Calling `TagsInput.init()` again for the same element returns its existing instance. Dispose the current instance before reinitializing with different options.

An instance exposes its original element as `instance.node` and its shallow-frozen resolved configuration as `instance.options`. Both become `null` after disposal.

`dispose()` releases resources owned by the component and removes its registered instance. Repeated disposal is safe and does not affect a new instance initialized on the same element. Use a new instance before calling other methods after disposal.

If initialization fails, the component releases resources it created and removes its registered instance before rethrowing the error. The element can then be initialized again.

## Events

Events are dispatched on the native select:

| Event | Description |
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

Lifecycle listeners may dispose the component; interrupted transitions do not emit stale completion events. Disabling an open control requests a hide; canceling the hide event keeps the menu open, as with SelectMenu.

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

Pass an options object to initialize every matched element, or pass a public method name followed by its arguments. The first component or method result is returned.

## Accessibility

- Label the native select with `<label for>`, `aria-label`, or `aria-labelledby`. The editable combobox inherits its accessible name; clicking an associated label focuses the editor.
- Native `required`, disabled fieldsets, and `aria-describedby`, `aria-errormessage`, `aria-invalid`, and `aria-required` are synchronized. Native validation remains on the select; set `aria-invalid` on it to expose validation errors on the editor.
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

Reset restores native defaults and asynchronously updates the chips, clears the search, and closes the menu. Generated options are removed when no longer selected unless explicitly marked `defaultSelected`. Canceled resets leave the current state intact; reset emits no component change event. External form association is supported. Reinitialize after changing the select's form owner.

After changing native selections programmatically, dispatch a bubbling `change` event to synchronize the component. Native option additions/removals are observed when suggestions come from the select. With `data` or `getResults`, dispatch `change` after changing native options or selections. `update()` only refreshes the menu position.

## Themes and RTL

Frost UI follows the user's preferred color scheme by default. Set `data-ui-theme="light"` or `data-ui-theme="dark"` on the document or an ancestor to select a theme explicitly.

Load UI CSS before TagsInput CSS. Use `input-filled` or `input-outline` and optional `input-sm` / `input-lg` on the native select. See [the demo](./demo/index.html#integration) for input groups, RTL layouts, and modal-contained menus.

Colors inherit Frost UI theme tokens. A menu appended outside a scoped theme needs that theme on its destination too.

Menus have a `10rem` minimum width, constrained to the available space. Customize it with `--ui-tagsinput-min-width` or the `$tagsinput-min-width` Sass variable. With `fullWidth`, the menu follows the control's width.

```css
.tagsinput-menu {
    --ui-tagsinput-item-padding-y: .5rem;
    --ui-tagsinput-item-focus-bg: var(--ui-primary);
}
```

Set `dir="rtl"` on the document, an ancestor, or the select before initialization. Logical spacing and Popper start/end placement follow the copied direction. Classes, sizing, and direction are copied at initialization; reinitialize after changing them.

### Custom Sass builds

Install Sass and create an application stylesheet to customize the component:

```bash
npm i -D sass
```

`src/styles.scss`

```scss
@use "@fr0st/ui-tagsinput/src/scss/tagsinput" with (
    $tagsinput-item-spacing: .5rem,
    $tagsinput-btn-bg: var(--ui-info),
    $tagsinput-btn-color: var(--ui-info-contrast),
    $tagsinput-btn-hover-bg: var(--ui-info-highlight)
);
```

Compile the entry point with npm package resolution enabled:

```bash
npx sass --load-path=node_modules src/styles.scss dist/styles.css
```

The `tagsinput` module forwards the [component variables](./src/scss/_vars.scss), all of which have `!default` values. Include Frost UI CSS separately. Build tools that already resolve Sass modules from npm packages do not need the explicit load path.

## Development

Install dependencies with `npm ci`, then install Playwright browsers with `npx playwright install --with-deps`.

```bash
npm test
npm run lint
npm run build
```

`npm test` rebuilds the bundles, then runs the Playwright suite in Chromium, Firefox, and WebKit. `npm run test:browser` runs the suite against the existing bundles, so rebuild after changing source files.

After building, `npm run test:coverage` runs Chromium tests and writes coverage reports to `coverage/`.

`npm run test:headed` and `npm run test:ui` also use the existing bundles and open headed browsers or the Playwright UI.

To view the demo, open `demo/index.html` in your browser after building.

## License

Frost UI TagsInput is released under the [MIT License](./LICENSE).
