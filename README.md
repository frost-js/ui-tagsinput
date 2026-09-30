# FrostUI TagsInput

**FrostUI TagsInput** is a free, open-source Tags component for *JavaScript*.

It is built on top of the [FrostUI](https://github.com/elusivecodes/FrostUI) library.


## Table Of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Migrating to v3](#migrating-to-v3)
- [Custom Sass builds](#custom-sass-builds)
- [Development](#development)



## Installation

**Dependencies**

- [fQuery](https://github.com/elusivecodes/fQuery)
- [FrostUI](https://github.com/elusivecodes/FrostUI)

**CSS**

```html
<link rel="stylesheet" href="/path/to/frost-ui.min.css" />
<link rel="stylesheet" href="/path/to/frost-ui-tagsinput.min.css" />
```

**JS**

```html
<script type="text/javascript" src="/path/to/frost-ui-bundle.min.js"></script>
<script type="text/javascript" src="/path/to/frost-ui-tagsinput.min.js"></script>
```


## Usage

Check the demo folder for examples. Full documentation and website coming soon™.

## Migrating to v3

Version 3 uses Frost UI 4 and fQuery 5. Initialize TagsInput on a `<select multiple>`; other elements and single selects are rejected before registration.

- `setValue`, `add`, `remove`, `removeAll`, and `setMaxSelections` update silently, matching the other UI components. User edits emit one `change.ui.tagsinput` event when the selection actually changes. Applications that need notification after a programmatic update can explicitly call `$.triggerEvent(select, 'change.ui.tagsinput')`.
- Values are normalized to unique strings, including numbers such as `0`. `setValue(null)` clears the selection, and `getValue()` returns a copy. `trimValue` defaults to `false`; enable it to trim before validation and deduplication.
- Native options and their reset defaults are preserved. Form reset and external native `change` events synchronize the tags. The editor reflects disabled fieldsets, labels, descriptions, required state, and validation attributes.
- Internal state and methods are private. Use the public API and the inherited `node` and `options` getters instead of underscore fields or prototype modules. `dispose()` cancels pending work and restores native attributes while retaining the current values.
- Tag chips now use UI's primary color tokens, and spacing/alignment support RTL. Colors inherit UI's theme variables.

## Custom Sass builds

The stylesheet uses Sass modules. Configure it before another stylesheet loads it:

```scss
@use "@fr0st/ui-tagsinput/src/scss/tagsinput" with (
    $tagsinput-item-spacing: .5rem,
    $tagsinput-btn-bg: var(--ui-info),
    $tagsinput-btn-color: var(--ui-info-contrast),
    $tagsinput-btn-hover-bg: var(--ui-info-highlight)
);
```

Include `node_modules` in your Sass load paths (for the CLI, `--load-path=node_modules`). The example increases tag spacing and restores the previous info color palette. The variable partial is now `_vars.scss`; Sass resolves it as `vars`. Replace legacy `@import` customization with `@use ... with (...)`. Load the compiled UI stylesheet before the TagsInput stylesheet.

## Development

Use Node 20.19+, 22.13+, or 24+ within the supported major versions in `package.json`.

```sh
npm ci
npx playwright install --with-deps
npm run lint
npm test
npm run test:coverage
```

`npm test` builds the distribution and runs Chromium, Firefox, and WebKit. `npm run test:browser` runs against the existing build; use `-- --project=chromium` to select one browser. `npm run test:headed` and `npm run test:ui` open the interactive runners. Tests serve installed UI assets and local distribution files without CDN access.

Coverage uses Chromium and maps back to this package's JavaScript source. Reports are written to `coverage/index.html` and `coverage/lcov.info`. CI checks Node 20/22/24 with Chromium, plus Firefox and WebKit on Node 24, and uploads coverage to Codecov using OIDC. Commit regenerated `dist` files when source changes; CI verifies that the build leaves them unchanged.

Published GitHub releases trigger the npm publishing workflow. Configure the package's npm trusted publisher for `.github/workflows/publish.yml` and enable the repository in Codecov before relying on those integrations.
