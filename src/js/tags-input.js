import $ from '@fr0st/query';
import { BaseComponent, generateId, Popper, waitForTransition } from '@fr0st/ui';
import { containsNode, normalizeLimit, normalizeText, normalizeValues } from './helpers.js';

/** @typedef {string|number} TagsInputValue */
/**
 * @typedef {object} TagsInputRequest
 * @property {number} offset The number of results already received.
 * @property {string} [term] The search term, omitted when empty.
 */
/**
 * @typedef {object} TagsInputResults
 * @property {TagsInputValue[]} results The suggested tags.
 * @property {boolean} [showMore=false] Whether another page is available.
 */
/** @typedef {(TagsInputResults|PromiseLike<TagsInputResults>) & {cancel?: Function}} TagsInputPendingResults */
/**
 * @callback TagsInputGetResults
 * @this {TagsInput}
 * @param {TagsInputRequest} request The search request.
 * @returns {TagsInputPendingResults} Results or a promise, optionally exposing cancellation.
 */
/**
 * @callback TagsInputRenderer
 * @this {TagsInput}
 * @param {string} value The tag value.
 * @param {HTMLElement} element The destination, which can be filled directly.
 * @returns {string|HTMLElement|void} HTML to sanitize, an element, or nothing.
 */
/**
 * @typedef {object} TagsInputLanguage
 * @property {string} [clear='Remove selection'] The removal button label, followed by the tag.
 * @property {string} [error='Error loading data.'] The request error message.
 * @property {string} [loading='Loading..'] The loading message.
 * @property {string} [maxSelections='Selection limit reached.'] The selection limit message.
 * @property {string} [search='Search'] The editor label when the select has no label.
 */
/**
 * @typedef {object} TagsInputOptions
 * @property {string} [placeholder=''] The empty selection placeholder.
 * @property {TagsInputLanguage} [lang] The interface labels.
 * @property {TagsInputValue[]|null} [data=null] Local suggestions; null reads native options.
 * @property {TagsInputGetResults|null} [getResults=null] Loads remote suggestions.
 * @property {TagsInputRenderer} [renderResult] Renders a suggestion; defaults to its value.
 * @property {TagsInputRenderer} [renderSelection] Renders a tag; defaults to its value.
 * @property {function(string): string} [sanitize] Sanitizes HTML; defaults to fQuery's sanitizer.
 * @property {function(string, string): boolean} [isMatch] Matches a value and search term.
 * @property {function(string, string, string): number} [sortResults] Compares two values for a term.
 * @property {function(string): boolean} [validTag] Validates a normalized tag; defaults to nonempty strings.
 * @property {boolean} [trimValue=false] Trims values before validation and deduplication.
 * @property {number} [maxSelections=0] The selection limit; zero means unlimited.
 * @property {number} [minSearch=1] The minimum suggestion search length.
 * @property {string[]} [confirmKeys=[',', ' ']] Additional keys that confirm free text.
 * @property {boolean} [confirmOnBlur=true] Commits free text when focus leaves the component.
 * @property {boolean} [clearOnBlur=true] Clears free text on blur when it is not committed.
 * @property {boolean} [showClear=true] Shows keyboard-operable tag removal buttons.
 * @property {boolean} [closeOnSelect=true] Closes suggestions after confirming a tag.
 * @property {number} [debounce=250] The remote request debounce in milliseconds.
 * @property {number} [duration=100] The opacity transition duration, respecting reduced motion.
 * @property {string} [maxHeight='250px'] The maximum menu height.
 * @property {string|HTMLElement|null} [appendTo=null] The menu insertion target.
 * @property {boolean} [fullWidth=false] Matches the menu width to the control.
 * @property {'auto'|'top'|'bottom'|'start'|'end'} [placement='bottom'] The preferred menu placement.
 * @property {'start'|'center'|'end'} [position='start'] The menu alignment.
 * @property {boolean} [fixed=false] Preserves the preferred placement.
 * @property {number} [spacing=0] The distance from the control.
 * @property {number|false} [minContact=false] The minimum contact with the control.
 */

/**
 * Controls editable tags backed by a native multiple select.
 * Callbacks run with the component as `this`. Programmatic setters are silent;
 * effective user changes emit change.ui.tagsinput. Disposal restores the select.
 * @augments {BaseComponent<TagsInputOptions>}
 */
export default class TagsInput extends BaseComponent {
    static classes = {
        active: 'active',
        container: 'form-input tagsinput-container',
        disabled: 'disabled',
        disabledItem: 'disabled',
        focus: 'focus',
        hide: 'visually-hidden',
        info: 'tagsinput-item text-body-secondary',
        item: 'tagsinput-item',
        menu: 'tagsinput-menu list-unstyled',
        menuSmall: 'tagsinput-menu-sm',
        menuLarge: 'tagsinput-menu-lg',
        placeholder: 'tagsinput-placeholder',
        tagClear: 'btn d-flex',
        tagClearIcon: 'btn-close p-0 my-auto pe-none',
        tagGroup: 'btn-group my-n1',
        tagInput: 'tagsinput-input',
        tagItem: 'btn tagsinput-selection',
        tagToggle: 'tagsinput d-flex flex-wrap position-relative text-start',
    };
    /** @type {TagsInputOptions} */
    static defaults = {
        placeholder: '',
        lang: {
            clear: 'Remove selection',
            error: 'Error loading data.',
            loading: 'Loading..',
            maxSelections: 'Selection limit reached.',
            search: 'Search',
        },
        data: null,
        getResults: null,
        renderResult: (value) => value,
        renderSelection: (value) => value,
        sanitize: (input) => $.sanitize(input),
        isMatch: (value, term) => normalizeText(value).includes(normalizeText(term)),
        sortResults(a, b, term) {
            const first = normalizeText(a);
            const second = normalizeText(b);
            const search = normalizeText(term);

            return first.indexOf(search) - second.indexOf(search) || first.localeCompare(second);
        },
        validTag: (value) => Boolean(value),
        trimValue: false,
        maxSelections: 0,
        minSearch: 1,
        confirmKeys: [',', ' '],
        confirmOnBlur: true,
        clearOnBlur: true,
        showClear: true,
        closeOnSelect: true,
        debounce: 250,
        duration: 100,
        maxHeight: '250px',
        appendTo: null,
        fullWidth: false,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        spacing: 0,
        minContact: false,
    };

    #activeItems = [];
    #ariaHidden;
    #changeHandler;
    #composing = false;
    #container;
    #data = [];
    #dispatching = false;
    #documentHandler;
    #focusHandler;
    #form = null;
    #generatedOptions = new Set();
    #hidden;
    #invalid = false;
    #invalidHandler;
    #loading = false;
    #loadResults;
    #maxSelections;
    #menuNode;
    #notifying = false;
    #observer;
    #offset = 0;
    #open = false;
    #placeholder;
    #placeholderText;
    #popper = null;
    #request = null;
    #requestId = 0;
    #resetHandler;
    #resetTimer;
    #scrollHandler;
    #searchInput;
    #showMore = false;
    #tabIndex;
    #toggle;
    #transitionId = 0;
    #value = [];
    #valueId = 0;

    /**
     * Creates a TagsInput and registers it with the native select.
     * @param {HTMLSelectElement} node The multiple select.
     * @param {TagsInputOptions} [options] The component options.
     */
    constructor(node, options) {
        if (!$.is(node, 'select') || !node.multiple) {
            throw new Error('TagsInput must be created on a multiple select element');
        }

        super(node, options);

        try {
            this.#tabIndex = $.getAttribute(this.node, 'tabindex');
            this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
            this.#ariaHidden = $.getAttribute(this.node, 'aria-hidden');

            this.#maxSelections = normalizeLimit(this.options.maxSelections);
            this.#placeholderText = String(this.options.placeholder ?? '');
            this.#data = normalizeValues(this.options.data ?? [...$.getProperty(this.node, 'options')].map((option) => $.getValue(option)));
            this.#loadResults = $._debounce((request, id) => this.#fetchResults(request, id), this.options.debounce);

            this.#render();
            this.#events();
            this.#setValue(this.#readNativeValue());
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    /**
     * Silently adds a tag.
     * @param {TagsInputValue} value The value to add.
     */
    add(value) {
        this.#setValue([...this.#value, value]);
    }

    /**
     * Disables the editor and closes suggestions, including pending work.
     */
    disable() {
        if (this.node) {
            $.setProperty(this.node, { disabled: true });
            this.#refreshState();
        }
    }

    /**
     * Cancels owned work and restores the native control with its current values.
     * Safe to call again or from a component callback.
     */
    dispose() {
        if (!this.node) {
            return;
        }

        const node = this.node;
        this.#transitionId++;
        this.#valueId++;
        this.#observer?.disconnect();
        clearTimeout(this.#resetTimer);
        this.#scrollHandler?.cancel();
        this.#popper?.dispose();
        if (this.#focusHandler) {
            $.removeEvent(node, 'focus.ui.tagsinput', this.#focusHandler);
        }
        if (this.#changeHandler) {
            $.removeEvent(node, 'change.ui.tagsinput', this.#changeHandler);
        }
        if (this.#invalidHandler) {
            $.removeEvent(node, 'invalid.ui.tagsinput', this.#invalidHandler);
        }
        if (this.#documentHandler) {
            $.removeEvent(node.ownerDocument, 'click.ui.tagsinput', this.#documentHandler);
        }
        if (this.#form && this.#resetHandler) {
            $.removeEvent(this.#form, 'reset.ui.tagsinput', this.#resetHandler);
        }

        if (this.#hidden) {
            $.addClass(node, this.constructor.classes.hide);
        } else {
            $.removeClass(node, this.constructor.classes.hide);
        }
        for (const [name, value] of [['tabindex', this.#tabIndex], ['aria-hidden', this.#ariaHidden]]) {
            if (value === null) {
                $.removeAttribute(node, name);
            } else {
                $.setAttribute(node, { [name]: value });
            }
        }

        // Remove ownership before cancellation callbacks can reenter disposal.
        super.dispose();
        this.#cancelSearch();
        $.remove(this.#menuNode);
        $.remove(this.#container);
        this.#activeItems = [];
        this.#data = [];
        this.#generatedOptions.clear();
        this.#value = [];
        this.#open = false;
        this.#container = null;
        this.#form = null;
        this.#menuNode = null;
        this.#placeholder = null;
        this.#popper = null;
        this.#searchInput = null;
        this.#toggle = null;
        this.#observer = null;
        this.#loadResults = null;
        this.#scrollHandler = null;
    }

    /**
     * Enables the editor unless its containing fieldset remains disabled.
     */
    enable() {
        if (this.node) {
            $.setProperty(this.node, { disabled: false });
            this.#refreshState();
        }
    }

    /**
     * Gets the current selection limit.
     * @returns {number} The limit; zero means unlimited.
     */
    getMaxSelections() {
        return this.#maxSelections;
    }

    /**
     * Gets the empty selection placeholder.
     * @returns {string} The placeholder.
     */
    getPlaceholder() {
        return this.#placeholderText;
    }

    /**
     * Gets a copy of the normalized selection, or an empty array after disposal.
     * @returns {string[]} The selected tag values.
     */
    getValue() {
        return this.#value.slice();
    }

    /**
     * Hides suggestions unless the hide event is canceled.
     */
    hide() {
        this.#close();
    }

    /**
     * Silently removes a tag.
     * @param {TagsInputValue} value The value to remove.
     */
    remove(value) {
        const [key] = normalizeValues(value, this.options?.trimValue);
        this.#setValue(this.#value.filter((entry) => entry !== key));
    }

    /**
     * Silently removes every tag.
     */
    removeAll() {
        this.#setValue([]);
    }

    /**
     * Silently changes the limit and normalizes the current selection.
     * @param {number} maxSelections The limit; zero means unlimited.
     */
    setMaxSelections(maxSelections) {
        this.#maxSelections = normalizeLimit(maxSelections);
        this.#setValue(this.#value);
    }

    /**
     * Sets the empty selection placeholder.
     * @param {string} placeholder The placeholder.
     */
    setPlaceholder(placeholder) {
        this.#placeholderText = String(placeholder ?? '');
        if (this.node) {
            this.#refreshPlaceholder();
        }
    }

    /**
     * Silently selects normalized, validated tags; nullish values clear the selection.
     * @param {TagsInputValue|TagsInputValue[]|null|undefined} value The selection.
     */
    setValue(value) {
        this.#setValue(value);
    }

    /**
     * Shows suggestions, allowing an in-progress closing transition to reverse.
     */
    show() {
        if (!this.node || this.#open || $.is(this.node, ':disabled') || !this.#before('show')) {
            return;
        }

        this.#open = true;
        const id = ++this.#transitionId;
        if (this.options.appendTo) {
            $.append(this.options.appendTo, this.#menuNode);
        } else {
            $.after($.closest(this.#container, '.input-group')[0] || this.#container, this.#menuNode);
        }
        $.setAttribute(this.#searchInput, { 'aria-expanded': 'true' });
        this.#load();
        if (!this.node || !this.#open || id !== this.#transitionId) {
            return;
        }

        this.#createPopper();
        $.css(this.#menuNode, 'opacity');
        $.addClass(this.#menuNode, 'show');
        this.#refreshFocus();
        waitForTransition(this.#menuNode, ['opacity']).then(() => {
            if (this.node && this.#open && id === this.#transitionId) {
                $.triggerEvent(this.node, 'shown.ui.tagsinput');
            }
        });
    }

    /**
     * Toggles suggestions.
     */
    toggle() {
        if (this.#open) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Updates the menu position and editor width.
     */
    update() {
        if (this.node) {
            this.#updateSearchWidth();
            this.#popper?.update();
        }
    }

    /**
     * Dispatches a cancellable lifecycle event, guarding recursive calls and disposal.
     * @param {string} name The event name.
     * @returns {boolean} Whether the operation can continue.
     */
    #before(name) {
        if (this.#dispatching) {
            return false;
        }
        this.#dispatching = true;
        try {
            return $.triggerOne(this.node, `${name}.ui.tagsinput`) && Boolean(this.node);
        } finally {
            this.#dispatching = false;
        }
    }

    /**
     * Binds reset handling to the select's current form, including external owners.
     */
    #bindForm() {
        if (this.#form === $.getProperty(this.node, 'form')) {
            return;
        }
        if (this.#form && this.#resetHandler) {
            $.removeEvent(this.#form, 'reset.ui.tagsinput', this.#resetHandler);
        }
        this.#form = $.getProperty(this.node, 'form');
        if (this.#form) {
            $.addEvent(this.#form, 'reset.ui.tagsinput', this.#resetHandler);
        }
    }

    /**
     * Applies the blur policies only when focus leaves the entire control.
     */
    #blur() {
        if (!this.node || containsNode(this.#container, this.node.ownerDocument.activeElement)) {
            return;
        }
        if (!$.is(this.node, ':disabled') && !this.#composing && $.getValue(this.#searchInput)) {
            if (this.options.confirmOnBlur) {
                this.#selectValue($.getValue(this.#searchInput), false);
            } else if (this.options.clearOnBlur) {
                $.setValue(this.#searchInput, '');
            }
        }
        if (this.node) {
            this.hide();
            if (!this.node) {
                return;
            }
            this.#refreshFocus();
            this.#refreshPlaceholder();
            if (this.node) {
                this.#updateSearchWidth();
            }
        }
    }

    /**
     * Invalidates queued and in-flight requests before calling consumer cancellation.
     */
    #cancelSearch() {
        this.#requestId++;
        this.#loadResults?.cancel();
        this.#scrollHandler?.cancel();
        const request = this.#request;
        this.#request = null;
        this.#loading = false;
        try {
            request?.cancel?.();
        } catch {
            // Consumer cancellation must not prevent cleanup or a newer search.
        }
    }

    /**
     * Clears results and the editor's active descendant reference.
     */
    #clearResults() {
        this.#focusItem(null);
        this.#activeItems = [];
        $.empty(this.#menuNode);
    }

    /**
     * Closes suggestions, optionally forcing closure when the control is disabled.
     * @param {boolean} [force=false] Whether to bypass a canceled hide event.
     */
    #close(force = false) {
        if (!this.node || !this.#open) {
            return;
        }
        const allowed = this.#before('hide');
        if (!this.node || (!allowed && !force)) {
            return;
        }
        this.#open = false;
        const id = ++this.#transitionId;
        this.#cancelSearch();
        if (!this.node || this.#open || id !== this.#transitionId) {
            return;
        }
        this.#showMore = false;
        this.#focusItem(null);
        $.setAttribute(this.#searchInput, { 'aria-expanded': 'false' });
        $.removeClass(this.#menuNode, 'show');
        this.#refreshFocus();
        waitForTransition(this.#menuNode, ['opacity']).then(() => {
            if (!this.node || id !== this.#transitionId) {
                return;
            }
            this.#popper?.dispose();
            this.#popper = null;
            $.detach(this.#menuNode);
            this.#clearResults();
            $.triggerEvent(this.node, 'hidden.ui.tagsinput');
        });
    }

    /**
     * Positions the menu with the current UI Popper contract.
     */
    #createPopper() {
        if (this.#popper) {
            this.#popper.update();
            return;
        }
        const options = {
            reference: this.#toggle,
            placement: this.options.placement,
            position: this.options.position,
            fixed: this.options.fixed,
            spacing: this.options.spacing,
            minContact: this.options.minContact,
        };
        if (this.options.fullWidth) {
            options.beforeUpdate = (node, reference) => {
                $.setStyle(node, 'width', `${$.width(reference, { boxSize: $.BORDER_BOX })}px`);
            };
        }
        this.#popper = new Popper(this.#menuNode, options);
    }

    /**
     * Attaches input, native form, and lifecycle events.
     */
    #events() {
        this.#focusHandler = () => {
            if (this.node && !$.is(this.node, ':disabled')) {
                $.focus(this.#searchInput);
            }
        };
        this.#changeHandler = () => {
            if (!this.#notifying) {
                this.#setValue(this.#readNativeValue());
            }
        };
        this.#invalidHandler = (event) => {
            event.preventDefault();
            this.#invalid = true;
            this.#refreshState();
            this.#focusHandler();
        };
        this.#resetHandler = (event) => {
            clearTimeout(this.#resetTimer);
            this.#resetTimer = setTimeout(() => {
                if (this.node && !event.defaultPrevented) {
                    this.#invalid = false;
                    $.setValue(this.#searchInput, '');
                    this.#setValue(this.#readNativeValue());
                    this.hide();
                }
            }, 0);
        };
        $.addEvent(this.node, 'focus.ui.tagsinput', this.#focusHandler);
        $.addEvent(this.node, 'change.ui.tagsinput', this.#changeHandler);
        $.addEvent(this.node, 'invalid.ui.tagsinput', this.#invalidHandler);
        this.#bindForm();

        this.#documentHandler = (event) => {
            if (!this.node) {
                return;
            }
            const label = $.is(event.target, 'label') ? event.target : $.closest(event.target, 'label')[0];
            if ($.getProperty(label, 'control') === this.node && !containsNode(this.#container, event.target)) {
                this.#focusHandler();
            } else if (!containsNode(this.#container, event.target) && !containsNode(this.#menuNode, event.target)) {
                this.hide();
            }
        };
        $.addEvent(this.node.ownerDocument, 'click.ui.tagsinput', this.#documentHandler);
        $.addEvent(this.#container, 'focusin.ui.tagsinput', () => {
            this.#refreshFocus();
            this.#refreshPlaceholder();
        });
        $.addEvent(this.#container, 'focusout.ui.tagsinput', (event) => {
            // Focusout can checkpoint microtasks before the next control gains focus.
            if (!containsNode(this.#container, event.relatedTarget)) {
                queueMicrotask(() => this.#blur());
            }
        });
        $.addEvent(this.#container, 'click.ui.tagsinput', (event) => {
            if (!this.node || event.defaultPrevented || $.is(this.node, ':disabled')) {
                return;
            }
            $.focus(this.#searchInput);
            this.show();
        });
        // Selection keys use raw attributes to preserve strings such as "001" and "true".
        $.addEventDelegate(this.#container, 'click.ui.tagsinput', '[data-ui-action="clear"]', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!this.node || $.is(this.node, ':disabled')) {
                return;
            }
            this.#setValue(this.#value.filter((value) => value !== $.getAttribute(event.currentTarget, 'data-ui-value')), true);
            if (this.node) {
                $.focus(this.#searchInput);
            }
        });
        $.addEvent(this.#menuNode, 'mousedown.ui.tagsinput', (event) => event.preventDefault());
        $.addEvent(this.#menuNode, 'click.ui.tagsinput', (event) => event.stopPropagation());
        $.addEventDelegate(this.#menuNode, 'click.ui.tagsinput', '[data-ui-action="select"]', (event) => {
            this.#selectValue($.getAttribute(event.currentTarget, 'data-ui-value'));
        });
        $.addEventDelegate(this.#menuNode, 'mouseover.ui.tagsinput', '[data-ui-action="select"]', (event) => {
            this.#focusItem(event.currentTarget);
        });
        $.addEvent(this.#searchInput, 'compositionstart.ui.tagsinput', () => {
            this.#composing = true;
        });
        $.addEvent(this.#searchInput, 'compositionend.ui.tagsinput', () => {
            this.#composing = false;
            this.#input();
        });
        $.addEvent(this.#searchInput, 'input.ui.tagsinput', () => this.#input());
        $.addEvent(this.#searchInput, 'keydown.ui.tagsinput', (event) => this.#keydown(event));

        this.#scrollHandler = $._throttle(() => {
            if (
                this.node &&
                this.#open &&
                !this.#loading &&
                this.#showMore &&
                $.getScrollY(this.#menuNode) >= $.height(this.#menuNode, { boxSize: $.SCROLL_BOX }) - $.height(this.#menuNode) * 1.25
            ) {
                this.#load(this.#offset);
            }
        }, 250, { leading: false });
        $.addEvent(this.#menuNode, 'scroll.ui.tagsinput', this.#scrollHandler);
        this.#observer = new MutationObserver((records) => {
            if (!this.node) {
                return;
            }
            this.#bindForm();
            if (this.#refreshData(records)) {
                this.#setValue(this.#readNativeValue());
            } else {
                this.#refreshState();
            }
        });
        this.#observer.observe(this.node, {
            attributes: true,
            attributeFilter: ['disabled', 'required', 'form', 'class', 'dir', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-errormessage', 'aria-invalid', 'selected', 'value', 'label'],
            childList: true,
            subtree: true,
        });
        for (const fieldset of $.parents(this.node, 'fieldset')) {
            this.#observer.observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
        }
    }

    /**
     * Fetches a page while guarding consumer callbacks and stale continuations.
     * @param {TagsInputRequest} request The request parameters.
     * @param {number} id The request generation.
     * @returns {Promise<void>} Resolves when the request settles.
     */
    async #fetchResults(request, id) {
        if (!this.node || id !== this.#requestId) {
            return;
        }
        try {
            const result = this.options.getResults.call(this, request);
            if (!this.node || id !== this.#requestId) {
                result?.cancel?.();
                return;
            }
            this.#request = result;
            const response = await result;
            if (!this.node || id !== this.#requestId) {
                return;
            }
            if (!Array.isArray(response?.results)) {
                throw new TypeError('TagsInput results must be an array');
            }
            if (!request.offset) {
                this.#clearResults();
            } else {
                $.remove($.children(this.#menuNode, '[role="status"]'));
            }
            this.#offset = request.offset + response.results.length;
            this.#showMore = Boolean(response.showMore) && response.results.length > 0;
            this.#renderResults(normalizeValues(response.results), id);
        } catch {
            if (this.node && id === this.#requestId) {
                this.#showMore = false;
                $.remove($.children(this.#menuNode, '[role="status"]'));
                this.#renderInfo(this.options.lang.error);
            }
        } finally {
            if (this.node && id === this.#requestId) {
                this.#request = null;
                this.#loading = false;
                this.update();
                if (this.#showMore && $.height(this.#menuNode, { boxSize: $.SCROLL_BOX }) <= $.height(this.#menuNode)) {
                    this.#scrollHandler();
                }
            }
        }
    }

    /**
     * Updates the active suggestion and accessible descendant reference.
     * @param {HTMLElement|null} element The active suggestion.
     */
    #focusItem(element) {
        if (!this.#menuNode) {
            return;
        }
        const previous = $.findOne('[data-ui-focus]', this.#menuNode);
        if (previous) {
            $.removeClass(previous, this.constructor.classes.focus);
            $.removeDataset(previous, 'uiFocus');
        }
        if (element) {
            $.addClass(element, this.constructor.classes.focus);
            $.setDataset(element, { uiFocus: 'true' });
            $.setAttribute(this.#searchInput, { 'aria-activedescendant': $.getProperty(element, 'id') });
        } else {
            $.removeAttribute(this.#searchInput, 'aria-activedescendant');
        }
    }

    /**
     * Refreshes search sizing and suggestions after input, excluding IME composition.
     */
    #input() {
        if (!this.node || $.is(this.node, ':disabled')) {
            return;
        }
        this.#updateSearchWidth();
        this.#refreshPlaceholder();
        if (this.#composing) {
            this.#cancelSearch();
            return;
        }
        if (this.#open) {
            this.#load();
        } else {
            this.show();
        }
    }

    /**
     * Handles confirmation, removal, and suggestion navigation.
     * @param {KeyboardEvent} event The keyboard event.
     */
    #keydown(event) {
        if (
            !this.node ||
            $.is(this.node, ':disabled') ||
            event.isComposing ||
            this.#composing ||
            event.ctrlKey ||
            event.altKey ||
            event.metaKey
        ) {
            return;
        }
        const key = event.key;
        const active = this.#open ? $.findOne('[data-ui-focus]', this.#menuNode) : null;
        if (key === 'Enter' || this.options.confirmKeys.includes(key)) {
            const value = key === 'Enter' && active ? $.getAttribute(active, 'data-ui-value') : $.getValue(this.#searchInput);
            if (value || this.options.confirmKeys.includes(key)) {
                event.preventDefault();
                this.#selectValue(value);
            }
        } else if (key === 'Backspace' && !$.getValue(this.#searchInput) && this.#value.length) {
            event.preventDefault();
            this.#setValue(this.#value.slice(0, -1), true);
        } else if (key === 'Escape' && this.#open) {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
        } else if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault();
            if (!this.#open) {
                this.show();
                return;
            }
            const index = this.#activeItems.indexOf(active);
            const next = index < 0 ? 0 : index + (key === 'ArrowDown' ? 1 : -1);
            const option = this.#activeItems[next];
            if (option) {
                this.#focusItem(option);
                $._callDomMethod(option, 'scrollIntoView', { block: 'nearest' });
            }
        }
    }

    /**
     * Loads suggestions for the current editor value.
     * @param {number} [offset=0] The remote pagination offset.
     */
    #load(offset = 0) {
        this.#cancelSearch();
        if (!this.node || !this.#open) {
            return;
        }
        const id = this.#requestId;
        if (!offset) {
            this.#clearResults();
            this.#offset = 0;
            this.#showMore = false;
        } else {
            $.remove($.children(this.#menuNode, '[role="status"]'));
        }
        const term = $.getValue(this.#searchInput);
        if (term.length < this.options.minSearch) {
            $.hide(this.#menuNode);
            this.update();
            return;
        }
        $.show(this.#menuNode);
        if (this.#maxSelections && this.#value.length >= this.#maxSelections) {
            this.#showMore = false;
            this.#renderInfo(this.options.lang.maxSelections);
        } else if (typeof this.options.getResults === 'function') {
            this.#loading = true;
            this.#renderInfo(this.options.lang.loading);
            if (this.node && id === this.#requestId) {
                this.#loadResults(term ? { offset, term } : { offset }, id);
            }
        } else {
            const options = this.options;
            let results = this.#data.slice();
            if (term) {
                results = results.filter((value) => this.node && id === this.#requestId && options.isMatch.call(this, value, term));
                results.sort((a, b) => this.node && id === this.#requestId ? options.sortResults.call(this, a, b, term) : 0);
            }
            if (this.node && id === this.#requestId) {
                this.#renderResults(results, id);
            }
        }
        this.update();
    }

    /**
     * Reads current native values without changing native option identities.
     * @returns {string[]} The selected values.
     */
    #readNativeValue() {
        return [...$.getProperty(this.node, 'selectedOptions')].map((option) => $.getValue(option));
    }

    /**
     * Refreshes native suggestions when mutation records include option changes.
     * @param {MutationRecord[]} records The observed or queued mutations.
     * @returns {boolean} Whether native options changed.
     */
    #refreshData(records) {
        const changed = records.some((record) => record.type === 'childList' ||
            record.target !== this.node && !$.is(record.target, 'fieldset'));
        if (changed && this.options.data === null && !this.options.getResults) {
            this.#data = normalizeValues([...$.getProperty(this.node, 'options')].map((option) => $.getValue(option)));
        }
        return changed;
    }

    /**
     * Keeps focus styling while the editor, a removal button, or the menu is active.
     */
    #refreshFocus() {
        if (this.node) {
            const focused = !$.is(this.node, ':disabled') &&
                (this.#open || containsNode(this.#container, this.node.ownerDocument.activeElement));
            if (focused) {
                $.addClass(this.#toggle, this.constructor.classes.focus);
            } else {
                $.removeClass(this.#toggle, this.constructor.classes.focus);
            }
        }
    }

    /**
     * Updates the placeholder without moving the focused input.
     */
    #refreshPlaceholder() {
        const html = this.options.sanitize.call(this, this.#placeholderText || '&nbsp;');
        if (!this.node) {
            return;
        }
        $.setHtml(this.#placeholder, html);
        $.setProperty(this.#placeholder, {
            hidden: Boolean(this.#value.length) || Boolean($.getValue(this.#searchInput)) || this.node.ownerDocument.activeElement === this.#searchInput,
        });
    }

    /**
     * Synchronizes editor attributes, styling, and disabled state.
     */
    #refreshState() {
        this.#bindForm();
        const classes = this.constructor.classes;
        const disabled = $.is(this.node, ':disabled');
        $.setProperty(this.#toggle, { className: $.getProperty(this.node, 'className') });
        $.removeClass(this.#toggle, classes.hide);
        $.addClass(this.#toggle, classes.tagToggle);
        if (disabled) {
            $.addClass(this.#toggle, classes.disabled);
        } else {
            $.removeClass(this.#toggle, classes.disabled);
        }
        $.setProperty(this.#searchInput, { disabled, tabIndex: disabled ? -1 : Number(this.#tabIndex ?? 0) });
        $.setAttribute(this.#searchInput, { 'aria-disabled': String(disabled) });
        $.setAttribute(this.#searchInput, { 'aria-required': String($.getProperty(this.node, 'required')) });
        for (const button of $.find('button', this.#toggle)) {
            $.setProperty(button, { disabled });
        }
        const direction = $.css(this.node, 'direction');
        $.setProperty([this.#container, this.#menuNode], { dir: direction });
        $.removeClass(this.#menuNode, [classes.menuSmall, classes.menuLarge]);
        if ($.is(this.node, '.input-sm') || $.closest(this.node, '.input-group-sm').length) {
            $.addClass(this.#menuNode, classes.menuSmall);
        } else if ($.is(this.node, '.input-lg') || $.closest(this.node, '.input-group-lg').length) {
            $.addClass(this.#menuNode, classes.menuLarge);
        }
        for (const name of ['aria-labelledby', 'aria-describedby', 'aria-errormessage', 'aria-invalid']) {
            const value = $.getAttribute(this.node, name);
            if (value === null) {
                $.removeAttribute(this.#searchInput, name);
            } else {
                $.setAttribute(this.#searchInput, { [name]: value });
            }
        }
        const label = $.getAttribute(this.node, 'aria-label') || [...$.getProperty(this.node, 'labels')].map((node) => $.getText(node).trim()).join(' ') || this.options.lang.search;
        $.setAttribute(this.#searchInput, { 'aria-label': label });
        $.setAttribute(this.#menuNode, { 'aria-label': label });
        if (this.#invalid && !$.getProperty(this.node, 'validity').valid) {
            $.setAttribute(this.#searchInput, { 'aria-invalid': 'true' });
        }
        this.#refreshFocus();
        if (disabled) {
            this.#close(true);
        }
    }

    /**
     * Builds the wrapper, editable combobox, and detached suggestion listbox.
     */
    #render() {
        const classes = this.constructor.classes;
        const id = generateId('tagsinput');
        this.#container = $.create('div', { class: classes.container });
        this.#toggle = $.create('div', { class: classes.tagToggle });
        this.#placeholder = $.create('span', { class: classes.placeholder, attributes: { 'aria-hidden': true } });
        this.#searchInput = $.create('input', {
            class: classes.tagInput,
            attributes: {
                'type': 'text',
                'role': 'combobox',
                'autocomplete': 'off',
                'aria-autocomplete': 'list',
                'aria-haspopup': 'listbox',
                'aria-expanded': false,
                'aria-controls': id,
            },
        });
        this.#menuNode = $.create('ul', {
            class: classes.menu,
            attributes: { id, 'role': 'listbox', 'aria-multiselectable': true },
            style: {
                'maxHeight': this.options.maxHeight,
                '--ui-tagsinput-duration': `${Math.max(0, Number(this.options.duration) || 0)}ms`,
            },
        });
        $.append(this.#toggle, [this.#placeholder, this.#searchInput]);
        $.append(this.#container, this.#toggle);
        $.after(this.node, this.#container);
        $.addClass(this.node, classes.hide);
        $.setAttribute(this.node, { 'tabindex': -1, 'aria-hidden': true });
    }

    /**
     * Renders callback output, stopping when the consumer disposes the component.
     * @param {string} value The tag.
     * @param {HTMLElement} element The destination.
     * @param {TagsInputRenderer} renderer The consumer renderer.
     * @returns {boolean} Whether the component remains live.
     */
    #renderContent(value, element, renderer) {
        const content = renderer.call(this, value, element);
        if (!this.node) {
            return false;
        }
        if (typeof content === 'string') {
            const html = this.options.sanitize.call(this, content);
            if (!this.node) {
                return false;
            }
            $.setHtml(element, html);
        } else if ($._isElement(content) && content !== element) {
            $.append(element, content);
        }
        return Boolean(this.node);
    }

    /**
     * Appends a sanitized status message.
     * @param {string} text The message.
     */
    #renderInfo(text) {
        const html = this.options.sanitize.call(this, text);
        if (this.node) {
            $.append(this.#menuNode, $.create('li', {
                class: this.constructor.classes.info,
                attributes: { role: 'status' },
                html,
            }));
        }
    }

    /**
     * Appends unique suggestions and initializes keyboard focus.
     * @param {string[]} results The results.
     * @param {number} id The request generation.
     */
    #renderResults(results, id) {
        const seen = new Set(this.#activeItems.map((element) => $.getAttribute(element, 'data-ui-value')));
        for (const value of results) {
            if (seen.has(value)) {
                continue;
            }
            seen.add(value);
            const selected = this.#value.includes(value);
            const element = $.create('li', {
                class: this.constructor.classes.item,
                attributes: { 'id': generateId('tagsinput-item'), 'role': 'option', 'aria-label': value, 'aria-selected': selected },
                dataset: { uiAction: 'select', uiValue: value },
            });
            if (selected) {
                $.addClass(element, this.constructor.classes.active);
            }
            if (!this.#renderContent(value, element, this.options.renderResult) || id !== this.#requestId) {
                return;
            }
            this.#activeItems.push(element);
            $.append(this.#menuNode, element);
        }
        if (!$.hasChildren(this.#menuNode)) {
            $.hide(this.#menuNode);
        }
        if (!$.findOne('[data-ui-focus]', this.#menuNode)) {
            this.#focusItem(this.#activeItems[0] || null);
        }
    }

    /**
     * Builds tag chips in a fragment, leaving the editor and its focus intact.
     * @param {number} id The value generation.
     */
    #renderSelection(id) {
        const fragment = $._callDomMethod(this.node.ownerDocument, 'createDocumentFragment');
        const classes = this.constructor.classes;
        for (const value of this.#value) {
            const group = $.create('div', { class: classes.tagGroup, dataset: { uiTag: true } });
            const label = $.create('span', { class: classes.tagItem });
            if (!this.#renderContent(value, label, this.options.renderSelection) || id !== this.#valueId) {
                return;
            }
            if (this.options.showClear) {
                const button = $.create('button', {
                    class: classes.tagClear,
                    attributes: { 'type': 'button', 'aria-label': `${this.options.lang.clear}: ${value}` },
                    dataset: { uiAction: 'clear', uiValue: value },
                });
                $.append(button, $.create('span', { class: classes.tagClearIcon, attributes: { 'aria-hidden': true } }));
                $.append(group, button);
            }
            $.append(group, label);
            $.append(fragment, group);
        }
        $.remove($.children(this.#toggle, '[data-ui-tag]'));
        $.insertBefore(fragment, this.#searchInput);
    }

    /**
     * Confirms free text or a suggestion, emitting at most one effective change.
     * @param {string} value The value.
     * @param {boolean} [focus=true] Whether to refocus the editor.
     */
    #selectValue(value, focus = true) {
        if (!this.node || $.is(this.node, ':disabled')) {
            return;
        }
        this.#setValue([...this.#value, value], true);
        if (!this.node) {
            return;
        }
        $.setValue(this.#searchInput, '');
        this.#refreshPlaceholder();
        if (!this.node) {
            return;
        }
        this.#updateSearchWidth();
        if (this.options.closeOnSelect) {
            this.hide();
        } else if (this.#open) {
            this.#load();
        }
        if (this.node && focus) {
            $.focus(this.#searchInput);
        }
    }

    /**
     * Normalizes and validates values before comparing and synchronizing selection.
     * @param {TagsInputValue|TagsInputValue[]|null|undefined} value The requested values.
     * @param {boolean} [notify=false] Whether this is a user change.
     */
    #setValue(value, notify = false) {
        if (!this.node) {
            return;
        }
        // Consume external option changes before discarding our own mutations.
        this.#refreshData(this.#observer?.takeRecords() ?? []);
        const id = ++this.#valueId;
        const options = this.options;
        let values = normalizeValues(value, options.trimValue)
            .filter((entry) => this.node && id === this.#valueId && options.validTag.call(this, entry));
        if (!this.node || id !== this.#valueId) {
            return;
        }
        if (this.#maxSelections) {
            values = values.slice(0, this.#maxSelections);
        }
        const changed = values.length !== this.#value.length || values.some((entry, index) => entry !== this.#value[index]);
        this.#value = values;
        const lookup = new Map();
        for (const option of $.getProperty(this.node, 'options')) {
            $.setProperty(option, { selected: false });
            if (!lookup.has($.getValue(option))) {
                lookup.set($.getValue(option), option);
            }
        }
        for (const entry of values) {
            let option = lookup.get(entry);
            if (!option) {
                option = $.create('option', { value: entry, text: entry });
                this.#generatedOptions.add(option);
                $.append(this.node, option);
            }
            $.setProperty(option, { selected: true });
        }
        for (const option of this.#generatedOptions) {
            if (!containsNode(this.node, option) || !$.getProperty(option, 'selected') && !$.getProperty(option, 'defaultSelected')) {
                $.remove(option);
                this.#generatedOptions.delete(option);
            }
        }
        this.#observer?.takeRecords();
        this.#renderSelection(id);
        if (!this.node || id !== this.#valueId) {
            return;
        }
        this.#refreshState();
        if (!this.node) {
            return;
        }
        this.#refreshPlaceholder();
        if (!this.node) {
            return;
        }
        this.#updateSearchWidth();
        if (this.#open) {
            this.#load();
        }
        if (this.node && id === this.#valueId && notify && changed) {
            this.#notifying = true;
            try {
                $.triggerEvent(this.node, 'change.ui.tagsinput');
            } finally {
                this.#notifying = false;
            }
        }
    }

    /**
     * Sizes the editor using its complete font metrics; CSS bounds the result.
     */
    #updateSearchWidth() {
        const span = $.create('span', {
            text: $.getValue(this.#searchInput),
            style: {
                position: 'absolute',
                visibility: 'hidden',
                font: $.css(this.#searchInput, 'font'),
                letterSpacing: $.css(this.#searchInput, 'letterSpacing'),
                whiteSpace: 'pre',
            },
        });
        $.append(this.node.ownerDocument.body, span);
        $.setStyle(this.#searchInput, 'width', `${$.width(span) + 2}px`);
        $.remove(span);
    }
}
