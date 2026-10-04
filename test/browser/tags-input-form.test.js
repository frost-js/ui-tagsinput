import { expect, test } from '#test';

test.describe('TagsInput forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<form id="form"><fieldset><label for="tags">Fruit</label>' +
                '<select id="tags" multiple name="fruit" class="input-outline">' +
                '<option value="Apple" selected>Apple label</option><option value="Banana">Banana label</option>' +
                '</select></fieldset><button type="reset">Reset</button>' +
                '<button type="submit">Submit</button></form><button id="outside">Outside</button>',
            );
            window.changes = 0;
            window.submits = 0;
            $.addEvent('#tags', 'change.ui.tagsinput', () => window.changes++);
            $.findOne('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submits++;
            });
        });
    });

    test.describe('native synchronization', () => {
        test('synchronizes external native changes without duplicating events', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                UI.TagsInput.init(node, { minSearch: 0 });
                node.add(new Option('Cherry label', 'Cherry'));
                node.value = 'Cherry';
                node.dispatchEvent(new Event('change', { bubbles: true }));
            });
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Cherry']);
            await expect(page.locator('#tags option')).toHaveText(['Apple label', 'Banana label', 'Cherry label']);
            expect(await page.evaluate(() => $('#tags').tagsinput('getValue'))).toEqual(['Cherry']);
            expect(await page.evaluate(() => window.changes)).toBe(1);
            await page.evaluate(() => $('#tags').tagsinput('show'));
            await expect(page.getByRole('option')).toHaveText(['Apple', 'Banana', 'Cherry']);
            await expect(page.getByRole('option', { name: 'Cherry', exact: true })).toHaveAttribute('aria-selected', 'true');
        });

        for (const { action, expected } of [
            { action: 'add', expected: ['Apple', 'Banana', 'Cherry'] },
            { action: 'remove', expected: ['Apple'] },
            { action: 'rename', expected: ['Apple', 'Cherry'] },
        ]) {
            test(`preserves pending option changes when setting values (${action})`, async ({ page }) => {
                await page.evaluate((action) => {
                    const node = $.findOne('#tags');
                    const instance = UI.TagsInput.init(node, { minSearch: 0 });
                    if (action === 'add') {
                        node.add(new Option('Cherry label', 'Cherry'));
                    } else if (action === 'remove') {
                        node.options[1].remove();
                    } else {
                        node.options[1].value = 'Cherry';
                    }
                    instance.setValue('Apple');
                    instance.show();
                }, action);
                await expect(page.getByRole('option')).toHaveText(expected);
                await expect(page.locator('#tags')).toHaveValues(['Apple']);
                expect(await page.evaluate(() => window.changes)).toBe(0);
            });
        }

        test('keeps explicit suggestion data when native options change', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                const instance = UI.TagsInput.init(node, { data: ['Custom'], minSearch: 0 });
                node.add(new Option('Cherry label', 'Cherry'));
                instance.setValue('Cherry');
                instance.show();
            });
            await expect(page.getByRole('option')).toHaveText(['Custom']);
            await expect(page.locator('#tags')).toHaveValues(['Cherry']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        test('observes added and removed native options', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                UI.TagsInput.init(node);
                node.add(new Option('Cherry label', 'Cherry', false, true));
            });
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple', 'Cherry']);
            await page.evaluate(() => $.findOne('#tags option[value="Apple"]').remove());
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Cherry']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        test('synchronizes implicit option values after text-node edits', async ({ page }) => {
            await page.evaluate(() => {
                const option = $.findOne('#tags option');
                $.removeAttribute(option, 'value');
                $.setText(option, 'Apple');
                UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }).show();
                option.firstChild.data = 'Apricot';
            });

            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apricot']);
            await expect(page.locator('#tags')).toHaveValues(['Apricot']);
            await expect(page.locator('#tags option')).toHaveCount(2);
            await expect(page.getByRole('option')).toHaveText(['Apricot', 'Banana']);
            expect(await page.evaluate(() => $('#tags').tagsinput('getValue'))).toEqual(['Apricot']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        for (const value of ['Banana', '[]', '{}']) {
            test(`retains suggestion focus after native option changes (${value})`, async ({ page }) => {
                await page.evaluate((value) => {
                    $.setProperty('#tags option[value="Banana"]', 'value', value);
                    UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                }, value);
                const control = page.getByRole('combobox');
                await control.press('ArrowDown');
                await control.press('ArrowDown');
                const focused = page.getByRole('option', { name: value, exact: true });
                await expect(control).toHaveAttribute('aria-activedescendant', await focused.getAttribute('id'));

                await page.evaluate(() => $.append('#tags', '<option value="Cherry">Cherry</option>'));
                await expect(page.getByRole('option')).toHaveText(['Apple', value, 'Cherry']);
                await expect(control).toHaveAttribute('aria-activedescendant', await focused.getAttribute('id'));
                await expect(focused).toHaveClass(/\bfocus\b/);
                expect(await page.evaluate(() => window.changes)).toBe(0);

                await control.press('Enter');
                await expect(page.locator('#tags')).toHaveValues(['Apple', value]);
                await expect(control).not.toHaveAttribute('aria-activedescendant');
            });
        }

        test('falls back to the first suggestion when the focused native option is removed', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }));
            const control = page.getByRole('combobox');
            await control.press('ArrowDown');
            await control.press('ArrowDown');
            await page.evaluate(() => $.remove('#tags option[value="Banana"]'));

            await expect(page.getByRole('option')).toHaveText(['Apple']);
            const apple = page.getByRole('option', { name: 'Apple', exact: true });
            await expect(control).toHaveAttribute('aria-activedescendant', await apple.getAttribute('id'));
            await control.press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        test.describe('ARIA attributes', () => {
            test('prefers aria-labelledby and restores the fallback accessible label', async ({ page }) => {
                await page.evaluate(() => {
                    $.append(document.body, '<span id="name">Choose fruit</span>');
                    const node = $.findOne('#tags');
                    $.setAttribute(node, { 'aria-label': 'Favorite fruit', 'aria-labelledby': 'name' });
                    UI.TagsInput.init(node);
                });
                const control = page.getByRole('combobox');
                await expect(control).toHaveAccessibleName('Choose fruit');
                await expect(control).toHaveAttribute('aria-labelledby', 'name');
                await expect(control).not.toHaveAttribute('aria-label');

                await page.evaluate(() => $.removeAttribute('#tags', 'aria-labelledby'));
                await expect(control).toHaveAccessibleName('Favorite fruit');
                await expect(control).not.toHaveAttribute('aria-labelledby');
                await expect(control).toHaveAttribute('aria-label', 'Favorite fruit');

                await page.evaluate(() => $.removeAttribute('#tags', 'aria-label'));
                await expect(control).toHaveAccessibleName('Fruit');
            });

            test('synchronizes aria-required overrides and falls back to native required', async ({ page }) => {
                await page.evaluate(() => {
                    $.setProperty('#tags', 'required', true);
                    UI.TagsInput.init($.findOne('#tags'));
                });
                const control = page.getByRole('combobox');
                await expect(control).toHaveAttribute('aria-required', 'true');

                await page.evaluate(() => $.setAttribute('#tags', 'aria-required', 'false'));
                await expect(control).toHaveAttribute('aria-required', 'false');

                await page.evaluate(() => $.removeAttribute('#tags', 'aria-required'));
                await expect(control).toHaveAttribute('aria-required', 'true');

                await page.evaluate(() => $.setProperty('#tags', 'required', false));
                await expect(control).toHaveAttribute('aria-required', 'false');
            });

            test('updates accessible labels, descriptions, and error references', async ({ page }) => {
                await page.evaluate(() => {
                    const node = $.findOne('#tags');
                    UI.TagsInput.init(node);
                    $.setAttribute(node, {
                        'aria-label': 'Favorite fruit',
                        'aria-describedby': 'help',
                        'aria-errormessage': 'error',
                        'aria-invalid': 'true',
                    });
                });
                const control = page.getByRole('combobox', { name: 'Favorite fruit' });
                await expect(control).toHaveAttribute('aria-describedby', 'help');
                await expect(control).toHaveAttribute('aria-errormessage', 'error');
                await expect(control).toHaveAttribute('aria-invalid', 'true');
                await page.evaluate(() => {
                    const node = $.findOne('#tags');
                    for (const attribute of ['aria-describedby', 'aria-errormessage', 'aria-invalid']) {
                        $.removeAttribute(node, attribute);
                    }
                });
                await expect(control).not.toHaveAttribute('aria-describedby');
                await expect(control).not.toHaveAttribute('aria-errormessage');
                await expect(control).not.toHaveAttribute('aria-invalid');
            });
        });
    });

    test.describe('submission', () => {
        test('updates FormData without emitting changes or replacing defaults', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')).setValue(['Banana', 'New']));
            expect(await page.evaluate(() => new FormData($.findOne('#form')).getAll('fruit'))).toEqual(['Banana', 'New']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
            await expect(page.locator('#tags option').first()).toHaveAttribute('selected', '');
        });

        test('excludes a disabled native control from FormData', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')).disable());
            expect(await page.evaluate(() => new FormData($.findOne('#form')).has('fruit'))).toBe(false);
        });

        for (const value of ['Banana', 'New']) {
            test(`prevents Enter from submitting while confirming ${value}`, async ({ page }) => {
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
                await page.getByRole('combobox').fill(value);
                await page.getByRole('combobox').press('Enter');
                await expect(page.locator('#tags')).toHaveValues(['Apple', value]);
                expect(await page.evaluate(() => window.submits)).toBe(0);
                expect(await page.evaluate(() => window.changes)).toBe(1);
                await page.getByRole('button', { name: 'Submit', exact: true }).click();
                expect(await page.evaluate(() => window.submits)).toBe(1);
            });
        }
    });

    test.describe('validation', () => {
        test('preserves native required validation', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.setProperty(node, 'required', true);
                UI.TagsInput.init(node).removeAll();
            });
            expect(await page.locator('#tags').evaluate((node) => node.validity.valueMissing)).toBe(true);
            await page.getByRole('button', { name: 'Submit', exact: true }).click();
            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
            expect(await page.evaluate(() => window.submits)).toBe(0);
            await page.evaluate(() => $('#tags').tagsinput('setValue', 'Banana'));
            await expect(page.getByRole('combobox')).not.toHaveAttribute('aria-invalid');
            expect(await page.locator('#tags').evaluate((node) => node.checkValidity())).toBe(true);
        });
    });

    test.describe('disabled state', () => {
        for (const selector of ['#tags', 'fieldset']) {
            test(`tracks native disabled state (${selector})`, async ({ page }) => {
                await page.evaluate((selector) => {
                    UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }).show();
                    $.setProperty($.findOne(selector), 'disabled', true);
                }, selector);
                await expect(page.getByRole('combobox')).toBeDisabled();
                await expect(page.getByRole('button', { name: 'Remove selection: Apple' })).toBeDisabled();
                await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
                await page.getByRole('combobox').dispatchEvent('keydown', { key: 'Backspace' });
                await page.getByRole('button', { name: 'Remove selection: Apple' }).dispatchEvent('click');
                await expect(page.locator('#tags')).toHaveValues(['Apple']);
                expect(await page.evaluate(() => window.changes)).toBe(0);
                await page.evaluate((selector) => $.setProperty($.findOne(selector), 'disabled', false), selector);
                await expect(page.getByRole('combobox')).toBeEnabled();
            });
        }

        test('honors hide cancellation when option changes and disabling are observed together', async ({ page }) => {
            await page.evaluate(() => {
                UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 }).show();
                $.addEvent('#tags', 'hide.ui.tagsinput', (event) => event.preventDefault());
                $.append('#tags', '<option value="Cherry">Cherry</option>');
                $.setProperty('#tags', 'disabled', true);
            });

            const control = page.getByRole('combobox');
            await expect(control).toBeDisabled();
            await expect(control).toHaveAttribute('aria-expanded', 'true');
            const option = page.getByRole('option', { name: 'Apple', exact: true });
            await expect(control).toHaveAttribute('aria-activedescendant', await option.getAttribute('id'));
            await expect(page.locator('.tagsinput-menu')).toBeVisible();
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        test('honors an initially disabled fieldset even after calling enable', async ({ page }) => {
            await page.evaluate(() => {
                $.setProperty($.findOne('fieldset'), 'disabled', true);
                const instance = UI.TagsInput.init($.findOne('#tags'));
                instance.enable();
                instance.show();
            });
            await expect(page.getByRole('combobox')).toBeDisabled();
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
            await page.evaluate(() => $.setProperty($.findOne('fieldset'), 'disabled', false));
            await expect(page.getByRole('combobox')).toBeEnabled();
        });

        test('honors hide cancellation when disabling the control', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                instance.show();
                $.addEvent('#tags', 'hide.ui.tagsinput', (event) => event.preventDefault());
                instance.disable();
            });
            await expect(page.getByRole('combobox')).toBeDisabled();
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
            await expect(page.locator('.tagsinput-menu')).toBeVisible();
        });
    });

    test.describe('reset', () => {
        test('restores default selections silently and removes generated tags', async ({ page }) => {
            await page.evaluate(() => {
                const instance = UI.TagsInput.init($.findOne('#tags'));
                instance.setValue(['Banana', 'New']);
                instance.show();
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
            await expect(page.locator('#tags option')).toHaveCount(2);
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
            expect(await page.evaluate(() => window.changes)).toBe(0);
        });

        test('resets an initially empty select without retaining generated options', async ({ page }) => {
            await page.evaluate(() => {
                const node = $.findOne('#tags');
                $.empty(node);
                UI.TagsInput.init(node).setValue('New');
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues([]);
            await expect(page.locator('#tags option')).toHaveCount(0);
            await expect(page.locator('.tagsinput-selection')).toHaveCount(0);
        });

        test('does not synchronize a canceled reset', async ({ page }) => {
            await page.evaluate(() => {
                UI.TagsInput.init($.findOne('#tags')).setValue('Banana');
                $.findOne('#form').addEventListener('reset', (event) => event.preventDefault());
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Banana']);
        });

        test('resets through an external form owner', async ({ page }) => {
            await page.evaluate(() => {
                $.append(document.body, '<form id="second"><button type="reset">Second reset</button></form>');
                const node = $.findOne('#tags');
                $.setAttribute(node, 'form', 'second');
                UI.TagsInput.init(node).setValue('Banana');
            });
            await page.getByRole('button', { name: 'Second reset' }).click();
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
        });

        test('clears an unconfirmed search on reset', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags')));
            await page.getByRole('combobox').fill('Banana');
            await page.evaluate(() => $.findOne('#form').reset());
            await expect(page.getByRole('combobox')).toHaveValue('');
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test.describe('disposal', () => {
        test('does not remove another instance or consumer change listeners', async ({ page }) => {
            await page.evaluate(() => {
                $.append(document.body, '<select id="second" multiple><option>Other</option></select>');
                UI.TagsInput.init($.findOne('#tags'));
                UI.TagsInput.init($.findOne('#second'), { minSearch: 0 });
                $('#tags').tagsinput('dispose');
                $.triggerEvent('#tags', 'change.ui.tagsinput');
                $('#second').tagsinput('show');
            });
            expect(await page.evaluate(() => window.changes)).toBe(1);
            await expect(page.getByRole('option', { name: 'Other' })).toBeVisible();
            await page.locator('#outside').click();
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });
    });
});
