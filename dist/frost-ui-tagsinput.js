(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ?  factory(exports, require('@fr0st/query'), require('@fr0st/ui')) :
  typeof define === 'function' && define.amd ? define(['exports', '@fr0st/query', '@fr0st/ui'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.UI = global.UI || {}), global.fQuery,global.UI));
})(this, function(exports, _fr0st_query, _fr0st_ui) {
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

//#region src/js/tags-input.js
/**
	* TagsInput Class
	* @class
	*/
	var TagsInput = class extends _fr0st_ui.BaseComponent {
		/**
		* New TagsInput constructor.
		* @param {HTMLElement} node The input node.
		* @param {object} [settings] The options to create the TagsInput with.
		*/
		constructor(node, settings) {
			super(node, settings);
			if (!_fr0st_query.default.is(this._node, "select")) throw new Error("TagsInput must be created on a select element");
			this._placeholderText = this._options.placeholder;
			this._maxSelections = this._options.maxSelections;
			this._data = [];
			this._optionLookup = {};
			this._activeItems = [];
			this._getData = null;
			let data;
			if (_fr0st_query.default._isFunction(this._options.getResults)) this._getResultsInit();
			else if (_fr0st_query.default._isArray(this._options.data)) data = this._options.data;
			else data = this._getDataFromDOM(this._node);
			if (data) {
				this._data = data;
				this._getDataInit();
			}
			const value = [...this._node.selectedOptions].map((option) => _fr0st_query.default.getValue(option));
			this._render();
			this._setValue(value);
			this._events();
		}
		/**
		* Disable the TagsInput.
		*/
		disable() {
			_fr0st_query.default.setAttribute(this._node, { disabled: true });
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
			_fr0st_query.default.removeAttribute(this._node, "tabindex");
			_fr0st_query.default.removeEvent(this._node, "focus.ui.tagsinput");
			_fr0st_query.default.removeClass(this._node, this.constructor.classes.hide);
			_fr0st_query.default.remove(this._menuNode);
			_fr0st_query.default.remove(this._toggle);
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
			_fr0st_query.default.removeAttribute(this._node, "disabled");
			this._refreshDisabled();
		}
		/**
		* Hide the TagsInput.
		*/
		hide() {
			if (!_fr0st_query.default.isConnected(this._menuNode) || _fr0st_query.default.getDataset(this._menuNode, "uiAnimating") || !_fr0st_query.default.triggerOne(this._node, "hide.ui.tagsinput")) return;
			_fr0st_query.default.setDataset(this._menuNode, { uiAnimating: "out" });
			this._refreshPlaceholder();
			_fr0st_query.default.fadeOut(this._menuNode, { duration: this._options.duration }).then((_) => {
				this._popper.dispose();
				this._popper = null;
				_fr0st_query.default.empty(this._menuNode);
				_fr0st_query.default.detach(this._menuNode);
				_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
				_fr0st_query.default.setAttribute(this._toggle, {
					"aria-expanded": false,
					"aria-activedescendent": ""
				});
				_fr0st_query.default.triggerEvent(this._node, "hidden.ui.tagsinput");
			}).catch((_) => {
				if (_fr0st_query.default.getDataset(this._menuNode, "uiAnimating") === "out") _fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			});
		}
		/**
		* Show the TagsInput.
		*/
		show() {
			if (!this._getData || _fr0st_query.default.is(this._node, ":disabled") || _fr0st_query.default.isConnected(this._menuNode) || _fr0st_query.default.getDataset(this._menuNode, "uiAnimating") || !_fr0st_query.default.triggerOne(this._node, "show.ui.tagsinput")) return;
			const term = _fr0st_query.default.getValue(this._searchInput);
			this._getData({ term });
			_fr0st_query.default.setDataset(this._menuNode, { uiAnimating: "in" });
			if (this._options.appendTo) _fr0st_query.default.append(this._options.appendTo, this._menuNode);
			else _fr0st_query.default.after(this._toggle, this._menuNode);
			this._popper = new _fr0st_ui.Popper(this._menuNode, this._popperOptions);
			_fr0st_query.default.fadeIn(this._menuNode, { duration: this._options.duration }).then((_) => {
				_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
				_fr0st_query.default.setAttribute(this._toggle, { "aria-expanded": true });
				_fr0st_query.default.triggerEvent(this._node, "shown.ui.tagsinput");
			}).catch((_) => {
				if (_fr0st_query.default.getDataset(this._menuNode, "uiAnimating") === "in") _fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			});
		}
		/**
		* Toggle the TagsInput.
		*/
		toggle() {
			if (_fr0st_query.default.isConnected(this._menuNode)) this.hide();
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
		_fr0st_query.default.remove(this._placeholder);
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
			_fr0st_query.default.empty(this._menuNode);
			_fr0st_query.default.setAttribute(this._toggle, { "aria-activedescendent": "" });
			_fr0st_query.default.setAttribute(this._searchInput, { "aria-activedescendent": "" });
			if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
				_fr0st_query.default.hide(this._menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this._menuNode);
			if (this._maxSelections && this._value.length >= this._maxSelections) {
				const info = this._renderInfo(this._options.lang.maxSelections);
				_fr0st_query.default.append(this._menuNode, info);
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
		const load = _fr0st_query.default._debounce(({ offset, term }) => {
			const options = { offset };
			if (term) options.term = term;
			const request = Promise.resolve(this._options.getResults(options));
			request.then((response) => {
				if (this._request !== request) return;
				const newData = response.results;
				if (!offset) {
					this._data = newData;
					_fr0st_query.default.empty(this._menuNode);
				} else {
					this._data.push(...newData);
					_fr0st_query.default.detach(this._loader);
				}
				this._showMore = response.showMore;
				this._renderResults(newData);
				this._request = null;
			}).catch((_) => {
				if (this._request !== request) return;
				_fr0st_query.default.detach(this._loader);
				_fr0st_query.default.append(this._menuNode, this._error);
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
				_fr0st_query.default.setAttribute(this._toggle, { "aria-activedescendent": "" });
				_fr0st_query.default.setAttribute(this._searchInput, { "aria-activedescendent": "" });
				const children = _fr0st_query.default.children(this._menuNode, (node) => !_fr0st_query.default.isSame(node, this._loader));
				_fr0st_query.default.detach(children);
			} else _fr0st_query.default.detach(this._error);
			if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
				_fr0st_query.default.hide(this._menuNode);
				this.update();
				return;
			}
			_fr0st_query.default.show(this._menuNode);
			if (this._maxSelections && this._value.length >= this._maxSelections) {
				const info = this._renderInfo(this._options.lang.maxSelections);
				_fr0st_query.default.append(this._menuNode, info);
				this.update();
				return;
			}
			const lastChild = _fr0st_query.default.child(this._menuNode, ":last-child");
			if (!lastChild || !_fr0st_query.default.isSame(lastChild, this._loader)) _fr0st_query.default.append(this._menuNode, this._loader);
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
		_fr0st_query.default.addEventDelegate(this._menuNode, "contextmenu.ui.tagsinput", "[data-ui-action=\"select\"]", (e) => {
			e.preventDefault();
		});
		_fr0st_query.default.addEvent(this._menuNode, "mousedown.ui.tagsinput", (e) => {
			if (_fr0st_query.default.isSame(this._searchInput, e.target)) return;
			e.preventDefault();
		});
		_fr0st_query.default.addEvent(this._menuNode, "click.ui.tagsinput", (e) => {
			e.stopPropagation();
		});
		_fr0st_query.default.addEvent(this._node, "focus.ui.tagsinput", (_) => {
			if (!_fr0st_query.default.isSame(this._node, document.activeElement)) return;
			_fr0st_query.default.focus(this._searchInput);
		});
		_fr0st_query.default.addEventDelegate(this._menuNode, "click.ui.tagsinput", "[data-ui-action=\"select\"]", (e) => {
			e.preventDefault();
			_fr0st_query.default.setDataset(this._searchInput, { uiKeepFocus: true });
			const value = _fr0st_query.default.getDataset(e.currentTarget, "uiValue");
			this._selectValue(value);
			_fr0st_query.default.removeDataset(this._searchInput, "uiKeepFocus");
		});
		_fr0st_query.default.addEventDelegate(this._menuNode, "mouseover.ui.tagsinput", "[data-ui-action=\"select\"]", _fr0st_query.default.debounce((e) => {
			const focusedNode = _fr0st_query.default.findOne("[data-ui-focus]", this._menuNode);
			_fr0st_query.default.removeClass(focusedNode, this.constructor.classes.focus);
			_fr0st_query.default.removeDataset(focusedNode, "uiFocus");
			_fr0st_query.default.addClass(e.currentTarget, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(e.currentTarget, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(e.currentTarget, "id");
			_fr0st_query.default.setAttribute(this._toggle, { "aria-activedescendent": id });
			_fr0st_query.default.setAttribute(this._searchInput, { "aria-activedescendent": id });
		}));
		_fr0st_query.default.addEvent(this._searchInput, "input.ui.tagsinput", _fr0st_query.default.debounce((_) => {
			this._updateSearchWidth();
			if (!this._getData) return;
			if (!_fr0st_query.default.isConnected(this._menuNode)) this.show();
			else {
				const term = _fr0st_query.default.getValue(this._searchInput);
				this._getData({ term });
			}
		}));
		_fr0st_query.default.addEvent(this._searchInput, "keydown.ui.tagsinput", (e) => {
			if (this._options.confirmKeys.includes(e.key)) {
				e.preventDefault();
				_fr0st_query.default.setDataset(this._searchInput, { uiKeepFocus: true });
				const value = _fr0st_query.default.getValue(this._searchInput);
				this._selectValue(value);
				_fr0st_query.default.removeDataset(this._searchInput, "uiKeepFocus");
				return;
			}
			if (e.code === "Backspace") {
				if (this._value.length && !_fr0st_query.default.getValue(this._searchInput)) {
					e.preventDefault();
					this._value.pop();
					_fr0st_query.default.setDataset(this._searchInput, { uiKeepFocus: true });
					this._refresh();
					_fr0st_query.default.setValue(this._searchInput, "");
					_fr0st_query.default.focus(this._searchInput);
					this._updateSearchWidth();
					_fr0st_query.default.triggerEvent(this._searchInput, "input.ui.tagsinput");
					_fr0st_query.default.removeDataset(this._searchInput, "uiKeepFocus");
				}
				return;
			}
			if (e.code === "Escape" && _fr0st_query.default.isConnected(this._menuNode)) {
				e.stopPropagation();
				this.hide();
				_fr0st_query.default.triggerEvent(this._searchInput, "focus.ui.tagsinput");
				return;
			}
			if (![
				"ArrowDown",
				"ArrowUp",
				"Enter",
				"NumpadEnter"
			].includes(e.code)) return;
			if (!_fr0st_query.default.isConnected(this._menuNode)) {
				this.show();
				return;
			}
			const focusedNode = _fr0st_query.default.findOne("[data-ui-focus]", this._menuNode);
			switch (e.code) {
				case "Enter":
				case "NumpadEnter":
					let value;
					if (focusedNode) {
						value = _fr0st_query.default.getDataset(focusedNode, "uiValue");
						_fr0st_query.default.setValue(this._searchInput, "");
					} else value = _fr0st_query.default.getValue(this._searchInput);
					_fr0st_query.default.setDataset(this._searchInput, { uiKeepFocus: true });
					this._selectValue(value);
					_fr0st_query.default.removeDataset(this._searchInput, "uiKeepFocus");
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
			_fr0st_query.default.removeClass(focusedNode, this.constructor.classes.focus);
			_fr0st_query.default.removeDataset(focusedNode, "uiFocus");
			_fr0st_query.default.addClass(focusNode, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(focusNode, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(focusNode, "id");
			_fr0st_query.default.setAttribute(this._toggle, { "aria-activedescendent": id });
			_fr0st_query.default.setAttribute(this._searchInput, { "aria-activedescendent": id });
			const itemsScrollY = _fr0st_query.default.getScrollY(this._menuNode);
			const itemsRect = _fr0st_query.default.rect(this._menuNode, { offset: true });
			const nodeRect = _fr0st_query.default.rect(focusNode, { offset: true });
			if (nodeRect.top < itemsRect.top) _fr0st_query.default.setScrollY(this._menuNode, itemsScrollY + nodeRect.top - itemsRect.top);
			else if (nodeRect.bottom > itemsRect.bottom) _fr0st_query.default.setScrollY(this._menuNode, itemsScrollY + nodeRect.bottom - itemsRect.bottom);
		});
		if (this._options.getResults) _fr0st_query.default.addEvent(this._menuNode, "scroll.ui.tagsinput", _fr0st_query.default._throttle((_) => {
			if (this._request || !this._showMore) return;
			const height = _fr0st_query.default.height(this._menuNode);
			const scrollHeight = _fr0st_query.default.height(this._menuNode, { boxSize: _fr0st_query.default.SCROLL_BOX });
			if (_fr0st_query.default.getScrollY(this._menuNode) >= scrollHeight - height - height / 4) {
				const term = _fr0st_query.default.getValue(this._searchInput);
				const offset = this._data.length;
				this._loadingScroll = true;
				this._getData({
					term,
					offset
				});
			}
		}, 250, { leading: false }));
		_fr0st_query.default.addEvent(this._searchInput, "focus.ui.tagsinput", (_) => {
			if (!_fr0st_query.default.isSame(this._searchInput, document.activeElement)) return;
			_fr0st_query.default.hide(this._placeholder);
			_fr0st_query.default.detach(this._placeholder);
			_fr0st_query.default.addClass(this._toggle, "focus");
		});
		_fr0st_query.default.addEvent(this._searchInput, "blur.ui.tagsinput", (_) => {
			if (_fr0st_query.default.isSame(this._searchInput, document.activeElement)) return;
			if (_fr0st_query.default.getDataset(this._searchInput, "uiKeepFocus")) return;
			const value = _fr0st_query.default.getValue(this._searchInput);
			if (value) {
				if (this._options.confirmOnBlur) this._selectValue(value, { focus: false });
				else if (this._options.clearOnBlur) _fr0st_query.default.setValue(this._searchInput, "");
			}
			_fr0st_query.default.removeClass(this._toggle, "focus");
			if (!_fr0st_query.default.isConnected(this._menuNode)) {
				this._refreshPlaceholder();
				return;
			}
			if (_fr0st_query.default.getDataset(this._menuNode, "uiAnimating") === "out") return;
			_fr0st_query.default.stop(this._menuNode);
			_fr0st_query.default.removeDataset(this._menuNode, "uiAnimating");
			this.hide();
		});
		_fr0st_query.default.addEvent(this._toggle, "mousedown.ui.tagsinput", (e) => {
			if (_fr0st_query.default.is(e.target, "[data-ui-action=\"clear\"]")) {
				e.preventDefault();
				return;
			}
			if (_fr0st_query.default.hasClass(this._toggle, "focus")) _fr0st_query.default.setDataset(this._searchInput, { uiKeepFocus: true });
			else {
				_fr0st_query.default.hide(this._placeholder);
				_fr0st_query.default.addClass(this._toggle, "focus");
			}
			_fr0st_query.default.addEventOnce(window, "mouseup.ui.tagsinput", (_) => {
				_fr0st_query.default.removeDataset(this._searchInput, "uiKeepFocus");
				_fr0st_query.default.focus(this._searchInput);
				if (!e.button) this.show();
			});
		});
		_fr0st_query.default.addEventDelegate(this._toggle, "click.ui.tagsinput", "[data-ui-action=\"clear\"]", (e) => {
			if (e.button) return;
			e.stopPropagation();
			const element = _fr0st_query.default.parent(e.currentTarget);
			const index = _fr0st_query.default.index(element);
			const value = this._value.slice();
			value.splice(index, 1);
			this._setValue(value, { triggerEvent: true });
			_fr0st_query.default.focus(this._searchInput);
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
		this._value = _fr0st_query.default._unique(this._value);
		_fr0st_query.default.detach(this._searchInput);
		_fr0st_query.default.empty(this._node);
		_fr0st_query.default.empty(this._toggle);
		this._refreshDisabled();
		this._refreshPlaceholder();
		for (const value of this._value) {
			const element = this._buildOption(value);
			_fr0st_query.default.append(this._node, element);
			const group = this._renderSelection(value);
			_fr0st_query.default.append(this._toggle, group);
		}
		_fr0st_query.default.append(this._toggle, this._searchInput);
	}
	/**
	* Refresh the toggle disabled class.
	*/
	function _refreshDisabled() {
		const disabled = _fr0st_query.default.is(this._node, ":disabled");
		if (disabled) {
			_fr0st_query.default.addClass(this._toggle, this.constructor.classes.disabled);
			_fr0st_query.default.setAttribute(this._searchInput, { tabindex: -1 });
		} else {
			_fr0st_query.default.removeClass(this._toggle, this.constructor.classes.disabled);
			_fr0st_query.default.removeAttribute(this._searchInput, "tabindex");
		}
		_fr0st_query.default.setAttribute(this._toggle, { "aria-disabled": disabled });
	}
	/**
	* Refresh the placeholder.
	*/
	function _refreshPlaceholder() {
		if (this._value.length) _fr0st_query.default.hide(this._placeholder);
		else {
			_fr0st_query.default.show(this._placeholder);
			_fr0st_query.default.prepend(this._toggle, this._placeholder);
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
		_fr0st_query.default.setValue(this._searchInput, "");
		if (this._options.closeOnSelect) this.hide();
		else if (this._getData) this._getData({});
		if (focus) _fr0st_query.default.focus(this._searchInput);
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
		if (triggerEvent) _fr0st_query.default.triggerEvent(this._node, "change.ui.tagsinput");
	}
	/**
	* Update the search input width.
	*/
	function _updateSearchWidth() {
		const span = _fr0st_query.default.create("span", {
			text: _fr0st_query.default.getValue(this._searchInput),
			style: {
				display: "inline-block",
				fontSize: _fr0st_query.default.css(this._searchInput, "fontSize"),
				whiteSpace: "pre-wrap"
			}
		});
		_fr0st_query.default.append(document.body, span);
		const width = _fr0st_query.default.width(span);
		_fr0st_query.default.setStyle(this._searchInput, { width: width + 2 });
		_fr0st_query.default.remove(span);
	}

//#endregion
//#region src/js/prototype/parsers.js
/**
	* Build an option element for a value.
	* @param {string} value The value to use.
	* @return {HTMLElement} The option element.
	*/
	function _buildOption(value) {
		if (!(value in this._optionLookup)) this._optionLookup[value] = _fr0st_query.default.create("option", {
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
		return _fr0st_query.default.children(element).map((child) => _fr0st_query.default.getValue(child));
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
				const width = _fr0st_query.default.width(reference, _fr0st_query.default.BORDER_BOX);
				_fr0st_query.default.setStyle(node, { width: `${width}px` });
			};
			this._popperOptions.beforeUpdate = (node) => {
				_fr0st_query.default.setStyle(node, { width: "" });
			};
		}
		_fr0st_query.default.addClass(this._node, this.constructor.classes.hide);
		_fr0st_query.default.setAttribute(this._node, { tabindex: -1 });
		_fr0st_query.default.after(this._node, this._toggle);
	}
	/**
	* Render an information item.
	* @param {string} text The text to render.
	* @return {HTMLElement} The information element.
	*/
	function _renderInfo(text) {
		return _fr0st_query.default.create("li", {
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
		const id = (0, _fr0st_ui.generateId)("autocomplete-item");
		const active = this._value.some((otherValue) => otherValue == value);
		const element = _fr0st_query.default.create("li", {
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
			_fr0st_query.default.addClass(element, this.constructor.classes.active);
			_fr0st_query.default.setDataset(element, { uiActive: true });
		}
		const content = this._options.renderResult.bind(this)(value, element);
		if (_fr0st_query.default._isString(content)) _fr0st_query.default.setHTML(element, this._options.sanitize(content));
		else if (_fr0st_query.default._isElement(content) && !_fr0st_query.default.isSame(element, content)) _fr0st_query.default.append(element, content);
		return element;
	}
	/**
	* Render the menu.
	*/
	function _renderMenu() {
		const id = (0, _fr0st_ui.generateId)("selectmenu");
		this._menuNode = _fr0st_query.default.create("ul", {
			class: this.constructor.classes.menu,
			style: { maxHeight: this._options.maxHeight },
			attributes: {
				id,
				"role": "listbox",
				"aria-multiselectable": true
			}
		});
		if (_fr0st_query.default.is(this._node, ".input-sm")) _fr0st_query.default.addClass(this._menuNode, this.constructor.classes.menuSmall);
		else if (_fr0st_query.default.is(this._node, ".input-lg")) _fr0st_query.default.addClass(this._menuNode, this.constructor.classes.menuLarge);
	}
	/**
	* Render the placeholder.
	*/
	function _renderPlaceholder() {
		this._placeholder = _fr0st_query.default.create("span", {
			html: this._placeholderText ? this._options.sanitize(this._placeholderText) : "&nbsp;",
			class: this.constructor.classes.placeholder
		});
	}
	/**
	* Render results.
	* @param {array} results The results to render.
	*/
	function _renderResults(results) {
		_fr0st_query.default.show(this._menuNode);
		for (const value of results) {
			const element = this._renderItem(value);
			_fr0st_query.default.append(this._menuNode, element);
		}
		if (!_fr0st_query.default.hasChildren(this._menuNode)) {
			_fr0st_query.default.hide(this._menuNode);
			return;
		}
		if (!_fr0st_query.default.findOne("[data-ui-focus]", this._menuNode) && this._activeItems.length) {
			const element = this._activeItems[0];
			_fr0st_query.default.addClass(element, this.constructor.classes.focus);
			_fr0st_query.default.setDataset(element, { uiFocus: true });
			const id = _fr0st_query.default.getAttribute(element, "id");
			_fr0st_query.default.setAttribute(this._toggle, { "aria-activedescendent": id });
			_fr0st_query.default.setAttribute(this._searchInput, { "aria-activedescendent": id });
		}
	}
	/**
	* Render a selection item.
	* @param {object} value The value to render.
	* @return {HTMLElement} The selection element.
	*/
	function _renderSelection(value) {
		const group = _fr0st_query.default.create("div", { class: this.constructor.classes.tagGroup });
		const element = _fr0st_query.default.create("div", { class: this.constructor.classes.tagItem });
		const content = this._options.renderSelection.bind(this)(value, element);
		if (_fr0st_query.default._isString(content)) _fr0st_query.default.setHTML(element, this._options.sanitize(content));
		else if (_fr0st_query.default._isElement(content) && !_fr0st_query.default.isSame(element, content)) _fr0st_query.default.append(element, content);
		if (this._options.showClear) {
			const closeBtn = _fr0st_query.default.create("div", {
				class: this.constructor.classes.tagClear,
				attributes: {
					"role": "button",
					"aria-label": this._options.lang.clear
				},
				dataset: { uiAction: "clear" }
			});
			_fr0st_query.default.append(group, closeBtn);
			const closeIcon = _fr0st_query.default.create("small", { class: this.constructor.classes.tagClearIcon });
			_fr0st_query.default.append(closeBtn, closeIcon);
		}
		_fr0st_query.default.append(group, element);
		return group;
	}
	/**
	* Render the toggle element.
	*/
	function _renderToggle() {
		const id = _fr0st_query.default.getAttribute(this._menuNode, "id");
		this._toggle = _fr0st_query.default.create("div", {
			class: [_fr0st_query.default.getAttribute(this._node, "class") || "", this.constructor.classes.tagToggle],
			attributes: {
				"role": "combobox",
				"aria-haspopup": "listbox",
				"aria-expanded": false,
				"aria-disabled": false,
				"aria-controls": id,
				"aria-activedescendent": ""
			}
		});
		this._searchInput = _fr0st_query.default.create("input", {
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
		sanitize: (input) => _fr0st_query.default.sanitize(input),
		isMatch(value, term) {
			const escapedTerm = _fr0st_query.default._escapeRegExp(term);
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
	(0, _fr0st_ui.initComponent)("tagsinput", TagsInput);
	var js_default = TagsInput;

//#endregion
exports.TagsInput = js_default;
});
//# sourceMappingURL=frost-ui-tagsinput.js.map