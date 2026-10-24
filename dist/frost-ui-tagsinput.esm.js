import { BaseComponent, Popper, generateId, initComponent, waitForTransition } from "@fr0st/ui";
import $ from "@fr0st/query";

//#region src/js/helpers.js
/** @import { TagsInputValue } from './tags-input.js'; */
/**
* Checks whether a node is the parent itself or one of its descendants.
* @param {Node} parent The parent node.
* @param {Node|null} node The node to check.
* @returns {boolean} Whether the parent contains the node.
*/
function containsNode(parent, node) {
	return Boolean(node) && ($.isSame(parent, node) || $.hasDescendent(parent, node));
}
/**
* Normalizes a selection limit to a nonnegative integer.
* @param {number} value The requested limit.
* @returns {number} The limit, or zero for unlimited selections.
*/
function normalizeLimit(value) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}
/**
* Normalizes text for case- and accent-insensitive matching and sorting.
* @param {string} value The text.
* @returns {string} The normalized text.
*/
function normalizeText(value) {
	return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
/**
* Copies scalar or array values into unique strings, excluding nullish values.
* @param {TagsInputValue|TagsInputValue[]|null|undefined} value The values.
* @param {boolean} [trim=false] Whether to trim each value.
* @returns {string[]} The normalized values.
*/
function normalizeValues(value, trim = false) {
	const entries = (Array.isArray(value) ? value : [value]).filter((entry) => entry !== null && entry !== void 0).map((entry) => trim ? String(entry).trim() : String(entry));
	return [...new Set(entries)];
}

//#endregion
//#region src/js/tags-input.js
/** @import { Placement, Position } from '@fr0st/ui/src/js/popper/popper.js'; */
var ariaAttributes = [
	"aria-describedby",
	"aria-errormessage",
	"aria-invalid",
	"aria-required"
];
/** @typedef {string|number} TagsInputValue */
/**
* @typedef {object} TagsInputResults
* @property {TagsInputValue[]} results The suggested tags.
* @property {boolean} [showMore=false] Whether another page is available.
*/
/**
* @typedef {object} TagsInputRequest
* @property {number} offset The number of results already received.
* @property {string} [term] The search term, omitted when empty.
*/
/**
* @typedef {object} TagsInputLanguage
* @property {string} [clear] The removal button label, followed by the tag.
* @property {string} [error] The loading error message.
* @property {string} [loading] The loading message.
* @property {string} [maxSelections] The selection limit message.
* @property {string} [search] The editor label when the select has no label.
*/
/**
* @callback TagsInputRenderer
* @this {TagsInput}
* @param {string} value The tag value.
* @param {HTMLElement} element The destination, which can be filled directly.
* @returns {string|HTMLElement|void} HTML to sanitize, an element, or nothing.
*/
/** @typedef {(TagsInputResults|PromiseLike<TagsInputResults>) & {cancel?: () => void}} TagsInputPendingResults */
/**
* @callback TagsInputGetResults
* @this {TagsInput}
* @param {TagsInputRequest} request The search request.
* @returns {TagsInputPendingResults} Results or a promise, optionally exposing a cancel method.
*/
/**
* @callback TagsInputSanitizeCallback
* @this {TagsInput}
* @param {string} html The rendered HTML.
* @returns {string} The sanitized HTML.
*/
/**
* @callback TagsInputMatchCallback
* @this {TagsInput}
* @param {string} value The value to match.
* @param {string} term The search term.
* @returns {boolean} Whether the value matches.
*/
/**
* @callback TagsInputSortCallback
* @this {TagsInput}
* @param {string} a The first value.
* @param {string} b The second value.
* @param {string} term The search term.
* @returns {number} The relative sort order.
*/
/**
* @callback TagsInputValidTagCallback
* @this {TagsInput}
* @param {string} value The normalized tag value.
* @returns {boolean} Whether the tag is valid.
*/
/**
* @typedef {object} TagsInputOptions
* @property {string} [placeholder=''] The empty selection placeholder.
* @property {TagsInputLanguage} [lang] The interface labels.
* @property {TagsInputValue[]|null} [data=null] Local suggestions; null reads native options.
* @property {TagsInputGetResults|null} [getResults=null] Loads remote suggestions.
* @property {TagsInputRenderer} [renderResult] Renders a suggestion.
* @property {TagsInputRenderer} [renderSelection] Renders a tag.
* @property {TagsInputSanitizeCallback} [sanitize] Sanitizes rendered HTML.
* @property {TagsInputMatchCallback} [isMatch] Matches a local suggestion.
* @property {TagsInputSortCallback} [sortResults] Sorts local search results.
* @property {TagsInputValidTagCallback} [validTag] Validates a normalized tag.
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
* @property {Placement} [placement='bottom'] The preferred menu placement.
* @property {Position} [position='start'] The menu alignment.
* @property {boolean} [fixed=false] Preserves the preferred placement.
* @property {number} [spacing=0] The distance from the control.
* @property {number|false} [minContact=false] The minimum contact with the control.
*/
/**
* Controls editable tags backed by a native multiple select.
* @augments {BaseComponent<TagsInputOptions>}
*/
var TagsInput = class extends BaseComponent {
	static classes = {
		active: "active",
		container: "form-input tagsinput-container",
		disabled: "disabled",
		disabledItem: "disabled",
		focus: "focus",
		hide: "visually-hidden",
		info: "tagsinput-item text-body-secondary",
		item: "tagsinput-item",
		menu: "tagsinput-menu list-unstyled",
		menuSmall: "tagsinput-menu-sm",
		menuLarge: "tagsinput-menu-lg",
		placeholder: "tagsinput-placeholder",
		tagClear: "btn d-flex",
		tagClearIcon: "btn-close p-0 my-auto pe-none",
		tagGroup: "btn-group my-n1",
		tagInput: "tagsinput-input",
		tagItem: "btn tagsinput-selection",
		tagToggle: "tagsinput d-flex flex-wrap position-relative text-start"
	};
	/** @type {TagsInputOptions} */
	static defaults = {
		placeholder: "",
		lang: {
			clear: "Remove selection",
			error: "Error loading data.",
			loading: "Loading..",
			maxSelections: "Selection limit reached.",
			search: "Search"
		},
		data: null,
		getResults: null,
		renderResult: (value) => value,
		renderSelection: (value) => value,
		sanitize: (input) => $.sanitize(input),
		isMatch(value, term) {
			return normalizeText(value).includes(normalizeText(term));
		},
		sortResults(a, b, term) {
			const aNormalized = normalizeText(a);
			const bNormalized = normalizeText(b);
			const termNormalized = normalizeText(term);
			return aNormalized.indexOf(termNormalized) - bNormalized.indexOf(termNormalized) || aNormalized.localeCompare(bNormalized);
		},
		validTag: (value) => Boolean(value),
		trimValue: false,
		maxSelections: 0,
		minSearch: 1,
		confirmKeys: [",", " "],
		confirmOnBlur: true,
		clearOnBlur: true,
		showClear: true,
		closeOnSelect: true,
		debounce: 250,
		duration: 100,
		maxHeight: "250px",
		appendTo: null,
		fullWidth: false,
		placement: "bottom",
		position: "start",
		fixed: false,
		spacing: 0,
		minContact: false
	};
	#activeItems = [];
	#ariaHidden;
	#container = null;
	#data = [];
	#focusedItem = null;
	#focusHandler = null;
	#form = null;
	#generatedOptions = /* @__PURE__ */ new Set();
	#hidden;
	#loading = false;
	#loadResults = null;
	#maxSelections;
	#menuNode = null;
	#observer = null;
	#offset = 0;
	#open = false;
	#placeholder = null;
	#placeholderText;
	#popper = null;
	#request = null;
	#requestId = 0;
	#resetTimers = /* @__PURE__ */ new Set();
	#scrollHandler = null;
	#searchInput = null;
	#showMore = false;
	#tabIndex;
	#toggle = null;
	#transitionId = 0;
	#value = [];
	/**
	* Creates a TagsInput and registers it with the native select.
	* @param {HTMLSelectElement} node The multiple select.
	* @param {TagsInputOptions} [options] The component options.
	* @throws {TypeError} When the node is not a multiple select element.
	*/
	constructor(node, options) {
		if (!$._isElement(node) || !$.is(node, "select[multiple]")) throw new TypeError("TagsInput must be created on a multiple select element.");
		super(node, options);
		try {
			this.#tabIndex = $.getAttribute(this.node, "tabindex");
			this.#hidden = $.hasClass(this.node, this.constructor.classes.hide);
			this.#ariaHidden = $.getAttribute(this.node, "aria-hidden");
			this.#form = $.getProperty(this.node, "form");
			this.#maxSelections = normalizeLimit(this.options.maxSelections);
			this.#placeholderText = String(this.options.placeholder ?? "");
			const data = this.options.data ?? [...$.getProperty(this.node, "options")].map((option) => $.getValue(option));
			this.#data = normalizeValues(data);
			this.#loadResults = $._debounce((request, id) => this.#fetchResults(request, id), this.options.debounce);
			const focused = $.is(this.node, ":focus");
			this.#render();
			this.#events();
			this.#setValue(this.#readNativeValue());
			if (focused) $.focus(this.#searchInput);
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
	* Disables the editor and hides suggestions.
	*/
	disable() {
		$.setProperty(this.node, { disabled: true });
		this.#refreshState();
		this.hide();
	}
	/** @inheritdoc */
	dispose() {
		if (!this.node) return;
		this.#transitionId++;
		this.#cancelSearch();
		for (const timer of this.#resetTimers) clearTimeout(timer);
		this.#resetTimers.clear();
		this.#scrollHandler?.cancel();
		this.#observer?.disconnect();
		this.#popper?.dispose();
		if (this.#hidden) $.addClass(this.node, this.constructor.classes.hide);
		else $.removeClass(this.node, this.constructor.classes.hide);
		for (const [name, value] of [["tabindex", this.#tabIndex], ["aria-hidden", this.#ariaHidden]]) if (value === null) $.removeAttribute(this.node, name);
		else $.setAttribute(this.node, { [name]: value });
		$.remove(this.#menuNode);
		$.remove(this.#container);
		this.#activeItems = [];
		this.#data = [];
		this.#focusedItem = null;
		this.#generatedOptions.clear();
		this.#focusHandler = null;
		this.#container = null;
		this.#form = null;
		this.#menuNode = null;
		this.#observer = null;
		this.#placeholder = null;
		this.#popper = null;
		this.#searchInput = null;
		this.#toggle = null;
		this.#loadResults = null;
		this.#scrollHandler = null;
		this.#value = [];
		this.#open = false;
		super.dispose();
	}
	/**
	* Enables the editor unless its containing fieldset remains disabled.
	*/
	enable() {
		$.setProperty(this.node, { disabled: false });
		this.#refreshState();
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
		if (!this.node || !this.#open || !$.triggerOne(this.node, "hide.ui.tagsinput") || !this.node) return;
		this.#open = false;
		this.#refreshFocus();
		this.#cancelSearch();
		this.#scrollHandler.cancel();
		this.#focusItem(null);
		$.setAttribute(this.#searchInput, { "aria-expanded": false });
		const id = ++this.#transitionId;
		$.removeClass(this.#menuNode, "show");
		waitForTransition(this.#menuNode, ["opacity"]).then(() => {
			if (!this.node || id !== this.#transitionId) return;
			this.#popper?.dispose();
			this.#popper = null;
			$.detach(this.#menuNode);
			this.#clearResults();
			$.triggerEvent(this.node, "hidden.ui.tagsinput");
		});
	}
	/**
	* Silently removes a tag.
	* @param {TagsInputValue} value The value to remove.
	*/
	remove(value) {
		const [key] = normalizeValues(value, this.options.trimValue);
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
		this.#placeholderText = String(placeholder ?? "");
		this.#refreshPlaceholder();
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
		if (!this.node || this.#open || $.is(this.node, ":disabled") || !$.triggerOne(this.node, "show.ui.tagsinput") || !this.node) return;
		this.#open = true;
		this.#refreshFocus();
		const id = ++this.#transitionId;
		if (this.options.appendTo) $.append(this.options.appendTo, this.#menuNode);
		else $.after($.closest(this.#container, ".input-group")[0] || this.#container, this.#menuNode);
		$.setAttribute(this.#searchInput, { "aria-expanded": "true" });
		this.#load();
		if (!this.node) return;
		this.#createPopper();
		$.css(this.#menuNode, "opacity");
		$.addClass(this.#menuNode, "show");
		waitForTransition(this.#menuNode, ["opacity"]).then(() => {
			if (this.node && id === this.#transitionId) $.triggerEvent(this.node, "shown.ui.tagsinput");
		});
	}
	/**
	* Toggles suggestions.
	*/
	toggle() {
		if (this.#open) this.hide();
		else this.show();
	}
	/**
	* Updates the menu position.
	*/
	update() {
		this.#popper?.update();
	}
	/**
	* Cancels queued and in-flight search requests.
	*/
	#cancelSearch() {
		this.#requestId++;
		this.#loadResults?.cancel();
		const request = this.#request;
		this.#request = null;
		this.#loading = false;
		try {
			request?.cancel?.();
		} catch {}
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
	* Positions the menu with the current UI Popper contract.
	*/
	#createPopper() {
		if (this.#popper) return;
		const options = {
			reference: this.#toggle,
			placement: this.options.placement,
			position: this.options.position,
			fixed: this.options.fixed,
			spacing: this.options.spacing,
			minContact: this.options.minContact
		};
		if (this.options.fullWidth) options.beforeUpdate = (node, reference) => {
			const width = `${$.width(reference, { boxSize: $.BORDER_BOX })}px`;
			$.setStyle(node, {
				width,
				minWidth: width,
				maxWidth: width
			});
		};
		this.#popper = new Popper(this.#menuNode, options);
	}
	/**
	* Attaches input, native form, and lifecycle events.
	*/
	#events() {
		this.#focusHandler = () => {
			$.focus(this.#searchInput);
		};
		this.listen(this.node, "focus.ui.tagsinput", this.#focusHandler);
		this.listen(this.node, "change.ui.tagsinput", (event) => {
			if (!event.skipUpdate) this.#setValue(this.#readNativeValue());
		});
		if (this.#form) this.listen(this.#form, "reset.ui.tagsinput", (event) => {
			const timer = setTimeout(() => {
				this.#resetTimers.delete(timer);
				if (this.node && !event.defaultPrevented) {
					$.setValue(this.#searchInput, "");
					this.#setValue(this.#readNativeValue());
					this.hide();
				}
			}, 0);
			this.#resetTimers.add(timer);
		});
		this.listen(this.node.ownerDocument, "click.ui.tagsinput", (event) => {
			if (!this.node) return;
			const label = $.is(event.target, "label") ? event.target : $.closest(event.target, "label")[0];
			if ($.getProperty(label, "control") === this.node && !containsNode(this.#container, event.target)) this.#focusHandler();
			else if (!containsNode(this.#container, event.target) && !containsNode(this.#menuNode, event.target)) this.hide();
		});
		$.addEvent(this.#container, "focusin.ui.tagsinput", () => {
			this.#refreshFocus();
			this.#refreshPlaceholder();
		});
		$.addEvent(this.#container, "focusout.ui.tagsinput", (event) => {
			if (containsNode(this.#container, event.relatedTarget)) return;
			queueMicrotask(() => {
				if (!this.node || containsNode(this.#container, this.node.ownerDocument.activeElement)) return;
				if (!$.is(this.node, ":disabled") && $.getValue(this.#searchInput)) {
					if (this.options.confirmOnBlur) this.#selectValue($.getValue(this.#searchInput), false);
					else if (this.options.clearOnBlur) $.setValue(this.#searchInput, "");
				}
				if (!this.node) return;
				this.hide();
				if (!this.node) return;
				this.#refreshFocus();
				this.#refreshPlaceholder();
				if (this.node) this.#updateSearchWidth();
			});
		});
		$.addEvent(this.#container, "click.ui.tagsinput", (event) => {
			if (!this.node || event.defaultPrevented || $.is(this.node, ":disabled")) return;
			$.focus(this.#searchInput);
			this.show();
		});
		$.addEventDelegate(this.#container, "click.ui.tagsinput", "[data-ui-action=\"clear\"]", (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (!this.node || $.is(this.node, ":disabled")) return;
			const key = $.getAttribute(event.currentTarget, "data-ui-value");
			const values = this.#value.filter((value) => value !== key);
			this.#setValue(values, true);
			if (this.node && this.#open) this.#load();
			if (this.node) $.focus(this.#searchInput);
		});
		$.addEvent(this.#menuNode, "mousedown.ui.tagsinput", (event) => event.preventDefault());
		$.addEvent(this.#menuNode, "click.ui.tagsinput", (event) => event.stopPropagation());
		$.addEventDelegate(this.#menuNode, "click.ui.tagsinput", "[data-ui-action=\"select\"]", (event) => this.#selectValue($.getAttribute(event.currentTarget, "data-ui-value")));
		$.addEventDelegate(this.#menuNode, "mouseover.ui.tagsinput", "[data-ui-action=\"select\"]", (event) => this.#focusItem(event.currentTarget));
		$.addEvent(this.#searchInput, "input.ui.tagsinput", (event) => {
			if ($.is(this.node, ":disabled") || event.isComposing) return;
			this.#updateSearchWidth();
			this.#refreshPlaceholder();
			if (this.#open) this.#load();
			else this.show();
		});
		$.addEvent(this.#searchInput, "keydown.ui.tagsinput", (event) => {
			if ($.is(this.node, ":disabled") || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
			const key = event.key;
			const active = this.#open ? this.#focusedItem : null;
			if (key === "Enter" || this.options.confirmKeys.includes(key)) {
				const value = key === "Enter" && active ? $.getAttribute(active, "data-ui-value") : $.getValue(this.#searchInput);
				if (value || this.options.confirmKeys.includes(key)) {
					event.preventDefault();
					this.#selectValue(value);
				}
			} else if (key === "Backspace" && !$.getValue(this.#searchInput) && this.#value.length) {
				event.preventDefault();
				this.#setValue(this.#value.slice(0, -1), true);
				if (this.node && this.#open) this.#load();
			} else if (key === "Escape" && this.#open) {
				event.preventDefault();
				event.stopPropagation();
				this.hide();
			} else if (key === "ArrowDown" || key === "ArrowUp") {
				event.preventDefault();
				if (!this.#open) {
					this.show();
					return;
				}
				const index = this.#activeItems.indexOf(active);
				const next = index < 0 ? 0 : index + (key === "ArrowDown" ? 1 : -1);
				const option = this.#activeItems[next];
				if (option) {
					this.#focusItem(option);
					$._callDomMethod(option, "scrollIntoView", { block: "nearest" });
				}
			}
		});
		this.#scrollHandler = $._throttle(() => {
			if (!this.node || !this.#open || this.#loading || !this.#showMore) return;
			const list = this.#menuNode;
			if ($.getScrollY(list) >= $.height(list, { boxSize: $.SCROLL_BOX }) - $.height(list) * 1.25) this.#load(this.#offset);
		}, 250, { leading: false });
		$.addEvent(this.#menuNode, "scroll.ui.tagsinput", this.#scrollHandler);
		const nativeData = !this.options.data && !this.options.getResults;
		this.#observer = new MutationObserver((records) => {
			if (!this.node) return;
			if (this.#refreshData(records)) {
				const focusedValue = $.getAttribute(this.#focusedItem, "data-ui-value");
				this.#setValue(this.#readNativeValue());
				this.#restoreFocus(focusedValue);
			} else this.#refreshState();
			if ($.is(this.node, ":disabled")) this.hide();
		});
		this.#observer.observe(this.node, {
			attributes: true,
			attributeFilter: [
				"disabled",
				"required",
				"aria-label",
				"aria-labelledby",
				...ariaAttributes,
				"value",
				"label",
				"selected"
			],
			childList: nativeData,
			characterData: nativeData,
			subtree: nativeData
		});
		for (const fieldset of $.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
			attributes: true,
			attributeFilter: ["disabled"]
		});
	}
	/**
	* Loads a remote result page, catching synchronous and asynchronous errors.
	* @param {TagsInputRequest} request The request parameters.
	* @param {number} id The request generation.
	* @returns {Promise<void>} Resolves when the request settles.
	*/
	async #fetchResults(request, id) {
		if (!this.node || id !== this.#requestId) return;
		try {
			const result = this.options.getResults.call(this, request);
			if (!this.node || id !== this.#requestId) {
				result?.cancel?.();
				return;
			}
			this.#request = result;
			const response = await result;
			if (!this.node || id !== this.#requestId) return;
			if (!Array.isArray(response?.results)) throw new TypeError("TagsInput results must be an array");
			if (!request.offset) this.#clearResults();
			else $.remove($.children(this.#menuNode, "[role=\"status\"]"));
			this.#offset = request.offset + response.results.length;
			this.#showMore = Boolean(response.showMore) && response.results.length > 0;
			this.#renderResults(normalizeValues(response.results));
		} catch {
			if (this.node && id === this.#requestId) {
				this.#showMore = false;
				$.remove($.children(this.#menuNode, "[role=\"status\"]"));
				this.#renderInfo(this.options.lang.error);
			}
		} finally {
			if (this.node && id === this.#requestId) {
				this.#request = null;
				this.#loading = false;
				this.update();
				if (this.#showMore && $.height(this.#menuNode, { boxSize: $.SCROLL_BOX }) <= $.height(this.#menuNode)) this.#scrollHandler();
			}
		}
	}
	/**
	* Updates the active suggestion and accessible descendant reference.
	* @param {HTMLElement|null} element The active suggestion.
	*/
	#focusItem(element) {
		$.removeClass(this.#focusedItem, this.constructor.classes.focus);
		this.#focusedItem = element;
		if (element) {
			$.addClass(element, this.constructor.classes.focus);
			$.setAttribute(this.#searchInput, { "aria-activedescendant": $.getProperty(element, "id") });
		} else $.removeAttribute(this.#searchInput, "aria-activedescendant");
	}
	/**
	* Filters and sorts local suggestions for the current search term.
	* @param {string} term The search term.
	* @returns {string[]} The matching results.
	*/
	#getLocalResults(term) {
		if (!term) return this.#data;
		const options = this.options;
		return this.#data.filter((value) => options.isMatch.call(this, value, term)).sort((a, b) => options.sortResults.call(this, a, b, term));
	}
	/**
	* Loads suggestions for the current editor value.
	* @param {number} [offset=0] The remote pagination offset.
	*/
	#load(offset = 0) {
		this.#cancelSearch();
		if (!offset) {
			this.#clearResults();
			this.#offset = 0;
			this.#showMore = false;
		} else $.remove($.children(this.#menuNode, "[role=\"status\"]"));
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
		} else if (typeof this.options.getResults === "function") {
			this.#loading = true;
			this.#renderInfo(this.options.lang.loading);
			this.#loadResults(term ? {
				offset,
				term
			} : { offset }, this.#requestId);
		} else this.#renderResults(this.#getLocalResults(term));
		this.update();
	}
	/**
	* Reads current native values without changing native option identities.
	* @returns {string[]} The selected values.
	*/
	#readNativeValue() {
		return [...$.getProperty(this.node, "selectedOptions")].map((option) => $.getValue(option));
	}
	/**
	* Refreshes the selection, placeholder, control state, and editor width.
	*/
	#refresh() {
		this.#renderSelection();
		if (!this.node) return;
		this.#refreshPlaceholder();
		this.#refreshState();
		this.#updateSearchWidth();
	}
	/**
	* Refreshes native suggestions when mutation records include option changes.
	* @param {MutationRecord[]} records The observed or queued mutations.
	* @returns {boolean} Whether native options changed.
	*/
	#refreshData(records) {
		if (this.options.data || this.options.getResults || !records.some((record) => record.type !== "attributes" || $.is(record.target, "option, optgroup"))) return false;
		const values = [...$.getProperty(this.node, "options")].map((option) => $.getValue(option));
		this.#data = normalizeValues(values);
		return true;
	}
	/**
	* Keeps focus styling while the editor, a removal button, or the menu is active.
	*/
	#refreshFocus() {
		if (!$.is(this.node, ":disabled") && (this.#open || containsNode(this.#container, this.node.ownerDocument.activeElement))) $.addClass(this.#toggle, this.constructor.classes.focus);
		else $.removeClass(this.#toggle, this.constructor.classes.focus);
	}
	/**
	* Updates the placeholder without moving the focused input.
	*/
	#refreshPlaceholder() {
		const html = this.options.sanitize.call(this, this.#placeholderText || "&nbsp;");
		if (!this.node) return;
		$.setHtml(this.#placeholder, html);
		$.setProperty(this.#placeholder, { hidden: Boolean(this.#value.length) || Boolean($.getValue(this.#searchInput)) || this.node.ownerDocument.activeElement === this.#searchInput });
	}
	/**
	* Synchronizes disabled, required, and accessible attributes with the native control.
	*/
	#refreshState() {
		const disabled = $.is(this.node, ":disabled");
		if (disabled) $.addClass(this.#toggle, this.constructor.classes.disabled);
		else $.removeClass(this.#toggle, this.constructor.classes.disabled);
		$.setProperty(this.#searchInput, { disabled });
		$.setProperty($.find("[data-ui-action=\"clear\"]", this.#container), { disabled });
		$.setProperty(this.#searchInput, { tabIndex: disabled ? -1 : Number(this.#tabIndex ?? 0) });
		$.setAttribute(this.#searchInput, {
			"aria-disabled": disabled,
			"aria-required": Boolean($.getProperty(this.node, "required"))
		});
		for (const attribute of ariaAttributes) {
			const value = $.getAttribute(this.node, attribute);
			if (value === null) {
				if (attribute !== "aria-required") $.removeAttribute(this.#searchInput, attribute);
			} else $.setAttribute(this.#searchInput, { [attribute]: value });
		}
		const labelledBy = $.getAttribute(this.node, "aria-labelledby");
		const label = $.getAttribute(this.node, "aria-label") || [...$.getProperty(this.node, "labels")].map((node) => $.getText(node).trim()).join(" ") || this.options.lang.search;
		if (labelledBy) {
			$.setAttribute(this.#searchInput, { "aria-labelledby": labelledBy });
			$.removeAttribute(this.#searchInput, "aria-label");
		} else {
			$.removeAttribute(this.#searchInput, "aria-labelledby");
			$.setAttribute(this.#searchInput, { "aria-label": label });
		}
		$.setAttribute(this.#menuNode, { "aria-label": label });
		this.#refreshFocus();
	}
	/**
	* Builds the wrapper, editable combobox, and detached suggestion listbox.
	*/
	#render() {
		const classes = this.constructor.classes;
		const id = generateId("tagsinput");
		this.#container = $.create("div", {
			class: classes.container,
			attributes: { dir: $.css(this.node, "direction") }
		});
		this.#toggle = $.create("div", { class: [$.getProperty(this.node, "className"), classes.tagToggle] });
		this.#placeholder = $.create("span", {
			class: classes.placeholder,
			attributes: { "aria-hidden": true }
		});
		this.#searchInput = $.create("input", {
			class: classes.tagInput,
			attributes: {
				"type": "text",
				"role": "combobox",
				"autocomplete": "off",
				"aria-autocomplete": "list",
				"aria-haspopup": "listbox",
				"aria-expanded": false,
				"aria-controls": id
			}
		});
		this.#menuNode = $.create("ul", {
			class: classes.menu,
			attributes: {
				id,
				"role": "listbox",
				"aria-multiselectable": true,
				"dir": $.css(this.node, "direction")
			},
			style: {
				"maxHeight": this.options.maxHeight,
				"--ui-tagsinput-duration": `${Math.max(0, Number(this.options.duration) || 0)}ms`
			}
		});
		if ($.is(this.node, ".input-sm") || $.closest(this.node, ".input-group-sm").length) $.addClass(this.#menuNode, classes.menuSmall);
		else if ($.is(this.node, ".input-lg") || $.closest(this.node, ".input-group-lg").length) $.addClass(this.#menuNode, classes.menuLarge);
		$.append(this.#toggle, [this.#placeholder, this.#searchInput]);
		$.append(this.#container, this.#toggle);
		$.after(this.node, this.#container);
		$.addClass(this.node, classes.hide);
		$.setAttribute(this.node, {
			"tabindex": -1,
			"aria-hidden": true
		});
	}
	/**
	* Renders a keyboard-operable tag removal button.
	* @param {string} value The tag value.
	* @returns {HTMLButtonElement} The clear button.
	*/
	#renderClear(value) {
		const classes = this.constructor.classes;
		const button = $.create("button", {
			class: classes.tagClear,
			attributes: {
				"type": "button",
				"aria-label": `${this.options.lang.clear}: ${value}`
			},
			dataset: {
				uiAction: "clear",
				uiValue: value
			}
		});
		$.append(button, $.create("span", {
			class: classes.tagClearIcon,
			attributes: { "aria-hidden": true }
		}));
		return button;
	}
	/**
	* Renders callback output, sanitizing strings but preserving supplied nodes.
	* @param {string} value The tag.
	* @param {HTMLElement} element The destination.
	* @param {TagsInputRenderer} renderer The consumer renderer.
	*/
	#renderContent(value, element, renderer) {
		const content = renderer.call(this, value, element);
		if (!this.node) return;
		if (typeof content === "string") $.setHtml(element, this.options.sanitize.call(this, content));
		else if ($._isElement(content) && content !== element) $.append(element, content);
	}
	/**
	* Appends a sanitized status message.
	* @param {string} text The message.
	*/
	#renderInfo(text) {
		const html = this.options.sanitize.call(this, text);
		if (this.node) $.append(this.#menuNode, $.create("li", {
			class: this.constructor.classes.info,
			attributes: { role: "status" },
			html
		}));
	}
	/**
	* Renders a suggestion with its selection state.
	* @param {string} value The suggestion value.
	* @returns {HTMLLIElement} The option element.
	*/
	#renderItem(value) {
		const classes = this.constructor.classes;
		const selected = this.#value.includes(value);
		const element = $.create("li", {
			class: classes.item,
			attributes: {
				"id": generateId("tagsinput-item"),
				"role": "option",
				"aria-label": value,
				"aria-selected": selected
			},
			dataset: {
				uiAction: "select",
				uiValue: value
			}
		});
		if (selected) $.addClass(element, classes.active);
		this.#renderContent(value, element, this.options.renderResult);
		return element;
	}
	/**
	* Appends unique suggestions and initializes keyboard focus.
	* @param {string[]} results The results.
	*/
	#renderResults(results) {
		const seen = new Set(this.#activeItems.map((element) => $.getAttribute(element, "data-ui-value")));
		for (const value of results) {
			if (seen.has(value)) continue;
			seen.add(value);
			const element = this.#renderItem(value);
			if (!this.node) return;
			this.#activeItems.push(element);
			$.append(this.#menuNode, element);
		}
		if (!$.hasChildren(this.#menuNode)) $.hide(this.#menuNode);
		if (!this.#focusedItem) this.#focusItem(this.#activeItems[0] || null);
	}
	/**
	* Rebuilds tag chips before the editor, leaving its focus intact.
	*/
	#renderSelection() {
		const classes = this.constructor.classes;
		$.remove($.children(this.#toggle, "[data-ui-tag]"));
		for (const value of this.#value) {
			const group = $.create("div", {
				class: classes.tagGroup,
				dataset: { uiTag: true }
			});
			const label = $.create("span", { class: classes.tagItem });
			this.#renderContent(value, label, this.options.renderSelection);
			if (!this.node) return;
			if (this.options.showClear) $.append(group, this.#renderClear(value));
			$.append(group, label);
			$.before(this.#searchInput, group);
		}
	}
	/**
	* Restores an option's focus and visibility after replacing result nodes.
	* @param {string|null} value The option value key.
	*/
	#restoreFocus(value) {
		const element = this.#activeItems.find((item) => $.getAttribute(item, "data-ui-value") === value);
		if (element) {
			this.#focusItem(element);
			$._callDomMethod(element, "scrollIntoView", { block: "nearest" });
		}
	}
	/**
	* Confirms free text or a suggestion, emitting at most one effective change.
	* @param {string} value The value.
	* @param {boolean} [focus=true] Whether to refocus the editor.
	*/
	#selectValue(value, focus = true) {
		if ($.is(this.node, ":disabled")) return;
		this.#setValue([...this.#value, value], true);
		if (!this.node) return;
		$.setValue(this.#searchInput, "");
		this.#refreshPlaceholder();
		if (!this.node) return;
		this.#updateSearchWidth();
		if (this.options.closeOnSelect) this.hide();
		else if (this.#open) this.#load();
		if (this.node && focus) $.focus(this.#searchInput);
	}
	/**
	* Normalizes and validates values before synchronizing selection.
	* @param {TagsInputValue|TagsInputValue[]|null|undefined} value The requested values.
	* @param {boolean} [notify=false] Whether this is a user change.
	*/
	#setValue(value, notify = false) {
		const records = this.#observer?.takeRecords() ?? [];
		this.#refreshData(records);
		const options = this.options;
		let values = normalizeValues(value, options.trimValue).filter((entry) => options.validTag.call(this, entry));
		if (!this.node) return;
		if (this.#maxSelections) values = values.slice(0, this.#maxSelections);
		const changed = values.length !== this.#value.length || values.some((entry, index) => entry !== this.#value[index]);
		this.#value = values;
		const lookup = /* @__PURE__ */ new Map();
		for (const option of $.getProperty(this.node, "options")) {
			$.setProperty(option, { selected: false });
			if (!lookup.has($.getValue(option))) lookup.set($.getValue(option), option);
		}
		for (const entry of this.#value) {
			let option = lookup.get(entry);
			if (!option) {
				option = $.create("option", {
					value: entry,
					text: entry
				});
				this.#generatedOptions.add(option);
				$.append(this.node, option);
			}
			$.setProperty(option, { selected: true });
		}
		for (const option of this.#generatedOptions) if (!containsNode(this.node, option) || !$.getProperty(option, "selected") && !$.getProperty(option, "defaultSelected")) {
			$.remove(option);
			this.#generatedOptions.delete(option);
		}
		this.#observer?.takeRecords();
		this.#refresh();
		if (!this.node) return;
		if (records.length && $.is(this.node, ":disabled")) {
			this.hide();
			if (!this.node) return;
		}
		if (this.#open && !notify) this.#load();
		if (notify && changed) $.triggerEvent(this.node, "change.ui.tagsinput", { data: { skipUpdate: true } });
	}
	/**
	* Sizes the editor to its text.
	*/
	#updateSearchWidth() {
		const span = $.create("span", {
			text: $.getValue(this.#searchInput),
			style: {
				position: "absolute",
				visibility: "hidden",
				font: $.css(this.#searchInput, "font"),
				letterSpacing: $.css(this.#searchInput, "letterSpacing"),
				whiteSpace: "pre"
			}
		});
		$.append(this.node.ownerDocument.body, span);
		$.setStyle(this.#searchInput, "width", `${$.width(span) + 2}px`);
		$.remove(span);
	}
};

//#endregion
//#region src/js/index.js
initComponent("tagsinput", TagsInput);
var js_default = TagsInput;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-tagsinput.esm.js.map