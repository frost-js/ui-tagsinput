import { expect, test } from '#test';

test.describe('TagsInput', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button>' +
                '<br>' +
                '<label for="tags">Fruit</label>' +
                '<select id="tags" multiple class="input-outline">' +
                '<option value="Apple" selected>Apple label</option><option value="Banana">Banana label</option>' +
                '<option value="Cherry">Cherry label</option></select>',
            );
        });
    });

    test.describe('#init', () => {
        for (const { name, init } of [
            { name: 'class', init: () => UI.TagsInput.init($.findOne('#tags')) },
            { name: 'QuerySet', init: () => $('#tags').tagsinput() },
        ]) {
            test(`creates and registers a TagsInput (${name})`, async ({ page }) => {
                const instance = await page.evaluateHandle(init);
                expect(await instance.evaluate((value) => value instanceof UI.TagsInput)).toBe(true);
                expect(await instance.evaluate((value) => $.getData('#tags', 'tagsinput') === value)).toBe(true);
                expect(await instance.evaluate((value) => Object.isFrozen(value.options))).toBe(true);
                await expect(page.getByRole('combobox', { name: 'Fruit' })).toBeVisible();
                await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
                await expect(page.locator('#tags option')).toHaveCount(3);
            });
        }

        test('transfers native focus on initialization', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.focus(node);
                UI.TagsInput.init(node);
            });

            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.locator('.tagsinput')).toHaveClass(/focus/);
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });

        test('preserves outside focus on initialization', async ({ page }) => {
            await page.locator('#outside').focus();
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));

            await expect(page.locator('#outside')).toBeFocused();
            await expect(page.locator('.tagsinput')).not.toHaveClass(/focus/);
        });

        test('reuses an existing instance and respects data options', async ({ page }) => {
            const state = await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.setDataset(node, 'uiPlaceholder', 'Choose fruit');
                const first = UI.TagsInput.init(node);
                const second = UI.TagsInput.init(node, { placeholder: 'Ignored' });
                return { sameInstance: first === second, placeholder: second.getPlaceholder() };
            });
            expect(state).toEqual({ sameInstance: true, placeholder: 'Choose fruit' });
            await expect(page.getByRole('combobox')).toHaveCount(1);
        });

        test('initializes multiple nodes and returns the first instance through QuerySet', async ({ page }) => {
            const instance = await page.evaluateHandle(() => {
                const first = $.findOne('#tags');
                const second = first.cloneNode(true);
                $.setProperty(second, 'id', 'second');
                $.after(first, second);
                return $('select').tagsinput();
            });
            expect(await instance.evaluate((value) => value === $.getData('#tags', 'tagsinput'))).toBe(true);
            expect(await page.evaluate(() => $.getData('#second', 'tagsinput') instanceof UI.TagsInput)).toBe(true);
            await expect(page.getByRole('combobox')).toHaveCount(2);
        });

        for (const selector of ['#outside', '#tags']) {
            test(`rejects an invalid target without registering it (${selector})`, async ({ page }) => {
                expect(await page.evaluate((selector) => {
                    const node = $.findOne(selector);
                    $.removeAttribute(node, 'multiple');
                    try {
                        UI.TagsInput.init(node);
                    } catch (error) {
                        return error.message;
                    }
                }, selector)).toBe('TagsInput must be created on a multiple select element');
                expect(await page.evaluate((selector) => $.hasData(selector, 'tagsinput'), selector)).toBe(false);
            });
        }

        test('inherits labels, descriptions, required state, and initial values', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.setProperty(node, 'required', true);
                $.setAttribute(node, 'aria-describedby', 'help');
                $.setValue(node, 'Banana');
                UI.TagsInput.init(node);
            });
            const control = page.getByRole('combobox', { name: 'Fruit' });
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Banana']);
            await expect(control).toHaveAttribute('aria-describedby', 'help');
            await expect(control).toHaveAttribute('aria-required', 'true');
            await page.getByText('Fruit', { exact: true }).click();
            await expect(control).toBeFocused();
        });

        test('initializes a detached control before its host is inserted', async ({ page }) => {
            await page.evaluate(() => {
                const host = $.create('div');
                $.setHtml(host, '<select multiple aria-label="Detached"><option selected>New</option></select>');
                UI.TagsInput.init($.child(host)[0]);
                $.empty(document.body);
                $.append(document.body, host);
            });
            await expect(page.getByRole('combobox', { name: 'Detached' })).toBeVisible();
            await expect(page.locator('.tagsinput-selection')).toHaveText(['New']);
        });

        test.describe('failed initialization', () => {
            test.beforeEach(async ({ page }) => {
                await page.evaluate(() => {
                    $.setHtml(document.body,
                        '<form id="lifecycle-form"><label for="lifecycle-input">Label</label>' +
                        '<select id="lifecycle-input" tabindex="7" aria-hidden="false" aria-describedby="hint" multiple>' +
                        '<option value="a" selected>A</option></select></form>',
                    );
                    window.resetCalls = 0;
                    $.addEvent('#lifecycle-form', 'reset.ui.tagsinput', () => window.resetCalls++);
                    window.documentCalls = 0;
                    $.addEvent(document, 'click.ui.tagsinput', () => window.documentCalls++);
                });
            });

            test('rolls back a sanitizer failure', async ({ page }) => {
                await expect(page.evaluate(() =>
                    UI.TagsInput.init($.findOne('#lifecycle-input'), { sanitize: () => {
                        throw new Error('Sanitizer failed');
                    } }),
                )).rejects.toThrow();

                expect(await page.evaluate(() => $.hasData('#lifecycle-input', 'tagsinput'))).toBe(false);
                await expect(page.locator('#lifecycle-input')).not.toHaveClass(/\bvisually-hidden\b/);
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('tabindex', '7');
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('aria-hidden', 'false');
                await expect(page.locator('#lifecycle-input')).toHaveAttribute('aria-describedby', 'hint');
                await expect(page.locator('#lifecycle-form > label')).not.toHaveAttribute('id');
                await expect(page.locator('#lifecycle-form > *')).toHaveCount(2);

                await page.evaluate(() => $.triggerEvent('#lifecycle-form', 'reset.ui.tagsinput'));
                expect(await page.evaluate(() => window.resetCalls)).toBe(1);
                await page.evaluate(() => $.triggerEvent(document, 'click.ui.tagsinput'));
                expect(await page.evaluate(() => window.documentCalls)).toBe(1);

                expect(await page.evaluate(() => {
                    const node = $.findOne('#lifecycle-input');
                    const instance = UI.TagsInput.init(node);
                    return $.getData(node, 'tagsinput') === instance;
                })).toBe(true);
            });
        });
    });

    test.describe('#dispose', () => {
        for (const { name, dispose } of [
            { name: 'class', dispose: () => $.getData('#tags', 'tagsinput').dispose() },
            { name: 'QuerySet', dispose: () => $('#tags').tagsinput('dispose') },
        ]) {
            test(`restores the native select and permits reinitialization (${name})`, async ({ page }) => {
                const state = await page.evaluateHandle(() => {
                    const node = $.findOne('#tags');
                    $.setProperty(node, 'tabIndex', 4);
                    const option = node.options[0];
                    const instance = UI.TagsInput.init(node, { minSearch: 0 });
                    instance.setValue(['Banana', 'New']);
                    $.addClass(node, 'runtime');
                    instance.show();
                    return { instance, option };
                });
                await page.evaluate(dispose);
                expect(await state.evaluate(({ instance }) => instance.node)).toBeNull();
                expect(await state.evaluate(({ instance }) => instance.options)).toBeNull();
                expect(await state.evaluate(({ option }) => $.findOne('#tags').options[0] === option)).toBe(true);
                await expect(page.locator('#tags')).toHaveClass('input-outline runtime');
                await expect(page.locator('#tags')).toHaveAttribute('tabindex', '4');
                await expect(page.locator('#tags')).not.toHaveAttribute('aria-hidden');
                await expect(page.locator('#tags')).toHaveValues(['Banana', 'New']);
                await expect(page.locator('.tagsinput-menu, .tagsinput-container')).toHaveCount(0);
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
                await expect(page.locator('.tagsinput-selection')).toHaveText(['Banana', 'New']);
            });
        }

        test('preserves existing visibility and accessibility attributes', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.addClass(node, 'visually-hidden');
                $.setAttribute(node, 'aria-hidden', 'false');
                const instance = UI.TagsInput.init(node);
                $.removeClass(node, 'visually-hidden');
                instance.dispose();
                instance.dispose();
            });
            await expect(page.locator('#tags')).toHaveClass('input-outline visually-hidden');
            await expect(page.locator('#tags')).not.toHaveAttribute('tabindex');
            await expect(page.locator('#tags')).toHaveAttribute('aria-hidden', 'false');
        });

        test('disposes automatically when fQuery removes the native control', async ({ page }) => {
            await page.evaluate(() => {
                UI.TagsInput.init($.findOne('#tags'), { minSearch: 0, appendTo: document.body }).show();
                $.remove('#tags');
            });
            await expect(page.locator('.tagsinput-menu, .tagsinput-container')).toHaveCount(0);
        });

        for (const callback of ['renderSelection', 'renderResult', 'sanitize', 'validTag', 'isMatch', 'sortResults', 'getResults']) {
            test(`allows disposal in ${callback}`, async ({ page }) => {
                const instance = await page.evaluateHandle((callback) => {
                    const options = { minSearch: 0, debounce: 0 };
                    options[callback] = function() {
                        this.dispose();
                        return callback === 'getResults' ? { results: [] } : '';
                    };
                    const instance = UI.TagsInput.init($.findOne('#tags'), options);
                    if (instance.node) {
                        $.setValue($.findOne('.tagsinput-input'), 'a');
                        instance.show();
                    }
                    return instance;
                }, callback);
                await expect(page.locator('.tagsinput-menu, .tagsinput-container')).toHaveCount(0);
                expect(await instance.evaluate((value) => value.node)).toBeNull();
            });
        }
    });

    for (const method of ['disable', 'enable']) {
        test.describe(`#${method}`, () => {
            test('synchronizes native and generated disabled state', async ({ page }) => {
                await page.evaluate((method) => {
                    const instance = UI.TagsInput.init($.findOne('#tags'));
                    instance.disable();
                    instance[method]();
                }, method);
                const enabled = method === 'enable';
                await expect(page.locator('#tags')).toBeEnabled({ enabled });
                await expect(page.getByRole('combobox')).toBeEnabled({ enabled });
                await expect(page.getByRole('button', { name: 'Remove selection: Apple' })).toBeEnabled({ enabled });
            });
        });
    }

    test.describe('#getValue', () => {
        test('returns a copy of the selected values', async ({ page }) => {
            expect(await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'));
                instance.setValue(['Apple', 'Banana']);
                const values = instance.getValue();
                values.pop();
                return instance.getValue();
            })).toEqual(['Apple', 'Banana']);
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'Banana']);
        });
    });

    test.describe('#setValue', () => {
        for (const callback of ['validTag', 'renderSelection', 'sanitize']) {
            test(`keeps a value set inside ${callback}`, async ({ page }) => {
                const value = await page.evaluate((callback) => {
                    let replace = false;
                    const options = {
                        [callback](value) {
                            if (replace) {
                                replace = false;
                                this.setValue(['Cherry']);
                            }

                            return callback === 'validTag' ? true : value;
                        },
                    };
                    const instance = UI.TagsInput.init($.findOne('#tags'), options);
                    replace = true;
                    instance.setValue(['Banana', 'Outer']);

                    return instance.getValue();
                }, callback);

                expect(value).toEqual(['Cherry']);
                await expect(page.locator('#tags')).toHaveValues(['Cherry']);
                await expect(page.locator('.tagsinput-selection')).toHaveText(['Cherry']);
                await expect(page.locator('#tags option[value="Outer"]')).toHaveCount(0);
            });
        }

        for (const { name, value, expected } of [
            { name: 'null', value: null, expected: [] },
            { name: 'undefined', value: undefined, expected: [] },
            { name: 'a scalar', value: 'Banana', expected: ['Banana'] },
            { name: 'an array', value: ['Apple', 'Banana'], expected: ['Apple', 'Banana'] },
            { name: 'duplicates and new tags', value: ['Apple', 'Apple', 'New'], expected: ['Apple', 'New'] },
            { name: 'nullish entries', value: [null, 'Banana', undefined], expected: ['Banana'] },
        ]) {
            test(`normalizes ${name}`, async ({ page }) => {
                await page.evaluate((value) => UI.TagsInput.init($.findOne('#tags')).setValue(value), value);
                await expect(page.locator('#tags')).toHaveValues(expected);
                expect(await page.evaluate(() => $('#tags').tagsinput('getValue'))).toEqual(expected);
            });
        }

        for (const value of [0, 12, '__proto__', 'constructor', 'toString', 'null']) {
            test(`supports the value ${JSON.stringify(value)}`, async ({ page }) => {
                await page.evaluate((value) => UI.TagsInput.init($.findOne('#tags')).setValue(value), value);
                await expect(page.locator('#tags')).toHaveValues([String(value)]);
                await expect(page.locator('.tagsinput-selection')).toHaveText([String(value)]);
                await page.evaluate(() => $('#tags').tagsinput('setValue', null));
                await expect(page.locator('.tagsinput-selection')).toHaveCount(0);
            });
        }

        test('copies caller values and does not emit change', async ({ page }) => {
            await page.evaluate(() => {
                window.changes = 0;
                $.addEvent('#tags', 'change.ui.tagsinput', () => window.changes++);
                const values = ['Banana'];
                UI.TagsInput.init($.findOne('#tags')).setValue(values);
                values.push('Changed');
            });
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });
    });

    for (const { method, value, expected } of [
        { method: 'add', value: 'Banana', expected: ['Apple', 'Banana'] },
        { method: 'remove', value: 'Apple', expected: [] },
        { method: 'removeAll', expected: [] },
    ]) {
        test.describe(`#${method}`, () => {
            for (const name of ['class', 'QuerySet']) {
                test(`updates selections without emitting change (${name})`, async ({ page }) => {
                    await page.evaluate(({ method, value, name }) => {
                        window.changes = 0;
                        const instance = UI.TagsInput.init($.findOne('#tags'));
                        $.addEvent('#tags', 'change.ui.tagsinput', () => window.changes++);
                        if (name === 'class') {
                            instance[method](value);
                        } else {
                            $('#tags').tagsinput(method, value);
                        }
                    }, { method, value, name });
                    await expect(page.locator('#tags')).toHaveValues(expected);
                    expect(await page.evaluate(() => window.changes)).toBe(0);
                });
            }
        });
    }

    test.describe('#setMaxSelections', () => {
        for (const { value, expected } of [
            { value: 1.9, expected: 1 },
            { value: 0, expected: 0 },
            { value: -2, expected: 0 },
            { value: Infinity, expected: 0 },
            { value: 'invalid', expected: 0 },
        ]) {
            test(`normalizes the limit and current selection (${value})`, async ({ page }) => {
                expect(await page.evaluate((value) => {
                    const instance = UI.TagsInput.init($.findOne('#tags'));
                    instance.setValue(['Apple', 'Banana']);
                    instance.setMaxSelections(value);
                    return instance.getMaxSelections();
                }, value)).toBe(expected);
                await expect(page.locator('#tags')).toHaveValues(expected ? ['Apple'] : ['Apple', 'Banana']);
            });
        }
    });

    test.describe('#setPlaceholder', () => {
        test('updates the empty selection placeholder', async ({ page }) => {
            expect(await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'));
                instance.removeAll();
                instance.setPlaceholder('Choose fruit');
                return instance.getPlaceholder();
            })).toBe('Choose fruit');
            await expect(page.locator('.tagsinput-placeholder')).toHaveText('Choose fruit');
            await page.evaluate(() => $('#tags').tagsinput('setPlaceholder', null));
            await expect(page.locator('.tagsinput-placeholder')).toBeEmpty();
        });
    });

    for (const method of ['show', 'hide', 'toggle']) {
        test.describe(`#${method}`, () => {
            test('updates visibility and expanded state', async ({ page }) => {
                await page.evaluate((method) => {
                    const instance = UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                    if (method === 'hide') {
                        instance.show();
                    }
                    instance[method]();
                }, method);
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', String(method !== 'hide'));
                await expect(page.locator('.tagsinput-menu')).toHaveCount(method === 'hide' ? 0 : 1);
                if (method === 'toggle') {
                    await page.evaluate(() => $('#tags').tagsinput('toggle'));
                    await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
                    await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
                }
            });
        });
    }

    test.describe('#update', () => {
        test('repositions an appended menu when the control moves', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                appendTo: document.body, fullWidth: true, minSearch: 0,
            }).show());
            await expect(page.locator('body > .tagsinput-menu')).toBeVisible();
            const before = await page.getByRole('listbox').boundingBox();
            await page.evaluate(() => {
                $.setStyle($.findOne('.tagsinput-container'), 'marginTop', '80px');
                $('#tags').tagsinput('update');
            });
            await expect.poll(async () => (await page.getByRole('listbox').boundingBox()).y - before.y).toBeGreaterThan(70);
        });
    });

    test.describe('events', () => {
        test('emits lifecycle events in order and user change exactly once', async ({ page }) => {
            await page.evaluate(() => {
                window.events = [];
                const node = $.findOne('#tags');
                for (const event of ['show', 'shown', 'hide', 'hidden', 'change']) {
                    $.addEvent(node, `${event}.ui.tagsinput`, () => window.events.push(event));
                }
                UI.TagsInput.init(node, { minSearch: 0 });
            });
            await page.getByRole('combobox').click();
            await expect.poll(() => page.evaluate(() => window.events.join(','))).toBe('show,shown');
            await page.getByRole('option', { name: 'Banana', exact: true }).click();
            await expect.poll(() => page.evaluate(() => window.events.join(','))).toBe('show,shown,change,hide,hidden');
        });

        for (const event of ['show', 'hide']) {
            test(`honors cancellation of ${event}`, async ({ page }) => {
                await page.evaluate((event) => {
                    const node = $.findOne('#tags');
                    const instance = UI.TagsInput.init(node, { minSearch: 0 });
                    if (event === 'hide') {
                        instance.show();
                    }
                    $.addEvent(node, `${event}.ui.tagsinput`, (event) => event.preventDefault());
                    instance[event]();
                }, event);
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', String(event === 'hide'));
            });
        }

        for (const event of ['show', 'shown', 'hide', 'hidden', 'change']) {
            test(`allows disposal in ${event} listeners`, async ({ page }) => {
                await page.evaluate((event) => {
                    const node = $.findOne('#tags');
                    const instance = UI.TagsInput.init(node, { minSearch: 0 });
                    $.addEvent(node, `${event}.ui.tagsinput`, () => instance.dispose());
                    instance.show();
                }, event);
                if (event === 'change') {
                    await page.getByRole('option', { name: 'Banana', exact: true }).click();
                } else if (['hide', 'hidden'].includes(event)) {
                    await page.evaluate(() => $('#tags').tagsinput('hide'));
                }
                await expect(page.locator('.tagsinput-container, .tagsinput-menu')).toHaveCount(0);
            });
        }

        test('settles interrupted transitions without stale completion events', async ({ page }) => {
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(() => {
                window.events = [];
                const node = $.findOne('#tags');
                for (const event of ['shown', 'hidden']) {
                    $.addEvent(node, `${event}.ui.tagsinput`, () => window.events.push(event));
                }
                const instance = UI.TagsInput.init(node, { duration: 100, minSearch: 0 });
                instance.show();
                instance.hide();
                instance.show();
            });
            await expect.poll(() => page.evaluate(() => window.events.join(','))).toBe('shown');
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
        });

        test('guards recursive calls from show and hide listeners', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                $.addEvent('#tags', 'show.ui.tagsinput', () => instance.show());
                $.addEvent('#tags', 'hide.ui.tagsinput', () => instance.hide());
                instance.show();
            });
            await expect(page.getByRole('listbox')).toBeVisible();
            await page.evaluate(() => $('#tags').tagsinput('hide'));
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });
    });

    test.describe('user events', () => {
        test('does not emit change when selecting an existing tag', async ({ page }) => {
            await page.evaluate(() => {
                window.changes = 0;
                $.addEvent('#tags', 'change.ui.tagsinput', () => window.changes++);
                UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }).show();
            });
            await page.getByRole('option', { name: 'Apple', exact: true }).click();
            expect(await page.evaluate(() => window.changes)).toBe(0);
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
        });

        test('confirms free text while the menu is closed', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
            await page.getByRole('combobox').fill('New');
            await page.getByRole('combobox').press('Escape');
            await page.getByRole('combobox').press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'New']);
            await expect(page.getByRole('combobox')).toBeFocused();
        });

        test('navigates options with correct ARIA references', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }));
            const control = page.getByRole('combobox');
            await control.press('ArrowDown');
            await control.press('ArrowDown');
            const banana = page.getByRole('option', { name: 'Banana', exact: true });
            await expect(control).toHaveAttribute('aria-activedescendant', await banana.getAttribute('id'));
            await control.press('ArrowUp');
            await control.press('ArrowUp');
            const apple = page.getByRole('option', { name: 'Apple', exact: true });
            await expect(control).toHaveAttribute('aria-activedescendant', await apple.getAttribute('id'));
            await banana.hover();
            await expect(control).toHaveAttribute('aria-activedescendant', await banana.getAttribute('id'));
            await control.press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'Banana']);
            await expect(control).not.toHaveAttribute('aria-activedescendant');
        });

        test('closes on Escape and outside clicks', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }));
            await page.getByRole('combobox').click();
            await page.getByRole('combobox').press('Escape');
            await expect(page.getByRole('combobox')).toBeFocused();
            await page.getByRole('combobox').click();
            await page.locator('#outside').click();
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });

        test('removes the last tag with Backspace and emits change once', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'));
                instance.setValue(['Apple', 'Banana']);
                window.changes = 0;
                $.addEvent('#tags', 'change.ui.tagsinput', () => window.changes++);
            });
            await page.getByRole('combobox').press('Backspace');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await expect(page.getByRole('combobox')).toHaveValue('');
            expect(await page.evaluate(() => window.changes)).toBe(1);
        });

        test('uses a separate keyboard-operable clear button', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
            await expect(page.getByRole('combobox').getByRole('button')).toHaveCount(0);
            await page.getByRole('button', { name: 'Remove selection: Apple' }).press('Enter');
            await expect(page.getByRole('button', { name: 'Remove selection: Apple' })).toHaveCount(0);
            await expect(page.locator('#tags')).toHaveValues([]);
            await expect(page.getByRole('combobox')).toBeFocused();
        });

        test('does not confirm during IME composition', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
            const control = page.getByRole('combobox');
            await control.fill('New');
            await control.dispatchEvent('compositionstart');
            await control.press(',');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await control.dispatchEvent('compositionend');
            await control.fill('New');
            await control.press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'New']);
        });
    });

    test.describe('data option', () => {
        test('normalizes immutable primitive data without changing caller values', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                minSearch: 0, data: Object.freeze([0, 'New', 'New', null, undefined]),
            }).show());
            await expect(page.getByRole('option')).toHaveText(['0', 'New']);
            await page.getByRole('option', { name: 'New', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'New']);
            await expect(page.locator('#tags option')).toHaveCount(4);
        });
    });

    test.describe('matching and sorting', () => {
        test('normalizes accents and case in both values and search terms', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { data: ['Cafe', 'Café', 'Tea'] }));
            for (const term of ['cafe', 'CAFÉ', 'cafe\u0301']) {
                await page.getByRole('combobox').fill(term);
                await expect(page.getByRole('option')).toHaveText(['Cafe', 'Café']);
            }
        });

        test('treats regular expression characters as literal search text', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { data: ['Fruit (fresh)', 'Fruit basket'] }));
            await page.getByRole('combobox').fill('(');
            await expect(page.getByRole('option')).toHaveText(['Fruit (fresh)']);
        });

        test('orders prefix matches first and equal positions alphabetically', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { data: ['Banana bread', 'Cabana', 'Banana'] }));
            await page.getByRole('combobox').fill('BAN');
            await expect(page.getByRole('option')).toHaveText(['Banana', 'Banana bread', 'Cabana']);
        });

        test('uses custom matching and sorting callbacks', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                data: ['Apple', 'Banana', 'Cherry'],
                isMatch: (value) => value !== 'Banana',
                sortResults: (a, b) => b.localeCompare(a),
            }));
            await page.getByRole('combobox').fill('anything');
            await expect(page.getByRole('option')).toHaveText(['Cherry', 'Apple']);
        });

        for (const callback of ['isMatch', 'sortResults']) {
            test(`stops calling ${callback} after disposal`, async ({ page }) => {
                await page.evaluate((callback) => {
                    window.calls = 0;
                    const options = { isMatch: () => true };
                    options[callback] = function() {
                        window.calls++;
                        this.dispose();

                        return callback === 'isMatch' ? true : 0;
                    };

                    UI.TagsInput.init($.findOne('#tags'), options);
                }, callback);

                await page.getByRole('combobox').fill('anything');
                await expect(page.locator('.tagsinput-container, .tagsinput-menu')).toHaveCount(0);
                expect(await page.evaluate(() => window.calls)).toBe(1);
            });
        }
    });

    test.describe('minSearch option', () => {
        test('hides the menu below the minimum length and for unmatched searches', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { minSearch: 2 }).show());
            await expect(page.locator('.tagsinput-menu')).toBeHidden();
            await page.getByRole('combobox').fill('ba');
            await expect(page.getByRole('option')).toHaveText(['Banana']);
            await page.getByRole('combobox').fill('b');
            await expect(page.locator('.tagsinput-menu')).toBeHidden();
            await page.getByRole('combobox').fill('missing');
            await expect(page.getByRole('option')).toHaveCount(0);
        });
    });

    test.describe('closeOnSelect option', () => {
        for (const closeOnSelect of [true, false]) {
            test(`updates visibility and selection after choosing a result (${closeOnSelect})`, async ({ page }) => {
                await page.evaluate((closeOnSelect) => UI.TagsInput.init($.findOne('#tags'), {
                    minSearch: 0, closeOnSelect,
                }).show(), closeOnSelect);
                await page.getByRole('option', { name: 'Banana', exact: true }).click();
                await expect(page.locator('#tags')).toHaveValues(['Apple', 'Banana']);
                await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', String(!closeOnSelect));
                await expect(page.getByRole('combobox')).toBeFocused();
                if (!closeOnSelect) {
                    await expect(page.getByRole('option', { name: 'Banana', exact: true })).toHaveAttribute('aria-selected', 'true');
                }
            });
        }
    });

    test.describe('maxSelections option', () => {
        test('announces the limit and permits another choice after removal', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                maxSelections: 1, closeOnSelect: false, minSearch: 0,
            }).show());
            await expect(page.getByRole('status')).toHaveText('Selection limit reached.');
            await page.getByRole('button', { name: 'Remove selection: Apple' }).press('Enter');
            await page.getByRole('option', { name: 'Banana', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
            await expect(page.getByRole('status')).toHaveText('Selection limit reached.');
        });
    });

    test.describe('confirmKeys option', () => {
        for (const key of [',', ' ', 'Enter']) {
            test(`confirms a tag with ${JSON.stringify(key)}`, async ({ page }) => {
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
                await page.getByRole('combobox').fill('New');
                await page.getByRole('combobox').press(key);
                await expect(page.locator('#tags')).toHaveValues(['Apple', 'New']);
                await expect(page.getByRole('combobox')).toHaveValue('');
            });
        }

        test('supports custom keys and ignores modified confirmation', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { confirmKeys: [';'] }));
            await page.getByRole('combobox').fill('New');
            await page.getByRole('combobox').press('Control+Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await page.getByRole('combobox').press(';');
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'New']);
        });
    });

    for (const option of ['confirmOnBlur', 'clearOnBlur']) {
        test.describe(`${option} option`, () => {
            for (const enabled of [true, false]) {
                test(`applies the blur policy (${enabled})`, async ({ page }) => {
                    await page.evaluate(({ option, enabled }) => UI.TagsInput.init($.findOne('#tags'), {
                        confirmOnBlur: false, clearOnBlur: false, [option]: enabled,
                    }), { option, enabled });
                    await page.getByRole('combobox').fill('New');
                    await page.locator('#outside').click();
                    await expect(page.locator('#tags')).toHaveValues(option === 'confirmOnBlur' && enabled ? ['Apple', 'New'] : ['Apple']);
                    await expect(page.getByRole('combobox')).toHaveValue(enabled ? '' : 'New');
                });
            }
        });
    }

    test.describe('showClear option', () => {
        for (const showClear of [true, false]) {
            test(`controls removal button visibility (${showClear})`, async ({ page }) => {
                await page.evaluate((showClear) => UI.TagsInput.init($.findOne('#tags'), { showClear }), showClear);
                await expect(page.getByRole('button', { name: 'Remove selection: Apple' })).toHaveCount(showClear ? 1 : 0);
                await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
            });
        }
    });

    test.describe('trimValue option', () => {
        for (const trimValue of [true, false]) {
            test(`normalizes leading and trailing spaces (${trimValue})`, async ({ page }) => {
                await page.evaluate((trimValue) => UI.TagsInput.init($.findOne('#tags'), {
                    trimValue,
                }).setValue([' New ', 'New']), trimValue);
                await expect(page.locator('#tags')).toHaveValues(trimValue ? ['New'] : [' New ', 'New']);
                await page.evaluate(() => $('#tags').tagsinput('remove', ' New '));
                await expect(page.locator('#tags')).toHaveValues(trimValue ? [] : ['New']);
            });
        }
    });

    test.describe('validTag option', () => {
        test('filters initial, API, and user values', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                validTag: (value) => value.startsWith('B'),
            }));
            await expect(page.locator('#tags')).toHaveValues([]);
            await page.evaluate(() => $('#tags').tagsinput('setValue', ['Apple', 'Banana']));
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
            await page.getByRole('combobox').fill('Invalid');
            await page.getByRole('combobox').press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
        });
    });

    test.describe('rendering and sanitization', () => {
        test('allows rendering directly into the destination', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                renderSelection: (value, element) => {
                    $.setText(element, `Chosen ${value}`);
                    return element;
                },
            }));
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Chosen Apple']);
            expect(await page.evaluate(() => $('#tags').tagsinput('getValue'))).toEqual(['Apple']);
        });

        test('accepts returned elements and sanitizes string output', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                minSearch: 0,
                renderSelection: (value) => {
                    const span = $.create('span');
                    $.setText(span, `Chosen ${value}`);
                    return span;
                },
                renderResult: (value) => `<strong>${value}</strong><img src="x" onerror="window.unsafe = true">`,
            }).show());
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Chosen Apple']);
            await expect(page.locator('.tagsinput-menu [onerror]')).toHaveCount(0);
            await expect(page.getByRole('option', { name: 'Apple', exact: true }).locator('strong')).toHaveText('Apple');
            expect(await page.evaluate(() => window.unsafe)).toBeUndefined();
        });
    });
});
