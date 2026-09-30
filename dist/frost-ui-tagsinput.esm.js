import $ from "@fr0st/query";
import { BaseComponent, Popper, generateId, initComponent } from "@fr0st/ui";

//#region src/js/tags-input.js
/**
* TagsInput Class
* @class
*/
var TagsInput = class extends BaseComponent {
	/**
	* New TagsInput constructor.
	* @param {HTMLElement} node The input node.
	* @param {object} [settings] The options to create the TagsInput with.
	*/
	constructor(node, settings) {
		super(node, settings);
		if (!$.is(this._node, "select")) throw new Error("TagsInput must be created on a select element");
		this._placeholderText = this._options.placeholder;
		this._maxSelections = this._options.maxSelections;
		this._data = [];
		this._optionLookup = {};
		this._activeItems = [];
		this._getData = null;
		let data;
		if ($._isFunction(this._options.getResults)) this._getResultsInit();
		else if ($._isArray(this._options.data)) data = this._options.data;
		else data = this._getDataFromDOM(this._node);
		if (data) {
			this._data = data;
			this._getDataInit();
		}
		const value = [...this._node.selectedOptions].map((option) => $.getValue(option));
		this._render();
		this._setValue(value);
		this._events();
	}
	/**
	* Disable the TagsInput.
	*/
	disable() {
		$.setAttribute(this._node, { disabled: true });
		this._refreshDisabled();
	}
	/**
	* Dispose the TagsInput.
	*/
	dispose() {
		if (this._popper) {
			this._popper.dispose();
			this._popper = null;
		}
		$.removeAttribute(this._node, "tabindex");
		$.removeEvent(this._node, "focus.ui.tagsinput");
		$.removeClass(this._node, this.constructor.classes.hide);
		$.remove(this._menuNode);
		$.remove(this._toggle);
		this._toggle = null;
		this._clear = null;
		this._searchInput = null;
		this._placeholder = null;
		this._menuNode = null;
		this._data = null;
		this._optionLookup = null;
		this._activeItems = null;
		this._value = null;
		this._request = null;
		this._popperOptions = null;
		this._getData = null;
		super.dispose();
	}
	/**
	* Enable the TagsInput.
	*/
	enable() {
		$.removeAttribute(this._node, "disabled");
		this._refreshDisabled();
	}
	/**
	* Hide the TagsInput.
	*/
	hide() {
		if (!$.isConnected(this._menuNode) || $.getDataset(this._menuNode, "uiAnimating") || !$.triggerOne(this._node, "hide.ui.tagsinput")) return;
		$.setDataset(this._menuNode, { uiAnimating: "out" });
		this._refreshPlaceholder();
		$.fadeOut(this._menuNode, { duration: this._options.duration }).then((_) => {
			this._popper.dispose();
			this._popper = null;
			$.empty(this._menuNode);
			$.detach(this._menuNode);
			$.removeDataset(this._menuNode, "uiAnimating");
			$.setAttribute(this._toggle, {
				"aria-expanded": false,
				"aria-activedescendent": ""
			});
			$.triggerEvent(this._node, "hidden.ui.tagsinput");
		}).catch((_) => {
			if ($.getDataset(this._menuNode, "uiAnimating") === "out") $.removeDataset(this._menuNode, "uiAnimating");
		});
	}
	/**
	* Show the TagsInput.
	*/
	show() {
		if (!this._getData || $.is(this._node, ":disabled") || $.isConnected(this._menuNode) || $.getDataset(this._menuNode, "uiAnimating") || !$.triggerOne(this._node, "show.ui.tagsinput")) return;
		const term = $.getValue(this._searchInput);
		this._getData({ term });
		$.setDataset(this._menuNode, { uiAnimating: "in" });
		if (this._options.appendTo) $.append(this._options.appendTo, this._menuNode);
		else $.after(this._toggle, this._menuNode);
		this._popper = new Popper(this._menuNode, this._popperOptions);
		$.fadeIn(this._menuNode, { duration: this._options.duration }).then((_) => {
			$.removeDataset(this._menuNode, "uiAnimating");
			$.setAttribute(this._toggle, { "aria-expanded": true });
			$.triggerEvent(this._node, "shown.ui.tagsinput");
		}).catch((_) => {
			if ($.getDataset(this._menuNode, "uiAnimating") === "in") $.removeDataset(this._menuNode, "uiAnimating");
		});
	}
	/**
	* Toggle the TagsInput.
	*/
	toggle() {
		if ($.isConnected(this._menuNode)) this.hide();
		else this.show();
	}
	/**
	* Update the TagsInput position.
	*/
	update() {
		if (this._popper) this._popper.update();
	}
};

//#endregion
//#region src/js/prototype/api.js
/**
* Add a value.
* @param {string} value The value to add.
*/
function add(value) {
	const newValues = this._value.concat([value]);
	this._setValue(newValues, { triggerEvent: true });
}
/**
* Get the maximum selections.
* @return {number} The maximum selections.
*/
function getMaxSelections() {
	return this._maxSelections;
}
/**
* Get the placeholder text.
* @return {string} The placeholder text.
*/
function getPlaceholder() {
	return this._placeholderText;
}
/**
* Get the selected value(s).
* @return {string|number|array} The selected value(s).
*/
function getValue() {
	return this._value;
}
/**
* Remove a value.
* @param {string} value The value to remove.
*/
function remove(value) {
	const newValues = this._value.filter((val) => val != value);
	this._setValue(newValues, { triggerEvent: true });
}
/**
* Remove all values.
*/
function removeAll() {
	this._setValue([], { triggerEvent: true });
}
/**
* Set the maximum selections.
* @param {number} maxSelections The maximum selections.
*/
function setMaxSelections(maxSelections) {
	this._maxSelections = maxSelections;
	this.hide();
	this._refresh();
}
/**
* Set the placeholder text.
* @param {string} placeholder The placeholder text.
*/
function setPlaceholder(placeholder) {
	this._placeholderText = placeholder;
	$.remove(this._placeholder);
	this._renderPlaceholder();
	this._refresh();
}
/**
* Set the selected value(s).
* @param {string|number|array} value The value to set.
*/
function setValue(value) {
	this._setValue(value, { triggerEvent: true });
}

//#endregion
//#region src/js/prototype/data.js
/**
* Initialize preloaded get data.
*/
function _getDataInit() {
	this._getData = ({ term = null }) => {
		this._activeItems = [];
		$.empty(this._menuNode);
		$.setAttribute(this._toggle, { "aria-activedescendent": "" });
		$.setAttribute(this._searchInput, { "aria-activedescendent": "" });
		if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
			$.hide(this._menuNode);
			this.update();
			return;
		}
		$.show(this._menuNode);
		if (this._maxSelections && this._value.length >= this._maxSelections) {
			const info = this._renderInfo(this._options.lang.maxSelections);
			$.append(this._menuNode, info);
			this.update();
			return;
		}
		let results = this._data;
		if (term) {
			const isMatch = this._options.isMatch.bind(this);
			const sortResults = this._options.sortResults.bind(this);
			results = this._data.filter((data) => isMatch(data, term)).sort((a, b) => sortResults(a, b, term));
		}
		this._renderResults(results);
		this.update();
	};
}
/**
* Initialize get data from callback.
*/
function _getResultsInit() {
	const load = $._debounce(({ offset, term }) => {
		const options = { offset };
		if (term) options.term = term;
		const request = Promise.resolve(this._options.getResults(options));
		request.then((response) => {
			if (this._request !== request) return;
			const newData = response.results;
			if (!offset) {
				this._data = newData;
				$.empty(this._menuNode);
			} else {
				this._data.push(...newData);
				$.detach(this._loader);
			}
			this._showMore = response.showMore;
			this._renderResults(newData);
			this._request = null;
		}).catch((_) => {
			if (this._request !== request) return;
			$.detach(this._loader);
			$.append(this._menuNode, this._error);
			this._request = null;
		}).finally((_) => {
			this._loadingScroll = false;
			this.update();
		});
		this._request = request;
	}, this._options.debounce);
	this._getData = ({ offset = 0, term = null }) => {
		if (this._request && this._request.cancel) this._request.cancel();
		this._request = null;
		if (!offset) {
			this._activeItems = [];
			$.setAttribute(this._toggle, { "aria-activedescendent": "" });
			$.setAttribute(this._searchInput, { "aria-activedescendent": "" });
			const children = $.children(this._menuNode, (node) => !$.isSame(node, this._loader));
			$.detach(children);
		} else $.detach(this._error);
		if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
			$.hide(this._menuNode);
			this.update();
			return;
		}
		$.show(this._menuNode);
		if (this._maxSelections && this._value.length >= this._maxSelections) {
			const info = this._renderInfo(this._options.lang.maxSelections);
			$.append(this._menuNode, info);
			this.update();
			return;
		}
		const lastChild = $.child(this._menuNode, ":last-child");
		if (!lastChild || !$.isSame(lastChild, this._loader)) $.append(this._menuNode, this._loader);
		this.update();
		load({
			offset,
			term
		});
	};
}

//#endregion
//#region src/js/prototype/events.js
/**
* Attach events for the TagsInput.
*/
function _events() {
	$.addEventDelegate(this._menuNode, "contextmenu.ui.tagsinput", "[data-ui-action=\"select\"]", (e) => {
		e.preventDefault();
	});
	$.addEvent(this._menuNode, "mousedown.ui.tagsinput", (e) => {
		if ($.isSame(this._searchInput, e.target)) return;
		e.preventDefault();
	});
	$.addEvent(this._menuNode, "click.ui.tagsinput", (e) => {
		e.stopPropagation();
	});
	$.addEvent(this._node, "focus.ui.tagsinput", (_) => {
		if (!$.isSame(this._node, document.activeElement)) return;
		$.focus(this._searchInput);
	});
	$.addEventDelegate(this._menuNode, "click.ui.tagsinput", "[data-ui-action=\"select\"]", (e) => {
		e.preventDefault();
		$.setDataset(this._searchInput, { uiKeepFocus: true });
		const value = $.getDataset(e.currentTarget, "uiValue");
		this._selectValue(value);
		$.removeDataset(this._searchInput, "uiKeepFocus");
	});
	$.addEventDelegate(this._menuNode, "mouseover.ui.tagsinput", "[data-ui-action=\"select\"]", $.debounce((e) => {
		const focusedNode = $.findOne("[data-ui-focus]", this._menuNode);
		$.removeClass(focusedNode, this.constructor.classes.focus);
		$.removeDataset(focusedNode, "uiFocus");
		$.addClass(e.currentTarget, this.constructor.classes.focus);
		$.setDataset(e.currentTarget, { uiFocus: true });
		const id = $.getAttribute(e.currentTarget, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
	}));
	$.addEvent(this._searchInput, "input.ui.tagsinput", $.debounce((_) => {
		this._updateSearchWidth();
		if (!this._getData) return;
		if (!$.isConnected(this._menuNode)) this.show();
		else {
			const term = $.getValue(this._searchInput);
			this._getData({ term });
		}
	}));
	$.addEvent(this._searchInput, "keydown.ui.tagsinput", (e) => {
		if (this._options.confirmKeys.includes(e.key)) {
			e.preventDefault();
			$.setDataset(this._searchInput, { uiKeepFocus: true });
			const value = $.getValue(this._searchInput);
			this._selectValue(value);
			$.removeDataset(this._searchInput, "uiKeepFocus");
			return;
		}
		if (e.code === "Backspace") {
			if (this._value.length && !$.getValue(this._searchInput)) {
				e.preventDefault();
				this._value.pop();
				$.setDataset(this._searchInput, { uiKeepFocus: true });
				this._refresh();
				$.setValue(this._searchInput, "");
				$.focus(this._searchInput);
				this._updateSearchWidth();
				$.triggerEvent(this._searchInput, "input.ui.tagsinput");
				$.removeDataset(this._searchInput, "uiKeepFocus");
			}
			return;
		}
		if (e.code === "Escape" && $.isConnected(this._menuNode)) {
			e.stopPropagation();
			this.hide();
			$.triggerEvent(this._searchInput, "focus.ui.tagsinput");
			return;
		}
		if (![
			"ArrowDown",
			"ArrowUp",
			"Enter",
			"NumpadEnter"
		].includes(e.code)) return;
		if (!$.isConnected(this._menuNode)) {
			this.show();
			return;
		}
		const focusedNode = $.findOne("[data-ui-focus]", this._menuNode);
		switch (e.code) {
			case "Enter":
			case "NumpadEnter":
				let value;
				if (focusedNode) {
					value = $.getDataset(focusedNode, "uiValue");
					$.setValue(this._searchInput, "");
				} else value = $.getValue(this._searchInput);
				$.setDataset(this._searchInput, { uiKeepFocus: true });
				this._selectValue(value);
				$.removeDataset(this._searchInput, "uiKeepFocus");
				return;
		}
		e.preventDefault();
		let focusNode;
		if (!focusedNode) focusNode = this._activeItems[0];
		else {
			let focusIndex = this._activeItems.indexOf(focusedNode);
			switch (e.code) {
				case "ArrowDown":
					focusIndex++;
					break;
				case "ArrowUp": focusIndex--;
			}
			focusNode = this._activeItems[focusIndex];
		}
		if (!focusNode) return;
		$.removeClass(focusedNode, this.constructor.classes.focus);
		$.removeDataset(focusedNode, "uiFocus");
		$.addClass(focusNode, this.constructor.classes.focus);
		$.setDataset(focusNode, { uiFocus: true });
		const id = $.getAttribute(focusNode, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
		const itemsScrollY = $.getScrollY(this._menuNode);
		const itemsRect = $.rect(this._menuNode, { offset: true });
		const nodeRect = $.rect(focusNode, { offset: true });
		if (nodeRect.top < itemsRect.top) $.setScrollY(this._menuNode, itemsScrollY + nodeRect.top - itemsRect.top);
		else if (nodeRect.bottom > itemsRect.bottom) $.setScrollY(this._menuNode, itemsScrollY + nodeRect.bottom - itemsRect.bottom);
	});
	if (this._options.getResults) $.addEvent(this._menuNode, "scroll.ui.tagsinput", $._throttle((_) => {
		if (this._request || !this._showMore) return;
		const height = $.height(this._menuNode);
		const scrollHeight = $.height(this._menuNode, { boxSize: $.SCROLL_BOX });
		if ($.getScrollY(this._menuNode) >= scrollHeight - height - height / 4) {
			const term = $.getValue(this._searchInput);
			const offset = this._data.length;
			this._loadingScroll = true;
			this._getData({
				term,
				offset
			});
		}
	}, 250, { leading: false }));
	$.addEvent(this._searchInput, "focus.ui.tagsinput", (_) => {
		if (!$.isSame(this._searchInput, document.activeElement)) return;
		$.hide(this._placeholder);
		$.detach(this._placeholder);
		$.addClass(this._toggle, "focus");
	});
	$.addEvent(this._searchInput, "blur.ui.tagsinput", (_) => {
		if ($.isSame(this._searchInput, document.activeElement)) return;
		if ($.getDataset(this._searchInput, "uiKeepFocus")) return;
		const value = $.getValue(this._searchInput);
		if (value) {
			if (this._options.confirmOnBlur) this._selectValue(value, { focus: false });
			else if (this._options.clearOnBlur) $.setValue(this._searchInput, "");
		}
		$.removeClass(this._toggle, "focus");
		if (!$.isConnected(this._menuNode)) {
			this._refreshPlaceholder();
			return;
		}
		if ($.getDataset(this._menuNode, "uiAnimating") === "out") return;
		$.stop(this._menuNode);
		$.removeDataset(this._menuNode, "uiAnimating");
		this.hide();
	});
	$.addEvent(this._toggle, "mousedown.ui.tagsinput", (e) => {
		if ($.is(e.target, "[data-ui-action=\"clear\"]")) {
			e.preventDefault();
			return;
		}
		if ($.hasClass(this._toggle, "focus")) $.setDataset(this._searchInput, { uiKeepFocus: true });
		else {
			$.hide(this._placeholder);
			$.addClass(this._toggle, "focus");
		}
		$.addEventOnce(window, "mouseup.ui.tagsinput", (_) => {
			$.removeDataset(this._searchInput, "uiKeepFocus");
			$.focus(this._searchInput);
			if (!e.button) this.show();
		});
	});
	$.addEventDelegate(this._toggle, "click.ui.tagsinput", "[data-ui-action=\"clear\"]", (e) => {
		if (e.button) return;
		e.stopPropagation();
		const element = $.parent(e.currentTarget);
		const index = $.index(element);
		const value = this._value.slice();
		value.splice(index, 1);
		this._setValue(value, { triggerEvent: true });
		$.focus(this._searchInput);
	});
}

//#endregion
//#region src/js/prototype/helpers.js
/**
* Refresh the selected value(s).
*/
function _refresh() {
	if (!this._value) this._value = [];
	if (this._maxSelections && this._value.length > this._maxSelections) this._value = this._value.slice(0, this._maxSelections);
	this._value = $._unique(this._value);
	$.detach(this._searchInput);
	$.empty(this._node);
	$.empty(this._toggle);
	this._refreshDisabled();
	this._refreshPlaceholder();
	for (const value of this._value) {
		const element = this._buildOption(value);
		$.append(this._node, element);
		const group = this._renderSelection(value);
		$.append(this._toggle, group);
	}
	$.append(this._toggle, this._searchInput);
}
/**
* Refresh the toggle disabled class.
*/
function _refreshDisabled() {
	const disabled = $.is(this._node, ":disabled");
	if (disabled) {
		$.addClass(this._toggle, this.constructor.classes.disabled);
		$.setAttribute(this._searchInput, { tabindex: -1 });
	} else {
		$.removeClass(this._toggle, this.constructor.classes.disabled);
		$.removeAttribute(this._searchInput, "tabindex");
	}
	$.setAttribute(this._toggle, { "aria-disabled": disabled });
}
/**
* Refresh the placeholder.
*/
function _refreshPlaceholder() {
	if (this._value.length) $.hide(this._placeholder);
	else {
		$.show(this._placeholder);
		$.prepend(this._toggle, this._placeholder);
	}
}
/**
* Select a value (from DOM event).
* @param {string|number} value The value to select.
* @param {object} [options] Options for selecting the value(s).
* @param {Boolean} [options.focus] Whether to focus the search input.
*/
function _selectValue(value, { focus = true } = {}) {
	if (this._options.trimValue) value = value.trim();
	if (!this._value.some((otherValue) => otherValue == value)) {
		const newValue = this._value.concat([value]);
		this._setValue(newValue, { triggerEvent: true });
		this._refreshPlaceholder();
	}
	$.setValue(this._searchInput, "");
	if (this._options.closeOnSelect) this.hide();
	else if (this._getData) this._getData({});
	if (focus) $.focus(this._searchInput);
}
/**
* Select the selected value(s).
* @param {string|number} value The value to select.
* @param {object} [options] Options for setting the value(s).
* @param {Boolean} [options.triggerEvent] Whether to trigger the change event.
*/
function _setValue(value, { triggerEvent = false } = {}) {
	value = value.filter(this._options.validTag);
	if (!(!this._value || value.length !== this._value.length || value.some((val, index) => val !== this._value[index]))) return;
	this._value = value;
	this._refresh();
	if (triggerEvent) $.triggerEvent(this._node, "change.ui.tagsinput");
}
/**
* Update the search input width.
*/
function _updateSearchWidth() {
	const span = $.create("span", {
		text: $.getValue(this._searchInput),
		style: {
			display: "inline-block",
			fontSize: $.css(this._searchInput, "fontSize"),
			whiteSpace: "pre-wrap"
		}
	});
	$.append(document.body, span);
	const width = $.width(span);
	$.setStyle(this._searchInput, { width: width + 2 });
	$.remove(span);
}

//#endregion
//#region src/js/prototype/parsers.js
/**
* Build an option element for a value.
* @param {string} value The value to use.
* @return {HTMLElement} The option element.
*/
function _buildOption(value) {
	if (!(value in this._optionLookup)) this._optionLookup[value] = $.create("option", {
		text: value,
		value,
		properties: { selected: true }
	});
	return this._optionLookup[value];
}
/**
* Build a data array from a DOM element.
* @param {HTMLElement} element The element to parse.
* @return {array} The parsed data.
*/
function _getDataFromDOM(element) {
	return $.children(element).map((child) => $.getValue(child));
}

//#endregion
//#region src/js/prototype/render.js
/**
* Render the toggle element.
*/
function _render() {
	this._renderPlaceholder();
	this._renderMenu();
	this._renderToggle();
	if (this._options.getResults) {
		this._loader = this._renderInfo(this._options.lang.loading);
		this._error = this._renderInfo(this._options.lang.error);
	}
	this._popperOptions = {
		reference: this._toggle,
		placement: this._options.placement,
		position: this._options.position,
		fixed: this._options.fixed,
		spacing: this._options.spacing,
		minContact: this._options.minContact
	};
	if (this._options.fullWidth) {
		this._popperOptions.afterUpdate = (node, reference) => {
			const width = $.width(reference, $.BORDER_BOX);
			$.setStyle(node, { width: `${width}px` });
		};
		this._popperOptions.beforeUpdate = (node) => {
			$.setStyle(node, { width: "" });
		};
	}
	$.addClass(this._node, this.constructor.classes.hide);
	$.setAttribute(this._node, { tabindex: -1 });
	$.after(this._node, this._toggle);
}
/**
* Render an information item.
* @param {string} text The text to render.
* @return {HTMLElement} The information element.
*/
function _renderInfo(text) {
	return $.create("li", {
		html: this._options.sanitize(text),
		class: this.constructor.classes.info
	});
}
/**
* Render an item.
* @param {string} value The value to render.
* @return {HTMLElement} The item element.
*/
function _renderItem(value) {
	const id = generateId("autocomplete-item");
	const active = this._value.some((otherValue) => otherValue == value);
	const element = $.create("li", {
		class: this.constructor.classes.item,
		attributes: {
			id,
			"role": "option",
			"aria-label": value,
			"aria-selected": active
		},
		dataset: {
			uiAction: "select",
			uiValue: value
		}
	});
	this._activeItems.push(element);
	if (active) {
		$.addClass(element, this.constructor.classes.active);
		$.setDataset(element, { uiActive: true });
	}
	const content = this._options.renderResult.bind(this)(value, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(element, content)) $.append(element, content);
	return element;
}
/**
* Render the menu.
*/
function _renderMenu() {
	const id = generateId("selectmenu");
	this._menuNode = $.create("ul", {
		class: this.constructor.classes.menu,
		style: { maxHeight: this._options.maxHeight },
		attributes: {
			id,
			"role": "listbox",
			"aria-multiselectable": true
		}
	});
	if ($.is(this._node, ".input-sm")) $.addClass(this._menuNode, this.constructor.classes.menuSmall);
	else if ($.is(this._node, ".input-lg")) $.addClass(this._menuNode, this.constructor.classes.menuLarge);
}
/**
* Render the placeholder.
*/
function _renderPlaceholder() {
	this._placeholder = $.create("span", {
		html: this._placeholderText ? this._options.sanitize(this._placeholderText) : "&nbsp;",
		class: this.constructor.classes.placeholder
	});
}
/**
* Render results.
* @param {array} results The results to render.
*/
function _renderResults(results) {
	$.show(this._menuNode);
	for (const value of results) {
		const element = this._renderItem(value);
		$.append(this._menuNode, element);
	}
	if (!$.hasChildren(this._menuNode)) {
		$.hide(this._menuNode);
		return;
	}
	if (!$.findOne("[data-ui-focus]", this._menuNode) && this._activeItems.length) {
		const element = this._activeItems[0];
		$.addClass(element, this.constructor.classes.focus);
		$.setDataset(element, { uiFocus: true });
		const id = $.getAttribute(element, "id");
		$.setAttribute(this._toggle, { "aria-activedescendent": id });
		$.setAttribute(this._searchInput, { "aria-activedescendent": id });
	}
}
/**
* Render a selection item.
* @param {object} value The value to render.
* @return {HTMLElement} The selection element.
*/
function _renderSelection(value) {
	const group = $.create("div", { class: this.constructor.classes.tagGroup });
	const element = $.create("div", { class: this.constructor.classes.tagItem });
	const content = this._options.renderSelection.bind(this)(value, element);
	if ($._isString(content)) $.setHTML(element, this._options.sanitize(content));
	else if ($._isElement(content) && !$.isSame(element, content)) $.append(element, content);
	if (this._options.showClear) {
		const closeBtn = $.create("div", {
			class: this.constructor.classes.tagClear,
			attributes: {
				"role": "button",
				"aria-label": this._options.lang.clear
			},
			dataset: { uiAction: "clear" }
		});
		$.append(group, closeBtn);
		const closeIcon = $.create("small", { class: this.constructor.classes.tagClearIcon });
		$.append(closeBtn, closeIcon);
	}
	$.append(group, element);
	return group;
}
/**
* Render the toggle element.
*/
function _renderToggle() {
	const id = $.getAttribute(this._menuNode, "id");
	this._toggle = $.create("div", {
		class: [$.getAttribute(this._node, "class") || "", this.constructor.classes.tagToggle],
		attributes: {
			"role": "combobox",
			"aria-haspopup": "listbox",
			"aria-expanded": false,
			"aria-disabled": false,
			"aria-controls": id,
			"aria-activedescendent": ""
		}
	});
	this._searchInput = $.create("input", {
		class: this.constructor.classes.tagInput,
		attributes: {
			"role": "searchbox",
			"aria-autocomplete": "list",
			"aria-label": this._options.lang.search,
			"aria-describedby": id,
			"aria-activedescendent": "",
			"autocomplete": "off"
		}
	});
}

//#endregion
//#region src/js/index.js
TagsInput.defaults = {
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
		const escapedTerm = $._escapeRegExp(term);
		const regExp = new RegExp(escapedTerm, "i");
		if (regExp.test(value)) return true;
		const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
		return regExp.test(normalized);
	},
	sortResults(a, b, term) {
		const aLower = a.toLowerCase();
		const bLower = b.toLowerCase();
		if (term) {
			const diff = aLower.indexOf(term) - bLower.indexOf(term);
			if (diff) return diff;
		}
		return aLower.localeCompare(bLower);
	},
	validTag: (value) => !!value,
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
TagsInput.classes = {
	active: "active",
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
	tagItem: "btn",
	tagToggle: "tagsinput d-flex flex-wrap position-relative text-start"
};
var proto = TagsInput.prototype;
proto.add = add;
proto.getMaxSelections = getMaxSelections;
proto.getPlaceholder = getPlaceholder;
proto.getValue = getValue;
proto.remove = remove;
proto.removeAll = removeAll;
proto.setMaxSelections = setMaxSelections;
proto.setPlaceholder = setPlaceholder;
proto.setValue = setValue;
proto._events = _events;
proto._buildOption = _buildOption;
proto._getDataFromDOM = _getDataFromDOM;
proto._getDataInit = _getDataInit;
proto._getResultsInit = _getResultsInit;
proto._refresh = _refresh;
proto._refreshDisabled = _refreshDisabled;
proto._refreshPlaceholder = _refreshPlaceholder;
proto._render = _render;
proto._renderInfo = _renderInfo;
proto._renderItem = _renderItem;
proto._renderMenu = _renderMenu;
proto._renderPlaceholder = _renderPlaceholder;
proto._renderResults = _renderResults;
proto._renderSelection = _renderSelection;
proto._renderToggle = _renderToggle;
proto._selectValue = _selectValue;
proto._setValue = _setValue;
proto._updateSearchWidth = _updateSearchWidth;
initComponent("tagsinput", TagsInput);
var js_default = TagsInput;

//#endregion
export { js_default as default };
//# sourceMappingURL=frost-ui-tagsinput.esm.js.map