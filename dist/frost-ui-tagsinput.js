(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/ui'), require('@fr0st/query')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/ui', '@fr0st/query'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.UI,global.fQuery));
})(this, function(exports, _fr0st_ui, _fr0st_query) {
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) {
					__defProp(to, key, {
						get: ((k) => from[k]).bind(null, key),
						enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
					});
				}
			}
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));

//#endregion
_fr0st_query = __toESM(_fr0st_query, 1);

//#region src/js/helpers.js
/** @import { TagsInputValue } from './tags-input.js'; */
	/**
	* Checks whether a node is the parent itself or one of its descendants.
	* @param {Node} parent The parent node.
	* @param {Node|null} node The node to check.
	* @returns {boolean} Whether the parent contains the node.
	*/
	function containsNode(parent, node) {
		return Boolean(node) && (_fr0st_query.default.isSame(parent, node) || _fr0st_query.default.hasDescendent(parent, node));
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
	/** @typedef {(TagsInputResults|PromiseLike<TagsInputResults>) & {cancel?: Function}} TagsInputPendingResults */
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
	* @property {'auto'|'top'|'bottom'|'start'|'end'} [placement='bottom'] The preferred menu placement.
	* @property {'start'|'center'|'end'} [position='start'] The menu alignment.
	* @property {boolean} [fixed=false] Preserves the preferred placement.
	* @property {number} [spacing=0] The distance from the control.
	* @property {number|false} [minContact=false] The minimum contact with the control.
	*/
	/**
	* Controls editable tags backed by a native multiple select.
	* @augments {BaseComponent<TagsInputOptions>}
	*/
	var TagsInput = class extends _fr0st_ui.BaseComponent {
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
			sanitize: (input) => _fr0st_query.default.sanitize(input),
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
		#changeHandler = null;
		#container = null;
		#data = [];
		#documentHandler = null;
		#focusedItem = null;
		#focusHandler = null;
		#form = null;
		#generatedOptions = /* @__PURE__ */ new Set();
		#hidden;
		#loading = false;
		#loadResults = null;
		#maxSelections;
		#menuNode = null;
		#notifying = false;
		#observer = null;
		#offset = 0;
		#open = false;
		#placeholder = null;
		#placeholderText;
		#popper = null;
		#request = null;
		#requestId = 0;
		#resetHandler = null;
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
		*/
		constructor(node, options) {
			if (!_fr0st_query.default._isElement(node) || !_fr0st_query.default.is(node, "select[multiple]")) throw new TypeError("TagsInput must be created on a multiple select element.");
			super(node, options);
			try {
				this.#tabIndex = _fr0st_query.default.getAttribute(this.node, "tabindex");
				this.#hidden = _fr0st_query.default.hasClass(this.node, this.constructor.classes.hide);
				this.#ariaHidden = _fr0st_query.default.getAttribute(this.node, "aria-hidden");
				this.#form = _fr0st_query.default.getProperty(this.node, "form");
				this.#maxSelections = normalizeLimit(this.options.maxSelections);
				this.#placeholderText = String(this.options.placeholder ?? "");
				const data = this.options.data ?? [..._fr0st_query.default.getProperty(this.node, "options")].map((option) => _fr0st_query.default.getValue(option));
				this.#data = normalizeValues(data);
				this.#loadResults = _fr0st_query.default._debounce((request, id) => this.#fetchResults(request, id), this.options.debounce);
				const focused = _fr0st_query.default.is(this.node, ":focus");
				this.#render();
				this.#events();
				this.#setValue(this.#readNativeValue());
				if (focused) _fr0st_query.default.focus(this.#searchInput);
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
			_fr0st_query.default.setProperty(this.node, { disabled: true });
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
			if (this.#focusHandler) _fr0st_query.default.removeEvent(this.node, "focus.ui.tagsinput", this.#focusHandler);
			if (this.#changeHandler) _fr0st_query.default.removeEvent(this.node, "change.ui.tagsinput", this.#changeHandler);
			if (this.#documentHandler) _fr0st_query.default.removeEvent(this.node.ownerDocument, "click.ui.tagsinput", this.#documentHandler);
			if (this.#form && this.#resetHandler) _fr0st_query.default.removeEvent(this.#form, "reset.ui.tagsinput", this.#resetHandler);
			if (this.#hidden) _fr0st_query.default.addClass(this.node, this.constructor.classes.hide);
			else _fr0st_query.default.removeClass(this.node, this.constructor.classes.hide);
			for (const [name, value] of [["tabindex", this.#tabIndex], ["aria-hidden", this.#ariaHidden]]) if (value === null) _fr0st_query.default.removeAttribute(this.node, name);
			else _fr0st_query.default.setAttribute(this.node, { [name]: value });
			_fr0st_query.default.remove(this.#menuNode);
			_fr0st_query.default.remove(this.#container);
			this.#activeItems = [];
			this.#data = [];
			this.#focusedItem = null;
			this.#generatedOptions.clear();
			this.#changeHandler = null;
			this.#documentHandler = null;
			this.#focusHandler = null;
			this.#resetHandler = null;
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
			_fr0st_query.default.setProperty(this.node, { disabled: false });
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
			if (!this.node || !this.#open || !_fr0st_query.default.triggerOne(this.node, "hide.ui.tagsinput") || !this.node) return;
			this.#open = false;
			this.#refreshFocus();
			this.#cancelSearch();
			this.#scrollHandler.cancel();
			this.#focusItem(null);
			_fr0st_query.default.setAttribute(this.#searchInput, { "aria-expanded": false });
			const id = ++this.#transitionId;
			_fr0st_query.default.removeClass(this.#menuNode, "show");
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then(() => {
				if (!this.node || id !== this.#transitionId) return;
				this.#popper?.dispose();
				this.#popper = null;
				_fr0st_query.default.detach(this.#menuNode);
				this.#clearResults();
				_fr0st_query.default.triggerEvent(this.node, "hidden.ui.tagsinput");
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
			if (!this.node || this.#open || _fr0st_query.default.is(this.node, ":disabled") || !_fr0st_query.default.triggerOne(this.node, "show.ui.tagsinput") || !this.node) return;
			this.#open = true;
			this.#refreshFocus();
			const id = ++this.#transitionId;
			if (this.options.appendTo) _fr0st_query.default.append(this.options.appendTo, this.#menuNode);
			else _fr0st_query.default.after(_fr0st_query.default.closest(this.#container, ".input-group")[0] || this.#container, this.#menuNode);
			_fr0st_query.default.setAttribute(this.#searchInput, { "aria-expanded": "true" });
			this.#load();
			if (!this.node) return;
			this.#createPopper();
			_fr0st_query.default.css(this.#menuNode, "opacity");
			_fr0st_query.default.addClass(this.#menuNode, "show");
			(0, _fr0st_ui.waitForTransition)(this.#menuNode, ["opacity"]).then(() => {
				if (this.node && id === this.#transitionId) _fr0st_query.default.triggerEvent(this.node, "shown.ui.tagsinput");
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
			_fr0st_query.default.empty(this.#menuNode);
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
				const width = `${_fr0st_query.default.width(reference, { boxSize: _fr0st_query.default.BORDER_BOX })}px`;
				_fr0st_query.default.setStyle(node, {
					width,
					minWidth: width,
					maxWidth: width
				});
			};
			this.#popper = new _fr0st_ui.Popper(this.#menuNode, options);
		}
		/**
		* Attaches input, native form, and lifecycle events.
		*/
		#events() {
			this.#focusHandler = () => {
				_fr0st_query.default.focus(this.#searchInput);
			};
			this.#changeHandler = () => {
				if (!this.#notifying) this.#setValue(this.#readNativeValue());
			};
			_fr0st_query.default.addEvent(this.node, "focus.ui.tagsinput", this.#focusHandler);
			_fr0st_query.default.addEvent(this.node, "change.ui.tagsinput", this.#changeHandler);
			if (this.#form) {
				this.#resetHandler = (event) => {
					const timer = setTimeout(() => {
						this.#resetTimers.delete(timer);
						if (this.node && !event.defaultPrevented) {
							_fr0st_query.default.setValue(this.#searchInput, "");
							this.#setValue(this.#readNativeValue());
							this.hide();
						}
					}, 0);
					this.#resetTimers.add(timer);
				};
				_fr0st_query.default.addEvent(this.#form, "reset.ui.tagsinput", this.#resetHandler);
			}
			this.#documentHandler = (event) => {
				if (!this.node) return;
				const label = _fr0st_query.default.is(event.target, "label") ? event.target : _fr0st_query.default.closest(event.target, "label")[0];
				if (_fr0st_query.default.getProperty(label, "control") === this.node && !containsNode(this.#container, event.target)) this.#focusHandler();
				else if (!containsNode(this.#container, event.target) && !containsNode(this.#menuNode, event.target)) this.hide();
			};
			_fr0st_query.default.addEvent(this.node.ownerDocument, "click.ui.tagsinput", this.#documentHandler);
			_fr0st_query.default.addEvent(this.#container, "focusin.ui.tagsinput", () => {
				this.#refreshFocus();
				this.#refreshPlaceholder();
			});
			_fr0st_query.default.addEvent(this.#container, "focusout.ui.tagsinput", (event) => {
				if (containsNode(this.#container, event.relatedTarget)) return;
				queueMicrotask(() => {
					if (!this.node || containsNode(this.#container, this.node.ownerDocument.activeElement)) return;
					if (!_fr0st_query.default.is(this.node, ":disabled") && _fr0st_query.default.getValue(this.#searchInput)) {
						if (this.options.confirmOnBlur) this.#selectValue(_fr0st_query.default.getValue(this.#searchInput), false);
						else if (this.options.clearOnBlur) _fr0st_query.default.setValue(this.#searchInput, "");
					}
					if (!this.node) return;
					this.hide();
					if (!this.node) return;
					this.#refreshFocus();
					this.#refreshPlaceholder();
					if (this.node) this.#updateSearchWidth();
				});
			});
			_fr0st_query.default.addEvent(this.#container, "click.ui.tagsinput", (event) => {
				if (!this.node || event.defaultPrevented || _fr0st_query.default.is(this.node, ":disabled")) return;
				_fr0st_query.default.focus(this.#searchInput);
				this.show();
			});
			_fr0st_query.default.addEventDelegate(this.#container, "click.ui.tagsinput", "[data-ui-action=\"clear\"]", (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!this.node || _fr0st_query.default.is(this.node, ":disabled")) return;
				const key = _fr0st_query.default.getAttribute(event.currentTarget, "data-ui-value");
				const values = this.#value.filter((value) => value !== key);
				this.#setValue(values, true);
				if (this.node && this.#open) this.#load();
				if (this.node) _fr0st_query.default.focus(this.#searchInput);
			});
			_fr0st_query.default.addEvent(this.#menuNode, "mousedown.ui.tagsinput", (event) => event.preventDefault());
			_fr0st_query.default.addEvent(this.#menuNode, "click.ui.tagsinput", (event) => event.stopPropagation());
			_fr0st_query.default.addEventDelegate(this.#menuNode, "click.ui.tagsinput", "[data-ui-action=\"select\"]", (event) => this.#selectValue(_fr0st_query.default.getAttribute(event.currentTarget, "data-ui-value")));
			_fr0st_query.default.addEventDelegate(this.#menuNode, "mouseover.ui.tagsinput", "[data-ui-action=\"select\"]", (event) => this.#focusItem(event.currentTarget));
			_fr0st_query.default.addEvent(this.#searchInput, "input.ui.tagsinput", (event) => {
				if (_fr0st_query.default.is(this.node, ":disabled") || event.isComposing) return;
				this.#updateSearchWidth();
				this.#refreshPlaceholder();
				if (this.#open) this.#load();
				else this.show();
			});
			_fr0st_query.default.addEvent(this.#searchInput, "keydown.ui.tagsinput", (event) => {
				if (_fr0st_query.default.is(this.node, ":disabled") || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
				const key = event.key;
				const active = this.#open ? this.#focusedItem : null;
				if (key === "Enter" || this.options.confirmKeys.includes(key)) {
					const value = key === "Enter" && active ? _fr0st_query.default.getAttribute(active, "data-ui-value") : _fr0st_query.default.getValue(this.#searchInput);
					if (value || this.options.confirmKeys.includes(key)) {
						event.preventDefault();
						this.#selectValue(value);
					}
				} else if (key === "Backspace" && !_fr0st_query.default.getValue(this.#searchInput) && this.#value.length) {
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
						_fr0st_query.default._callDomMethod(option, "scrollIntoView", { block: "nearest" });
					}
				}
			});
			this.#scrollHandler = _fr0st_query.default._throttle(() => {
				if (!this.node || !this.#open || this.#loading || !this.#showMore) return;
				const list = this.#menuNode;
				if (_fr0st_query.default.getScrollY(list) >= _fr0st_query.default.height(list, { boxSize: _fr0st_query.default.SCROLL_BOX }) - _fr0st_query.default.height(list) * 1.25) this.#load(this.#offset);
			}, 250, { leading: false });
			_fr0st_query.default.addEvent(this.#menuNode, "scroll.ui.tagsinput", this.#scrollHandler);
			const nativeData = !this.options.data && !this.options.getResults;
			this.#observer = new MutationObserver((records) => {
				if (!this.node) return;
				if (this.#refreshData(records)) {
					const focusedValue = _fr0st_query.default.getAttribute(this.#focusedItem, "data-ui-value");
					this.#setValue(this.#readNativeValue());
					this.#restoreFocus(focusedValue);
				} else this.#refreshState();
				if (_fr0st_query.default.is(this.node, ":disabled")) this.hide();
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
			for (const fieldset of _fr0st_query.default.parents(this.node, "fieldset")) this.#observer.observe(fieldset, {
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
				else _fr0st_query.default.remove(_fr0st_query.default.children(this.#menuNode, "[role=\"status\"]"));
				this.#offset = request.offset + response.results.length;
				this.#showMore = Boolean(response.showMore) && response.results.length > 0;
				this.#renderResults(normalizeValues(response.results));
			} catch {
				if (this.node && id === this.#requestId) {
					this.#showMore = false;
					_fr0st_query.default.remove(_fr0st_query.default.children(this.#menuNode, "[role=\"status\"]"));
					this.#renderInfo(this.options.lang.error);
				}
			} finally {
				if (this.node && id === this.#requestId) {
					this.#request = null;
					this.#loading = false;
					this.update();
					if (this.#showMore && _fr0st_query.default.height(this.#menuNode, { boxSize: _fr0st_query.default.SCROLL_BOX }) <= _fr0st_query.default.height(this.#menuNode)) this.#scrollHandler();
				}
			}
		}
		/**
		* Updates the active suggestion and accessible descendant reference.
		* @param {HTMLElement|null} element The active suggestion.
		*/
		#focusItem(element) {
			_fr0st_query.default.removeClass(this.#focusedItem, this.constructor.classes.focus);
			this.#focusedItem = element;
			if (element) {
				_fr0st_query.default.addClass(element, this.constructor.classes.focus);
				_fr0st_query.default.setAttribute(this.#searchInput, { "aria-activedescendant": _fr0st_query.default.getProperty(element, "id") });
			} else _fr0st_query.default.removeAttribute(this.#searchInput, "aria-activedescendant");
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
			} else _fr0st_query.default.remove(_fr0st_query.default.children(this.#menuNode, "[role=\"status\"]"));
			const term = _fr0st_query.default.getValue(this.#searchInput);
			if (term.length < this.options.minSearch) {
				_fr0st_query.default.hide(this.#menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this.#menuNode);
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
			return [..._fr0st_query.default.getProperty(this.node, "selectedOptions")].map((option) => _fr0st_query.default.getValue(option));
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
			if (this.options.data || this.options.getResults || !records.some((record) => record.type !== "attributes" || _fr0st_query.default.is(record.target, "option, optgroup"))) return false;
			const values = [..._fr0st_query.default.getProperty(this.node, "options")].map((option) => _fr0st_query.default.getValue(option));
			this.#data = normalizeValues(values);
			return true;
		}
		/**
		* Keeps focus styling while the editor, a removal button, or the menu is active.
		*/
		#refreshFocus() {
			if (!_fr0st_query.default.is(this.node, ":disabled") && (this.#open || containsNode(this.#container, this.node.ownerDocument.activeElement))) _fr0st_query.default.addClass(this.#toggle, this.constructor.classes.focus);
			else _fr0st_query.default.removeClass(this.#toggle, this.constructor.classes.focus);
		}
		/**
		* Updates the placeholder without moving the focused input.
		*/
		#refreshPlaceholder() {
			const html = this.options.sanitize.call(this, this.#placeholderText || "&nbsp;");
			if (!this.node) return;
			_fr0st_query.default.setHtml(this.#placeholder, html);
			_fr0st_query.default.setProperty(this.#placeholder, { hidden: Boolean(this.#value.length) || Boolean(_fr0st_query.default.getValue(this.#searchInput)) || this.node.ownerDocument.activeElement === this.#searchInput });
		}
		/**
		* Synchronizes disabled, required, and accessible attributes with the native control.
		*/
		#refreshState() {
			const disabled = _fr0st_query.default.is(this.node, ":disabled");
			if (disabled) _fr0st_query.default.addClass(this.#toggle, this.constructor.classes.disabled);
			else _fr0st_query.default.removeClass(this.#toggle, this.constructor.classes.disabled);
			_fr0st_query.default.setProperty(this.#searchInput, { disabled });
			_fr0st_query.default.setProperty(_fr0st_query.default.find("[data-ui-action=\"clear\"]", this.#container), { disabled });
			_fr0st_query.default.setProperty(this.#searchInput, { tabIndex: disabled ? -1 : Number(this.#tabIndex ?? 0) });
			_fr0st_query.default.setAttribute(this.#searchInput, {
				"aria-disabled": disabled,
				"aria-required": Boolean(_fr0st_query.default.getProperty(this.node, "required"))
			});
			for (const attribute of ariaAttributes) {
				const value = _fr0st_query.default.getAttribute(this.node, attribute);
				if (value === null) {
					if (attribute !== "aria-required") _fr0st_query.default.removeAttribute(this.#searchInput, attribute);
				} else _fr0st_query.default.setAttribute(this.#searchInput, { [attribute]: value });
			}
			const labelledBy = _fr0st_query.default.getAttribute(this.node, "aria-labelledby");
			const label = _fr0st_query.default.getAttribute(this.node, "aria-label") || [..._fr0st_query.default.getProperty(this.node, "labels")].map((node) => _fr0st_query.default.getText(node).trim()).join(" ") || this.options.lang.search;
			if (labelledBy) {
				_fr0st_query.default.setAttribute(this.#searchInput, { "aria-labelledby": labelledBy });
				_fr0st_query.default.removeAttribute(this.#searchInput, "aria-label");
			} else {
				_fr0st_query.default.removeAttribute(this.#searchInput, "aria-labelledby");
				_fr0st_query.default.setAttribute(this.#searchInput, { "aria-label": label });
			}
			_fr0st_query.default.setAttribute(this.#menuNode, { "aria-label": label });
			this.#refreshFocus();
		}
		/**
		* Builds the wrapper, editable combobox, and detached suggestion listbox.
		*/
		#render() {
			const classes = this.constructor.classes;
			const id = (0, _fr0st_ui.generateId)("tagsinput");
			this.#container = _fr0st_query.default.create("div", {
				class: classes.container,
				attributes: { dir: _fr0st_query.default.css(this.node, "direction") }
			});
			this.#toggle = _fr0st_query.default.create("div", { class: [_fr0st_query.default.getProperty(this.node, "className"), classes.tagToggle] });
			this.#placeholder = _fr0st_query.default.create("span", {
				class: classes.placeholder,
				attributes: { "aria-hidden": true }
			});
			this.#searchInput = _fr0st_query.default.create("input", {
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
			this.#menuNode = _fr0st_query.default.create("ul", {
				class: classes.menu,
				attributes: {
					id,
					"role": "listbox",
					"aria-multiselectable": true,
					"dir": _fr0st_query.default.css(this.node, "direction")
				},
				style: {
					"maxHeight": this.options.maxHeight,
					"--ui-tagsinput-duration": `${Math.max(0, Number(this.options.duration) || 0)}ms`
				}
			});
			if (_fr0st_query.default.is(this.node, ".input-sm") || _fr0st_query.default.closest(this.node, ".input-group-sm").length) _fr0st_query.default.addClass(this.#menuNode, classes.menuSmall);
			else if (_fr0st_query.default.is(this.node, ".input-lg") || _fr0st_query.default.closest(this.node, ".input-group-lg").length) _fr0st_query.default.addClass(this.#menuNode, classes.menuLarge);
			_fr0st_query.default.append(this.#toggle, [this.#placeholder, this.#searchInput]);
			_fr0st_query.default.append(this.#container, this.#toggle);
			_fr0st_query.default.after(this.node, this.#container);
			_fr0st_query.default.addClass(this.node, classes.hide);
			_fr0st_query.default.setAttribute(this.node, {
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
			const button = _fr0st_query.default.create("button", {
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
			_fr0st_query.default.append(button, _fr0st_query.default.create("span", {
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
			if (typeof content === "string") _fr0st_query.default.setHtml(element, this.options.sanitize.call(this, content));
			else if (_fr0st_query.default._isElement(content) && content !== element) _fr0st_query.default.append(element, content);
		}
		/**
		* Appends a sanitized status message.
		* @param {string} text The message.
		*/
		#renderInfo(text) {
			const html = this.options.sanitize.call(this, text);
			if (this.node) _fr0st_query.default.append(this.#menuNode, _fr0st_query.default.create("li", {
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
			const element = _fr0st_query.default.create("li", {
				class: classes.item,
				attributes: {
					"id": (0, _fr0st_ui.generateId)("tagsinput-item"),
					"role": "option",
					"aria-label": value,
					"aria-selected": selected
				},
				dataset: {
					uiAction: "select",
					uiValue: value
				}
			});
			if (selected) _fr0st_query.default.addClass(element, classes.active);
			this.#renderContent(value, element, this.options.renderResult);
			return element;
		}
		/**
		* Appends unique suggestions and initializes keyboard focus.
		* @param {string[]} results The results.
		*/
		#renderResults(results) {
			const seen = new Set(this.#activeItems.map((element) => _fr0st_query.default.getAttribute(element, "data-ui-value")));
			for (const value of results) {
				if (seen.has(value)) continue;
				seen.add(value);
				const element = this.#renderItem(value);
				if (!this.node) return;
				this.#activeItems.push(element);
				_fr0st_query.default.append(this.#menuNode, element);
			}
			if (!_fr0st_query.default.hasChildren(this.#menuNode)) _fr0st_query.default.hide(this.#menuNode);
			if (!this.#focusedItem) this.#focusItem(this.#activeItems[0] || null);
		}
		/**
		* Rebuilds tag chips before the editor, leaving its focus intact.
		*/
		#renderSelection() {
			const classes = this.constructor.classes;
			_fr0st_query.default.remove(_fr0st_query.default.children(this.#toggle, "[data-ui-tag]"));
			for (const value of this.#value) {
				const group = _fr0st_query.default.create("div", {
					class: classes.tagGroup,
					dataset: { uiTag: true }
				});
				const label = _fr0st_query.default.create("span", { class: classes.tagItem });
				this.#renderContent(value, label, this.options.renderSelection);
				if (!this.node) return;
				if (this.options.showClear) _fr0st_query.default.append(group, this.#renderClear(value));
				_fr0st_query.default.append(group, label);
				_fr0st_query.default.before(this.#searchInput, group);
			}
		}
		/**
		* Restores an option's focus and visibility after replacing result nodes.
		* @param {string|null} value The option value key.
		*/
		#restoreFocus(value) {
			const element = this.#activeItems.find((item) => _fr0st_query.default.getAttribute(item, "data-ui-value") === value);
			if (element) {
				this.#focusItem(element);
				_fr0st_query.default._callDomMethod(element, "scrollIntoView", { block: "nearest" });
			}
		}
		/**
		* Confirms free text or a suggestion, emitting at most one effective change.
		* @param {string} value The value.
		* @param {boolean} [focus=true] Whether to refocus the editor.
		*/
		#selectValue(value, focus = true) {
			if (_fr0st_query.default.is(this.node, ":disabled")) return;
			this.#setValue([...this.#value, value], true);
			if (!this.node) return;
			_fr0st_query.default.setValue(this.#searchInput, "");
			this.#refreshPlaceholder();
			if (!this.node) return;
			this.#updateSearchWidth();
			if (this.options.closeOnSelect) this.hide();
			else if (this.#open) this.#load();
			if (this.node && focus) _fr0st_query.default.focus(this.#searchInput);
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
			for (const option of _fr0st_query.default.getProperty(this.node, "options")) {
				_fr0st_query.default.setProperty(option, { selected: false });
				if (!lookup.has(_fr0st_query.default.getValue(option))) lookup.set(_fr0st_query.default.getValue(option), option);
			}
			for (const entry of this.#value) {
				let option = lookup.get(entry);
				if (!option) {
					option = _fr0st_query.default.create("option", {
						value: entry,
						text: entry
					});
					this.#generatedOptions.add(option);
					_fr0st_query.default.append(this.node, option);
				}
				_fr0st_query.default.setProperty(option, { selected: true });
			}
			for (const option of this.#generatedOptions) if (!containsNode(this.node, option) || !_fr0st_query.default.getProperty(option, "selected") && !_fr0st_query.default.getProperty(option, "defaultSelected")) {
				_fr0st_query.default.remove(option);
				this.#generatedOptions.delete(option);
			}
			this.#observer?.takeRecords();
			this.#refresh();
			if (!this.node) return;
			if (records.length && _fr0st_query.default.is(this.node, ":disabled")) {
				this.hide();
				if (!this.node) return;
			}
			if (this.#open && !notify) this.#load();
			if (notify && changed) {
				this.#notifying = true;
				try {
					_fr0st_query.default.triggerEvent(this.node, "change.ui.tagsinput");
				} finally {
					this.#notifying = false;
				}
			}
		}
		/**
		* Sizes the editor to its text.
		*/
		#updateSearchWidth() {
			const span = _fr0st_query.default.create("span", {
				text: _fr0st_query.default.getValue(this.#searchInput),
				style: {
					position: "absolute",
					visibility: "hidden",
					font: _fr0st_query.default.css(this.#searchInput, "font"),
					letterSpacing: _fr0st_query.default.css(this.#searchInput, "letterSpacing"),
					whiteSpace: "pre"
				}
			});
			_fr0st_query.default.append(this.node.ownerDocument.body, span);
			_fr0st_query.default.setStyle(this.#searchInput, "width", `${_fr0st_query.default.width(span) + 2}px`);
			_fr0st_query.default.remove(span);
		}
	};

//#endregion
//#region src/js/index.js
	(0, _fr0st_ui.initComponent)("tagsinput", TagsInput);
	var js_default = TagsInput;

//#endregion
exports.TagsInput = js_default;
});
//# sourceMappingURL=frost-ui-tagsinput.js.map