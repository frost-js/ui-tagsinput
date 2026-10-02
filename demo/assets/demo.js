const $ = globalThis.fQuery;
const { TagsInput } = globalThis.UI;
const themeKey = 'frostui-tagsinput-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;
    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);
        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    const cities = ['Brisbane', 'Café Village', 'São Paulo', 'Zürich'];
    const topics = ['Design', 'Development', 'Testing', 'Documentation'];
    const remoteCities = Array.from({ length: 35 }, (_, index) => `City ${String(index + 1).padStart(2, '0')}`);
    let failNextRequest = false;

    /**
     * Simulates a cancellable paginated service using local sample data.
     * @param {object} request The search request.
     * @param {number} request.offset The number of prior results.
     * @param {string} [request.term] The search term.
     * @returns {Promise} The delayed response with a cancel method.
     */
    const getResults = ({ offset, term = '' }) => {
        let timer;
        let rejectRequest;
        const fail = failNextRequest;
        failNextRequest = false;
        const pending = new Promise((resolve, reject) => {
            rejectRequest = reject;
            timer = setTimeout((_) => {
                if (fail) {
                    reject(new Error('Demo search failure'));
                    return;
                }

                const matches = remoteCities.filter((value) => value.toLowerCase().includes(term.toLowerCase()));
                resolve({
                    results: matches.slice(offset, offset + 10),
                    showMore: offset + 10 < matches.length,
                });
            }, 400);
        });
        pending.cancel = (_) => {
            clearTimeout(timer);
            rejectRequest(new DOMException('Search canceled', 'AbortError'));
        };
        return pending;
    };

    // Initialize callback examples first; the shared selector reuses their instances.
    TagsInput.init($.findOneById('cities'), { data: cities });
    TagsInput.init($.findOneById('rendered'), {
        data: topics,
        renderResult(value, element) {
            const label = $.create('strong');
            $.setText(label, value);
            $.append(element, [label, $.createText(' — project topic')]);
        },
    });
    TagsInput.init($.findOneById('validated'), {
        trimValue: true,
        confirmKeys: [','],
        validTag: (value) => /^[a-z\d-]{1,20}$/i.test(value),
    });
    for (const id of ['remote', 'remote-initial']) {
        TagsInput.init($.findOneById(id), { getResults, confirmOnBlur: false });
    }
    $('[data-ui-toggle="tagsinput"]').tagsinput();

    $('#fail-request, #retry-request').addEvent('mousedown', (event) => event.preventDefault());
    $('#fail-request, #retry-request').addEvent('click', (event) => {
        // Keep the requested menu open when this click reaches document listeners.
        event.stopPropagation();
        failNextRequest = $.getProperty(event.currentTarget, 'id') === 'fail-request';
        const instance = TagsInput.init($.findOneById('remote'));
        instance.hide();
        instance.show();
    });

    $('#topics-form').addEvent('submit', (event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget).getAll('topics');
        $('#form-output').setText(`Selected topics: ${values.join(', ') || '(none)'}`);
    });
    $('#topics-form').addEvent('reset', (_) => {
        $('#form-output').setText('Reset to the original topics.');
    });
    $('#native-change').addEvent('click', (_) => {
        const node = $.findOneById('form-tags');
        $.setValue(node, 'Testing');
        // Dispatch a native event to demonstrate external input changes.
        node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    $('#toggle-fieldset').addEvent('click', (event) => {
        const fieldset = $.findOneById('demo-fieldset');
        $.setProperty(fieldset, 'disabled', !$.getProperty(fieldset, 'disabled'));
        $.setText(event.currentTarget, $.getProperty(fieldset, 'disabled') ? 'Enable fieldset' : 'Disable fieldset');
    });

    const methodNode = $.findOneById('methods-tags');
    let methodInstance = TagsInput.init(methodNode);
    const events = ['change', 'show', 'shown', 'hide', 'hidden'].map((name) => `${name}.ui.tagsinput`).join(' ');
    $.addEvent(methodNode, events, (event) => {
        logEvent(`${event.type}.ui.tagsinput — ${JSON.stringify(methodInstance?.getValue())}`);
    });

    const methodArguments = {
        add: ['Docs'],
        remove: ['Design'],
        setValue: [['Design', 'Testing']],
        setPlaceholder: ['Pick your topics'],
        setMaxSelections: [2],
    };
    $('[data-demo-method]').addEvent('mousedown', (event) => {
        // Preserve the current focus/menu state until the requested method runs.
        event.preventDefault();
    });
    $('[data-demo-method]').addEvent('click', (event) => {
        event.stopPropagation();
        const method = $.getDataset(event.currentTarget, 'demoMethod');
        const output = $.findOneById('method-output');
        if (method === 'init') {
            methodInstance = TagsInput.init(methodNode);
            $.setText(output, 'Initialized.');
            return;
        }
        if (!methodInstance) {
            $.setText(output, 'Use Init to create an instance first.');
            return;
        }
        if (method === 'dispose') {
            methodInstance.dispose();
            methodInstance = null;
            $.setText(output, 'Disposed. The native select is restored.');
            return;
        }

        const result = methodInstance[method](...(methodArguments[method] || []));
        $.setText(output, result === undefined ? `${method}() called.` : `${method}(): ${JSON.stringify(result)}`);
    });
});
