const $ = globalThis.$;
const { TagsInput } = globalThis.UI;

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const storedTheme = localStorage.getItem('frostui-tagsinput-demo-theme');
setTheme(['light', 'dark'].includes(storedTheme) ? storedTheme : 'system');

$('[data-demo-theme]').addEvent('change', (event) => {
    const theme = $.getValue(event.currentTarget);

    if (theme === 'system') {
        localStorage.removeItem('frostui-tagsinput-demo-theme');
    } else {
        localStorage.setItem('frostui-tagsinput-demo-theme', theme);
    }

    setTheme(theme);
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
TagsInput.init(document.getElementById('cities'), { data: cities });
TagsInput.init(document.getElementById('rendered'), {
    data: topics,
    renderResult(value, element) {
        const label = document.createElement('strong');
        label.textContent = value;
        element.append(label, document.createTextNode(' — project topic'));
    },
});
TagsInput.init(document.getElementById('validated'), {
    trimValue: true,
    confirmKeys: [','],
    validTag: (value) => /^[a-z\d-]{1,20}$/i.test(value),
});
for (const id of ['remote', 'remote-initial']) {
    TagsInput.init(document.getElementById(id), { getResults, confirmOnBlur: false });
}
$('[data-ui-toggle="tagsinput"]').tagsinput();

$('#fail-request, #retry-request').addEvent('mousedown', (event) => event.preventDefault());
$('#fail-request, #retry-request').addEvent('click', (event) => {
    // Keep the requested menu open when this click reaches document listeners.
    event.stopPropagation();
    failNextRequest = event.currentTarget.id === 'fail-request';
    const instance = TagsInput.init(document.getElementById('remote'));
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
    const node = document.getElementById('form-tags');
    node.value = 'Testing';
    node.dispatchEvent(new Event('change', { bubbles: true }));
});
$('#toggle-fieldset').addEvent('click', (event) => {
    const fieldset = document.getElementById('demo-fieldset');
    fieldset.disabled = !fieldset.disabled;
    $.setText(event.currentTarget, fieldset.disabled ? 'Enable fieldset' : 'Disable fieldset');
});

const methodNode = document.getElementById('methods-tags');
let methodInstance = TagsInput.init(methodNode);
const events = ['change', 'show', 'shown', 'hide', 'hidden'].map((name) => `${name}.ui.tagsinput`).join(' ');
$.addEvent(methodNode, events, (event) => {
    const entry = document.createElement('div');
    entry.className = 'small font-monospace py-2 border-bottom';
    entry.textContent = `${event.type}.ui.tagsinput — ${JSON.stringify(methodInstance?.getValue())}`;
    const log = document.getElementById('event-log');
    log.append(entry);
    if (log.children.length > 50) {
        log.firstElementChild.remove();
    }
    log.scrollTop = log.scrollHeight;
});
$('#clear-log').addEvent('click', (_) => $('#event-log').empty());

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
    const method = event.currentTarget.dataset.demoMethod;
    const output = document.getElementById('method-output');
    if (method === 'init') {
        methodInstance = TagsInput.init(methodNode);
        output.textContent = 'Initialized.';
        return;
    }
    if (!methodInstance) {
        output.textContent = 'Use Init to create an instance first.';
        return;
    }
    if (method === 'dispose') {
        methodInstance.dispose();
        methodInstance = null;
        output.textContent = 'Disposed. The native select is restored.';
        return;
    }

    const result = methodInstance[method](...(methodArguments[method] || []));
    output.textContent = result === undefined ? `${method}() called.` : `${method}(): ${JSON.stringify(result)}`;
});
