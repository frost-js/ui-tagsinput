# Frost UI TagsInput v3 migration proposal

Date: 2026-09-30

Status: sections 1–7 implemented and locally verified. The full README rewrite and demo migration remain section 8 work. Hosted CI, Codecov, and npm trusted publishing still need repository-side verification/configuration.

## Recommendation

Release `@fr0st/ui-tagsinput` **3.0.0**, upgrading from 2.0.9 to Frost UI 4 and fQuery 5. Align packaging, source structure, builds, tests, coverage, CI, documentation, and demos with the current UI ecosystem. Include the correctness fixes below in the major release rather than carrying the existing defects into the refactor.

Keep TagsInput's purpose and existing API names: editable tags backed by a native multiple select, optional local or remote suggestions, and custom rendering. Do not turn it into SelectMenu or add SelectMenu-specific grouped-object data/value-resolution APIs.

The first implementation stage covered sections 1–3. The second stage implements sections 4 and 5: the component now runs with UI 4, and its Sass and generated styles follow the new UI conventions. Sections 6 and 7 add the permanent testing/coverage and CI setup described below. Release acceptance still requires the full documentation/demo migration and hosted integration checks.

## Implementation record: sections 1–3

- Updated the package to 3.0.0 with the proposed peers, development dependencies, exports, scripts, Node/browser support, and publication metadata. Ran `npx sort-package-json` and regenerated the lockfile.
- Added `.npmrc`, expanded `.gitignore`, and aligned ESLint/PostCSS configuration. Replaced Rollup with Vite and renamed `wrapper.js` to `browser.js`.
- Generated all 12 distribution files: four JavaScript bundles, two stylesheets, and their source maps. All distribution files, including the four new ESM files, were committed with this stage.
- Resolved UI 4.0.0, fQuery 5.0.0, and Vite 8.3.1. The release-age policy selects Sass Embedded 1.105.0 and Monocart 2.13.1. PostCSS CLI remains 11.0.1 for Node 20 compatibility.
- The resolved `baseline-browser-mapping@2.11.26` works with the build, so UI's older override was not copied.
- A clean `npm ci`, full build, changed-configuration ESLint check, CSS lint, unused-Sass check, and package dry run passed on Node 24.21.0/npm 11.19.0. Packed-package Chromium checks passed for ESM and both UMD dependency-loading styles, each minified and unminified: exports, shared dependencies, registration, and existing UI exports are preserved. All six asset source maps include embedded sources.
- At the end of this stage, lint reported **24 errors in existing JavaScript source** and Sass warned about `@import`. Both were resolved in sections 4 and 5 without disabling lint rules.
- At the end of this stage, initialization still failed because the source read `_node`, absent in UI 4. Section 4 resolved this blocker; initialization now passes through all six checked ESM/UMD loading combinations.
- Playwright/coverage dependencies and package scripts are in place. The configurations and test suite are still section 6 work; `npm test` is not yet an acceptance check for this intermediate state.

Additional tooling findings: the original lockfile reported 2.0.8 while `package.json` reported 2.0.9, and updating it in place hit an old/new Stylelint peer-resolution conflict. A fresh dependency resolution fixed both; the previous lockfile and installed dependencies are backed up under ignored `.tmp/pre-v3-dependencies/`.

Sass Embedded's optional fallback packages also bring in `sass`, which npm reports as extraneous on this platform and which can take ownership of the shared `sass` executable. `compile:css` therefore invokes `node node_modules/sass-embedded/dist/bin/sass.js` explicitly to guarantee the requested compiler; this is a deliberate, narrow difference from the reference script. npm also reports deprecated `glob`/`inflight` dependencies from the retained `clean-css-cli`, and an unapproved optional `@parcel/watcher` install script; neither blocked installation or the build, and no install-script approval was added.

## Implementation record: sections 4 and 5

- Replaced component prototype composition with one class containing static defaults/classes, private state/methods, typed JSDoc, and BaseComponent's `node`/`options` getters. `index.js` now only registers/exports the component; stateless normalization helpers live in `helpers.js`.
- Implemented the v3 contracts: require a multiple select before registration, normalize scalar/array/null values to unique strings, return copies, validate/trim/limit before comparison, keep API setters silent, and notify once for effective user changes, including Backspace.
- Preserved native option identities, labels, and reset defaults. Generated free-entry options are managed separately. Added native change/reset synchronization, dynamic external form ownership, fieldset/disabled handling, required/invalid accessibility state, label focus, and restoration of owned attributes on disposal.
- Moved editable combobox semantics to the editor, fixed active-descendant spelling/lifecycle, and added native keyboard-operable removal buttons with tag-specific accessible names. Confirmation handles closed menus, Enter, configured keys, IME composition, and the three supported blur-policy combinations.
- Replaced JS fades with guarded UI CSS transitions. Queued/debounced/throttled work and cancellable requests are invalidated on newer searches, ineligible terms, hide, disable, and disposal. Synchronous request errors, stale completions, thenables, pagination offsets, and consumer callback disposal are handled.
- Migrated Sass to `_vars.scss`, `@forward`, and `@use`, with namespaced variables. Chips use primary UI tokens; styles use logical alignment/spacing, inherit editor typography/color, bound long content, and support UI sizes, input groups, floating labels, RTL, modal positioning, and reduced motion.
- Added focused v3 behavior and Sass customization notes to README; the comprehensive README/demo rewrite remains section 8 work. The documented `@use ... with (...)` example was compiled and its spacing/color overrides verified.
- Regenerated all JS/CSS bundles and source maps. Build, full ESLint/Stylelint, unused-Sass checking, and bundle/source-map verification pass. No legacy underscore instance fields, prototype directory/composition, misspelled active-descendant attributes, or Sass `@import` remain in source.

Verification used a local, ignored harness under `.tmp/section45/`, leaving the permanent Playwright/Codecov setup for section 6. **66 focused cases passed in each of Chromium, Firefox, and WebKit (198 passes total across the main and lifecycle runs).** Checks cover API/QuerySet initialization, values and event counts, disposal from callbacks, forms/reset/validation, keyboard/IME/blur, async errors/cancellation/pagination/debounce, real interrupted transitions, UI sizing, long content, RTL, input groups, floating labels, and modal integration. Assertions use locators for DOM behavior; no light/dark test duplication was added. ESM and both UMD dependency-loading styles, minified and unminified, also pass initialization/registration checks.

Two additional issues were exposed and fixed by these regressions: native form ownership changes could be lost when internal option updates drained observer records, and a focusout microtask could run before focus reached a removal button and prematurely confirm text. Form ownership is refreshed with control state, and focusout checks `relatedTarget` before scheduling blur work.

Local verification commands (the harness is not part of the published package or permanent suite):

```sh
npm run lint
npm run lint:sass:unused
npm run build
npx playwright test --config .tmp/section45/playwright.config.js
node .tmp/verify-bundles.mjs
```

## Implementation record: sections 6 and 7

- Added the reference Playwright configurations, `#test` import, local asset server, HTML fixture, opt-in clock fixture, and Chromium source coverage. The four component test files follow the SelectMenu/AuthCodeInput patterns: named class/QuerySet initialization and disposal cases, separate method groups, events, user interactions, option groups, and the reference form/remote/style grouping. Instances remain local or use Playwright handles; later public calls use QuerySet dispatch.
- DOM checks use locator assertions. Request fields, event counts/order, instance identity, and public return values are asserted directly. Remote tests use the reference controlled-promise helper and mock clock. No light/dark duplication, skipped tests, or arbitrary sleeps were added.
- Added the UI Codecov policy: 95% project target, 5% threshold, CI failures treated as errors, and informational patch status. Coverage includes `helpers.js`, `index.js`, and `tags-input.js`; only the erased browser re-export entry is excluded.
- Added the Node 20/22/24 Chromium matrix and Node 24 Firefox/WebKit lanes. Node 24 Chromium uploads LCOV using Codecov OIDC. Both workflows lint, build, test, inspect the package, and reject changed or untracked generated bundles.
- Added release-triggered npm publishing with provenance and OIDC. No release, publish, or coverage upload was performed. npm trusted publishing and Codecov repository access still require external configuration.
- Verified current official action releases and used `actions/checkout@v7`, `actions/setup-node@v7`, and `codecov/codecov-action@v7`. This updates the reference checkout/setup-node majors to their current releases: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0), and [Codecov v7.1.1](https://github.com/codecov/codecov-action/releases/tag/v7.1.1).
- Documented development commands and integration setup in README. The comprehensive README and demo rewrite remains section 8.

Verification completed:

- **174 cases pass in Chromium, Firefox, and WebKit (522 browser/case combinations).** Chromium ran the complete final suite; Firefox/WebKit passed the original 172 cases and targeted reruns for the two added cases and extended toggle case. No failures, retries, or skipped tests remain.
- Node **20.20.2**, **22.23.3**, and **24.21.0** each passed the build and complete Chromium suite. ESLint passes on all three runtimes; full lint and unused-Sass checks pass. All three builds reproduce the tracked distribution without changes.
- Final source coverage: **97.76% lines, 97.21% statements, 91.24% branches, and 100% functions**. Runtime helpers and component registration have complete line coverage. No coverage exclusions or targets were weakened.
- Workflow/Codecov YAML and multiline shell syntax checks pass. The actual hosted Actions jobs, Codecov upload, and npm publish have not been executed.
- No additional component runtime or styling fixes were needed in this stage. The previous source/style work was committed as `e645033` before these testing/CI changes.

Package consumption is checked separately from the component suite: ESM and both UMD dependency-loading arrangements pass minified/unminified initialization and registration checks, preserve shared UI/query dependencies, and retain source maps with embedded sources. The dry-run package contains 21 files; test infrastructure, workflows, and reports are excluded. Workflow/Codecov YAML parses successfully.

Local browser verification uses an ignored wrapper with a dedicated port and process-readiness signal because another sibling project is testing concurrently and this environment delays probes to unopened ports. The tracked Playwright configuration retains the reference port, asset server, and HTTP readiness check. Hosted GitHub Actions and the external OIDC integrations have not been run locally.

## Reference projects and precedence

| Reference | Apply here |
| --- | --- |
| [`../ui`](../ui) | Primary authority for Node/browser support, component lifecycle, styling, script names, CI, coverage policy, and documentation conventions. |
| [`../ui-authcodeinput`](../ui-authcodeinput) | Add-on peer dependencies, default ESM export/named browser export, private class members, form behavior, and browser fixtures. |
| [`../FrostUI-SelectMenu`](../FrostUI-SelectMenu) | Closest component: Vite plus Sass build, native select synchronization, removable selections, async requests, positioning, accessibility, tests, and demo structure. |
| [`../fquery`](../fquery) | Verify query, event, debounce, geometry, and cleanup API signatures against v5. |

The requested `../ui-selectmenu` directory does not exist in this workspace. `../FrostUI-SelectMenu` contains the migrated `@fr0st/ui-selectmenu@4.0.0` and is the reference used here. Preserve this project's verified repository URLs (`elusivecodes/FrostUI-TagsInput`); the `frost-js` organization used by UI and AuthCodeInput does not establish that this repository has moved.

Where the examples differ, follow UI's conventions with the add-on adaptations from SelectMenu. Follow the user's assertion requirements even where older reference tests use large `.toEqual({...})` snapshots.

## 1. Dependencies and package metadata

The table combines local reference manifests with live npm registry metadata retrieved on 2026-09-30. “Latest” is a point-in-time registry result, not a claim that the sibling manifests already use it. Recheck versions and release age when implementing.

| Package | Registry latest | Proposed initial range | Reason |
| --- | --- | --- | --- |
| `@fr0st/query` | 5.0.0 | `^5.0.0` | Peer and development dependency, matching all three references. |
| `@fr0st/ui` | 4.0.0 | `^4.0.0` | Peer and development dependency. |
| `@fr0st/eslint-config` | 5.0.3 | `^5.0.3` | Shared lint rules. |
| `@fr0st/stylelint-config` | 4.0.2 | `^4.0.2` | Shared Sass rules. |
| `@playwright/test` | 1.63.0 | `^1.63.0` | Browser tests. |
| `vite` | 8.3.1 | `^8.3.1` | Latest patch of the references' Vite 8.3 line. |
| `eslint` | 10.11.0 | `^10.11.0` | Matches the newer SelectMenu baseline. |
| `stylelint` | 17.15.0 | `^17.15.0` | Matches UI. |
| `sass-embedded` | 1.105.1 | `^1.105.0` initially | 1.105.1 was published September 29 and is inside the minimum release age. |
| `autoprefixer` | 10.6.1 | `^10.6.1` | Matches UI. |
| `postcss` | 8.5.28 | `^8.5.28` | Matches UI. |
| `postcss-cli` | 12.0.0 | `^11.0.1` | Explicit compatibility exception: v12 requires Node >=22, conflicting with UI's Node 20 CI lane. |
| `clean-css-cli` | 5.6.3 | `^5.6.3` | Retain the UI CSS minification pipeline. |
| `find-unused-sass-variables` | 6.2.1 | `^6.2.1` | Shared Sass check. |
| `monocart-reporter` | 2.14.0 | `^2.13.1` initially | 2.14.0 was published September 29 and is inside the minimum release age. |

Sources: [UI metadata](https://registry.npmjs.org/@fr0st%2Fui), [fQuery metadata](https://registry.npmjs.org/@fr0st%2Fquery), [Vite metadata](https://registry.npmjs.org/vite), [PostCSS CLI metadata](https://registry.npmjs.org/postcss-cli), [Sass metadata](https://registry.npmjs.org/sass-embedded), and [Monocart metadata](https://registry.npmjs.org/monocart-reporter). Other rows were checked against the corresponding public npm package metadata endpoint.

Recommend preserving UI's Node support instead of independently dropping Node 20 to adopt PostCSS CLI 12. If adopting every latest major is mandatory, first coordinate the Node engine and CI change with UI and the other components. This is the one substantive conflict between “latest versions” and complete reference alignment.

Use Sass 1.105.1 and Monocart 2.14.0 once eligible under the shared release-age policy and validated. The lockfile must resolve eligible versions; a caret range alone does not enforce release age. Do not add exceptions for these tools merely to install a release early.

Package changes:

- Keep the package name; bump to `3.0.0`; update description, keywords, author formatting, and `git+https` repository metadata to the reference style.
- Set `main` and `module` to `./dist/frost-ui-tagsinput.esm.js`. Export `.` with `import` and `default` entries pointing there, plus `./dist/*` and `./src/*` subpaths.
- Set `jsdelivr` and `unpkg` to `./dist/frost-ui-tagsinput.min.js`. Keep the existing published file allowlist: `dist`, `LICENSE`, `README.md`, and `src`.
- Set `engines.node` to `^20.19.0 || ^22.13.0 || >=24`, `browserslist` to `baseline newly available`, and `publishConfig.access` to `public`.
- Declare UI/query as peers and dev dependencies. They must remain external in both bundle formats to preserve shared component registration and state.
- Remove direct `rollup`, `@rollup/plugin-node-resolve`, `terser`, and `sass` dependencies; use Vite and `sass-embedded`.
- Use UI/SelectMenu script names: `build`, `build:js`, `build:css`, `compile:css`, `autoprefix:css`, `minify:css`, `lint`, `lint:js`, `lint:css`, `lint:sass:unused`, `test`, `test:browser`, `test:coverage`, `test:headed`, and `test:ui`.
- Run **`npx sort-package-json`** after editing the manifest, on Node 24. Registry latest `sort-package-json@4.0.0` requires Node >=22; this maintenance command need not become a package dependency or run in the Node 20 CI lane.
- Regenerate and commit `package-lock.json`; validate with `npm ci`. Do not copy sibling lockfiles or use sibling `file:` dependencies in the published package.
- Investigate UI's `baseline-browser-mapping` override against the newly resolved lockfile; carry it over only if needed and document why.

## 2. Repository configuration

Add `.npmrc` matching SelectMenu, including UI in the internal-package exclusions:

```ini
min-release-age=3
min-release-age-exclude[]=@fr0st/eslint-config
min-release-age-exclude[]=@fr0st/stylelint-config
min-release-age-exclude[]=@fr0st/core
min-release-age-exclude[]=@fr0st/query
min-release-age-exclude[]=@fr0st/ui
```

Expand `.gitignore` using the reference headings and entries: `node_modules/`, `.tmp/`, `coverage/`, `playwright-report/`, and `test-results/`. Keep `dist/` and `package-lock.json` tracked, consistent with UI's generated-bundle verification.

Update `eslint.config.js` to the shared default, browser, and scoped Node configs. Ignore generated output; apply Node globals to configuration and static-server files, and browser test globals only to the relevant test files. Keep Stylelint based on the shared config. Retain PostCSS/Autoprefixer, modernizing configuration syntax to match UI.

## 3. Vite and distribution outputs

Replace `rollup.config.js` with `vite.config.js`, following SelectMenu's `rolldownOptions` configuration for Vite 8. Rename `src/js/wrapper.js` to `src/js/browser.js`.

| Mode | Entry | Output |
| --- | --- | --- |
| Default / ESM | `src/js/index.js` | `frost-ui-tagsinput.esm.js` and `frost-ui-tagsinput.esm.min.js` |
| UMD | `src/js/browser.js` | `frost-ui-tagsinput.js` and `frost-ui-tagsinput.min.js` |
| CSS | `src/scss/tagsinput.scss` | `frost-ui-tagsinput.css` and `frost-ui-tagsinput.min.css` |

Generate source maps for every JS/CSS output. Preserve a default `TagsInput` ESM export and the named `UI.TagsInput` browser export. UMD must use `extend: true`, `name: 'UI'`, and globals `@fr0st/query: 'fQuery'`, `@fr0st/ui: 'UI'`, preserving existing UI components.

Use `target: 'baseline-widely-available'`, per-output minification, and `sourcemap: true`. Run ESM first with output cleanup, then UMD without cleanup, then CSS. This avoids either build mode deleting previously generated assets. Do not add an all-dependencies TagsInput bundle: the references use the UI bundle plus an externalized add-on.

Verify real UMD and ESM consumption, including minified outputs, external dependency resolution, fQuery registration, and coexistence with existing `UI` exports. A browser ESM example must provide an import map for bare package imports, including any transitive bare imports used by the selected dependency bundles.

## 4. JavaScript source and component contract

Keep the JS/Sass layout used by UI and SelectMenu:

```text
src/
  js/
    browser.js
    index.js
    tags-input.js
    helpers.js
  scss/
    _vars.scss
    tagsinput.scss
```

Move methods into `TagsInput`; delete `src/js/prototype/` and all prototype composition. Put `static classes` and typed `static defaults` in the class. Keep `index.js` limited to component registration and the default export; `browser.js` provides the named export. Extract only stateless helpers, such as text/value normalization, into `helpers.js`.

Use BaseComponent's **`this.node` and `this.options`** getters. Replace component-owned underscore properties/methods with declared `#private` members. Do not mutate the frozen options object: keep mutable placeholder, selection limit, request state, and selection in private fields.

Add JSDoc for the class, constructor, public methods, private helpers, and options/callbacks. Define `TagsInputOptions`, language options, scalar tag values, remote request/result shapes, and renderer/matcher/validator callbacks. Document accepted values, defaults, null handling, callback `this` behavior, event semantics, and disposal effects.

### Proposed v3 behavior decisions

| Area | Proposed contract |
| --- | --- |
| Native element | Require `<select multiple>`, validating before component registration. The control represents an array of tags; silently accepting a single select produces inconsistent form values. |
| Public API | Retain `add`, `remove`, `removeAll`, `getValue`, `setValue`, `getMaxSelections`, `setMaxSelections`, `getPlaceholder`, `setPlaceholder`, `enable`, `disable`, `show`, `hide`, `toggle`, `update`, `dispose`, and inherited `init`. |
| Values | Normalize string/number scalars or arrays to unique strings matching native option values; `null`/`undefined` clears. `getValue()` returns a copy. Explicitly document numeric conversion and preserve zero as `'0'`. |
| Validation | Normalize, optionally trim, validate, deduplicate, and enforce the limit before comparing with the previous selection. Declare `trimValue` explicitly, defaulting to `false` to preserve existing default whitespace behavior. Normalize limits to nonnegative integers; zero means unlimited. |
| Programmatic changes | Follow SelectMenu/AuthCodeInput: setters and programmatic add/remove operations update silently. This is a deliberate breaking change from v2's event-emitting setters; document how consumers can explicitly notify their application. |
| User changes | Emit one `change.ui.tagsinput` for an actual selection change, including Backspace. Invalid input, duplicates, and additions beyond the limit do not emit change. |
| Suggestions | Preserve primitive local data and `getResults({ offset, term }) -> { results, showMore }`, including promises and optional cancellation. Do not add remote value resolution: arbitrary tags are valid without fetching them. |
| Existing defaults | Preserve TagsInput-specific defaults such as `minSearch: 1`, comma/space confirmation, `confirmOnBlur`, `clearOnBlur`, `showClear`, and `closeOnSelect`, except documented fixes. Do not accidentally inherit SelectMenu defaults. |
| Lifecycle | Preserve cancellable `show`/`hide` and completion `shown`/`hidden` events. Support interrupted transitions, disposal from callbacks, and safe repeated disposal. |

### Lifecycle, asynchronous work, and native forms

- Replace JS fades with the UI/SelectMenu CSS transition pattern and `waitForTransition`. Retain the duration option through a component CSS variable, respect reduced motion, and guard completion with a transition identifier and live-node checks.
- Own and cancel debounce/throttle callbacks, pending requests, reset timers, observers, and window/document listeners. Invalidate pending work on newer searches, ineligible search terms, hiding, disabling, and disposal.
- Retain the original cancellable request object before promise assimilation. Catch synchronous callback throws as well as rejections; ignore stale success/error/finally handlers. Prevent repeated pagination requests while a page is queued or loading.
- Preserve original option nodes and their `defaultSelected` state instead of rebuilding the select destructively. Add generated tag options separately; keep current selection, reset defaults, and retained suggestions distinct.
- Synchronize external native `change` events, selected options, form submission, reset, disabled fieldsets, required/invalid state, and changes to supported native attributes. Follow SelectMenu's form ownership and observer lifecycle; do not emit synthetic changes during reset or native-change reflection.
- Restore attributes owned by the component on disposal, including the original tabindex and visibility/ARIA state, without discarding unrelated changes made by consumers. Preserve the current submitted values and original option identities.
- Check current Popper and fQuery signatures. In particular, use `$.width(reference, { boxSize: $.BORDER_BOX })` for full-width measurement and follow SelectMenu's measurement-before-positioning approach.

### Accessibility and input behavior

Put the editable `combobox` role on the focusable text input, associated with a labeled listbox. Use correctly spelled `aria-activedescendant`, synchronized `aria-controls`, `aria-expanded`, and `aria-autocomplete`; clear active references when options disappear. Preserve the original label, description, required/invalid semantics, and label-click focus behavior.

Render removal controls as real `button type="button"` elements with useful accessible names and native disabled behavior. Keep decorative tag text noninteractive. Support arrows, Enter/NumpadEnter, Escape, Backspace, configured confirmation keys, blur policies, and normal Tab navigation. Ignore confirmation during IME composition and prevent form submission when Enter actually commits a tag or suggestion.

Use the normalization helper for both the value and search term so matching and ranking agree for case and diacritics. Preserve sanitization for string renderer output, support returned DOM elements and direct element mutation, and verify renderer callbacks cannot continue work on a disposed instance.

## 5. Sass and UI 4 styling

TagsInput owns meaningful CSS, so a Sass update and focused layout/style tests are required.

- Rename `vars.scss` to `_vars.scss`. Replace `@import` with `@forward "vars"` and `@use "vars"`; qualify variable references and document `@use ... with (...)` customization.
- Retain the public `tagsinput-*` class and Sass/CSS variable namespace where practical. Use UI 4's tokens and SelectMenu's conventions for placeholder, button, menu, focus, disabled, and validation styling.
- Align default chip colors with SelectMenu's primary/primary-contrast/primary-highlight tokens; document the visual change from the current info palette. Preserve custom Sass overrides.
- Use `gap`, logical padding/margins, and `text-align: start`. Add bounds and overflow behavior for long tags, narrow controls, and suggestions.
- Give the editor `font: inherit` and `color: inherit`, with bounded width measurement that includes the actual font metrics. Verify small/default/large filled and outline controls.
- Align the generated `.form-input` structure with UI's input groups and floating labels. Check chip sizing against UI button/input selectors; copy SelectMenu's explicit sizing corrections only where the same cascade applies.
- Add component opacity transition styles and reduced-motion handling. Verify `appendTo`, full-width positioning, modal clipping/focus behavior, and RTL placement.

There are currently **no TagsInput-specific light/dark selectors or independent theme palettes**; colors inherit UI variables. Keep a theme switch in the demo, but do not add duplicate light/dark test suites. If implementation introduces component-owned theme rules, add narrowly scoped tests for those rules only.

## 6. Playwright and Codecov

Adopt the reference infrastructure: `playwright.config.js`, `playwright.coverage.config.js`, `test/package.json` with the `#test` import, `test/support/test.js`, `test/support/app/index.html`, and `test/support/server/static-server.js`. Add `test/setup/browser.js` for the same opt-in clock fixture used by SelectMenu.

Run Chromium, Firefox, and WebKit against built assets. Serve UI JS/CSS from the installed package and TagsInput JS/CSS from `dist`; no CDN or sibling directory dependencies in tests. Use the reference port/base URL, reduced-motion setting, viewport, `--forbid-only`, and automatic fixture setup. Wait for CSS readiness before layout assertions.

### Describe grouping and order

Mirror the reference files rather than inventing a new grouping system. Use `import { expect, test } from '#test'`, an outer component describe, and shared DOM setup in `test.beforeEach`. Test class and QuerySet initialization/disposal using the reference parameterized cases.

| File / outer describe | Nested groups, in order |
| --- | --- |
| `tags-input.test.js` / `TagsInput` | `#init`, `#dispose`, `#disable`/`#enable`, `#getValue`, `#setValue`, `#add`, `#remove`, `#removeAll`, `#getMaxSelections`/`#setMaxSelections`, `#getPlaceholder`/`#setPlaceholder`, `#show`/`#hide`/`#toggle`, `#update`, `events`, `user events`, then option groups. |
| Main-file option groups | `data option`, `matching and sorting`, `minSearch option`, `closeOnSelect option`, `maxSelections option`, `confirmKeys option`, `confirmOnBlur option`, `clearOnBlur option`, `showClear option`, `trimValue option`, `validTag option`, `rendering and sanitization`. |
| `tags-input-form.test.js` / `TagsInput forms` | `native synchronization`, `submission`, `validation`, `disabled state`, `reset`, `keyboard navigation`, `disposal`. |
| `tags-input-data.test.js` / `TagsInput remote results` | `responses`, `errors and retry`, `cancellation`, `pagination` (including nested `automatic pagination`), `debounce`. Omit SelectMenu's value-resolution group because TagsInput does not have that API. |
| `tags-input-style.test.js` / `TagsInput styles` | `control sizing`, `selection overflow`, `search sizing`, `menu sizing and overflow`, `input groups`, `floating labels`, `focus, disabled, and validation styling`, `attachment and positioning`, `modal integration`. |

Parameterize shared public-method cases for class and QuerySet calls where useful; retain UI's separate final `QuerySet` group if additional dispatch/return-value coverage is needed. Do not duplicate whole suites just to repeat the same DOM assertions through both entry points.

### Assertion and regression requirements

Use `getByRole`/`getByLabel` and locator assertions such as `toHaveValues`, `toHaveValue`, `toHaveText`, `toHaveCount`, `toHaveAttribute`, `toHaveAccessibleName`, `toBeFocused`, `toBeDisabled`, `toBeVisible`, and `toHaveCSS`.

For example, use `await expect(page.locator('#tags')).toHaveValues(['red', 'blue'])` rather than evaluating a DOM state object and comparing it with `.toEqual`. Use scalar `toBe`/`toBeNull` for identity and API state; array equality is appropriate when testing the actual public `getValue()` result. Test request fields individually and event order/count explicitly. For geometry, poll relevant numeric measurements with meaningful bounds instead of snapshotting a large rectangle object.

Cover every issue in the findings table below, along with ordinary typing, selection, removal, sanitized rendering, correct event cancellation/order, multiple instances, class/QuerySet parity, form reset cancellation, external form association, detached elements, and disposal during callbacks. Exercise UMD/ESM package entry points separately from the main UMD-based behavioral fixture.

Use controlled promises and Playwright's clock for debounce, throttling, reset, and request races. Avoid arbitrary sleeps. Include a targeted real-transition case where reduced motion is disabled so interrupted animation behavior is tested as well as the default reduced-motion path.

### Coverage

Use Chromium V8 coverage via Monocart and `FROST_UI_TAGSINPUT_COVERAGE`. Map `frost-ui-tagsinput.js` to its source map; report `console-summary`, HTML, and `coverage/lcov.info`. Filter to this project's `src/js/`, include unexecuted source files with `all`, and exclude the browser entry only because it contains erased re-exports. Keep `index.js` registration and all runtime helpers in coverage. Exclude dependency code.

Add `.github/codecov.yml` matching UI: project target **95%**, threshold **5%**, `if_ci_failed: error`, and informational patch coverage. Do not relax the target or exclude difficult runtime paths to obtain a passing result. The measured local results are recorded above; the hosted Codecov status remains subject to repository setup and upload.

## 7. CI and publishing

Add `.github/workflows/ci.yml` following UI's main-branch push / pull-request triggers and Markdown-only path ignores. Use the verified current action majors (`actions/checkout@v7`, `actions/setup-node@v7`, `codecov/codecov-action@v7`); checkout/setup-node have advanced since the reference workflows.

Use the same matrix: Node 20/22/24 with Chromium, plus Node 24 with Firefox and WebKit. Each lane runs `npm ci`, installs its Playwright browser with system dependencies, lints, builds, and tests. Node 24/Chromium runs the dedicated coverage configuration and uploads only `coverage/lcov.info` using Codecov OIDC with upload failures treated as errors.

Verify tracked generated output with `git diff --exit-code -- dist` and package contents with `npm pack --dry-run`. During the initial migration also check untracked output: `git diff` alone will not catch newly generated ESM files missing from the commit.

Add the reference release-triggered `.github/workflows/publish.yml`: Node 24, clean install, lint, build, Chromium tests, package inspection, and `npm publish --provenance`. Configure npm trusted publishing and Codecov repository access before relying on those integrations; workflow files alone cannot establish the external setup. The migration does not itself create a release or publish a package.

## 8. README and demos

Rewrite the README in the reference order: introduction and verified badges, Highlights, Installation (bundler, browser ESM, browser UMD, custom Sass), Usage, Options, Data attributes, Methods, Events, fQuery API, Accessibility, Forms, Themes and RTL, Development, and License. Add a v2-to-v3 migration section.

Document dependency versions, supported runtimes, stylesheet load order, the default ESM import, UMD globals, explicit initialization, all supported options/defaults, callback shapes, asynchronous paging/cancellation, sanitization, form submission/reset, and cleanup. State the new silent-setter contract and required `multiple` attribute. Remove the unfinished-documentation placeholder and avoid claiming Node/server-side DOM support merely because the package is ESM.

Replace the six duplicated demo pages with `demo/index.html`, `demo/assets/demo.js`, and `demo/assets/demo.css`, following UI/SelectMenu's header, section navigation, card layout, spacing, theme selector, and methods/event log. Use `@fr0st/ui@4` npm CDN assets with local TagsInput bundles; remove the old GitHub `@latest` URLs. Keep interactive behavior in the demo script.

Include filled/outline and all sizes, initial tags, free entry, local suggestions, validation, limits, custom renderers, confirmation/blur settings, removal controls, async loading/error/retry/pagination, forms/reset, disabled fieldsets, input groups, floating labels, modal integration, and methods/events. Use deterministic local async sample data. Explicitly initialize examples; do not imply the add-on automatically initializes from markup. Old demo URLs can become small redirects if preserving links is useful.

## 9. Bugs and other issues found

The following table records the original v2 findings; runtime/source/style fixes are implemented in sections 4 and 5, with permanent regression coverage and CI added in sections 6 and 7; full documentation/demo work follows in section 8. Original evidence was primarily source inspection. Four logic defects were additionally reproduced by executing the existing functions in an isolated Node context with minimal query/DOM stubs; that is not a full browser regression run. There was no Playwright suite at proposal time. The second-stage browser verification is recorded above; permanent suite/coverage results are recorded in sections 6 and 7.

| Priority | Finding and evidence | Proposed fix / regression |
| --- | --- | --- |
| Blocker | `src/js/tags-input.js` and every prototype module use `_node`/`_options`; UI 4's `base-component.js` exposes `node`/`options` over private fields. A version-only upgrade cannot initialize correctly. | Migrate the entire component to the new base contract; test initialization, registration, options, and disposal. |
| High | `prototype/parsers.js` uses `{}` and `value in lookup`. Reproduced: `'toString'` resolves to an inherited function instead of an option; `'constructor'`/`'__proto__'` have analogous collisions. | Use a `Map`; test reserved-name tags through selection and native form values. |
| High | `prototype/api.js` advertises scalar `setValue`, but `helpers.js` calls `value.filter`. Reproduced: `setValue('blue')` throws. | Normalize scalar/array/null values before validation; test string/number/zero inputs. |
| High | `getValue()` returns `_value` directly. Reproduced: pushing into the returned array mutates internal state without rendering or form synchronization. | Return a copy; test both returned-array and supplied-array mutation. |
| High | `_setValue` compares before `_refresh` deduplicates/truncates. Reproduced: adding an existing tag emits change while the final selection is unchanged. | Normalize before comparison; test user duplicate/limit no-ops and the new silent API contract. |
| High | `events.js` removes the last tag with `_value.pop()` and `_refresh()` without notifying the native select. | Route Backspace through the same user-change path as other removals; assert one change event and updated submitted values. |
| High | `_refresh` empties the native select and recreates only selected values. Original option labels, identities, unselected options, and reset defaults are lost; there is no reset/native-change synchronization. | Preserve original options/defaults, manage generated tags separately, and add form/reset/disposal coverage. |
| High | `_refreshDisabled` changes class/tabindex but never disables the editor or guards all mutation handlers. A disabled control can still be focused programmatically and edited; disabling an open control does not close it. | Propagate native disabled state, guard user actions, close/cancel work, and test disabled fieldsets too. |
| High | `aria-activedescendent` is misspelled throughout render/data/events/lifecycle code. The combobox sits on a nonfocusable wrapper, the editor has a generic Search label, and removal controls are nonfocusable divs. | Correct the accessible structure and attributes; test labeling, focus, keyboard removal, and active-option references. |
| High | Enter/NumpadEnter paths do not prevent default and merely open a closed menu before returning; no IME composition guard exists. | Define closed/open/empty-result confirmation behavior; prevent submission when committing and leave composition input intact. |
| High | Remote debounce work is not canceled on ineligible searches, hide, or disposal. `Promise.resolve(getResults(...))` does not catch synchronous throws; a wrapped thenable can lose its cancel method. Old `finally` handlers still mutate loading state. | Own request generations and callbacks; test queued/pending cancellation, out-of-order success/failure, thrown callbacks, and stale pagination. |
| High | Fade completion callbacks access fields after disposal; `dispose()` leaves scheduled work and possible window mouseup listeners alive. Methods also continue after event/render callbacks can dispose the instance. | Adopt guarded transitions, complete callback cleanup, and reentrant-disposal regressions. |
| Medium | Disposal unconditionally removes tabindex and the hiding class instead of restoring original state. Constructor validation occurs after base registration. | Save/restore owned attributes; validate before registration; test invalid targets and reinitialization. |
| Medium | `fullWidth` passes `$.BORDER_BOX` as a positional argument, while fQuery 5 expects `{ boxSize }`. | Correct the call; test menu width against a bordered reference and viewport bounds. |
| Medium | `_selectValue` reads `trimValue`, but it has no declared default. Matching normalizes only the candidate, while sorting lowercases candidates but not the term. | Declare/document trimming and use consistent case/diacritic normalization; test equivalent terms and ranking. |
| Medium | Sass uses deprecated `@import`, physical right spacing/left alignment, and an editor without inherited font/color or a width bound. Tags and suggestion text can overflow narrow containers. | Migrate Sass modules/logical styles and verify sizing, RTL, overflow, and UI form integration. |
| Medium | Runtime imports are undeclared, `main` points at source, distribution is UMD-only, and there are no test/CI/coverage scripts. Demo dependencies use mutable legacy CDN URLs. | Apply the packaging, Vite, CI, documentation, and demo changes above. |

Browser tests should establish exact observable behavior for the source-inspected findings before and after each fix. Additional review targets include canceled resets, custom renderer disposal, duplicate remote pages, and native constraint-validation focus; these are test requirements, not claims of already reproduced browser failures.

## 10. Implementation sequence and completion checks

1. Update repository/package configuration and dependency resolution; run `npx sort-package-json`; establish Vite outputs and lockfile.
2. Establish the reference browser fixtures and initial initialization/value regressions. Refactor the class and implement the documented v3 contract with lifecycle/form/request fixes.
3. Migrate Sass and generated markup together, adding component-specific layout/accessibility tests.
4. Complete method, event, option, form, remote-data, style, and package-consumption coverage; generate source coverage and wire CI/Codecov/publishing.
5. Rewrite README/demos, document breaking changes, regenerate all distribution artifacts, and run the full acceptance checks.

Completion requires:

- Clean `npm ci`; `npm run lint`; `npm run lint:sass:unused`; and `npm run build` pass on the supported toolchain.
- Playwright passes in Chromium, Firefox, and WebKit; the CI Node matrix passes; no skipped core regressions or focused tests remain.
- Source-mapped coverage satisfies the reference Codecov policy without dependency coverage or unjustified exclusions.
- ESM and UMD, minified/unminified JS, CSS, and source maps are present and current; both import styles preserve component registration and UI coexistence.
- Package inspection and a packed-package consumer smoke test confirm exports, dependency resolution, stylesheet/Sass access, and absence of test/demo/report files in the publish payload.
- Browser tests verify native form values, reset, labels/focus, disabled behavior, event semantics, cancellation, and disposal; layout tests verify actual component styling without redundant light/dark coverage.
- README examples and the consolidated demo work with UI 4; the migration notes list silent setters, normalized values, required multiple selects, private internals, source-path changes, Sass customization changes, and visual changes.
- Final repository review confirms no prototype composition, obsolete wrapper/Rollup configuration, stale bundles, unintended sibling changes, or untracked distribution files.
