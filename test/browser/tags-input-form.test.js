import { expect, test } from '#test';

test.describe('TagsInput forms', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate((_) => {
            document.body.innerHTML = '<form id="form"><fieldset><label for="tags">Fruit</label>' +
                '<select id="tags" multiple name="fruit" class="input-outline">' +
                '<option value="Apple" selected>Apple label</option><option value="Banana">Banana label</option>' +
                '</select></fieldset><button type="reset">Reset</button>' +
                '<button type="submit">Submit</button></form><button id="outside">Outside</button>';
            window.changes = 0;
            window.submits = 0;
            $.addEvent('#tags', 'change.ui.tagsinput', (_) => window.changes++);
            document.querySelector('#form').addEventListener('submit', (event) => {
                event.preventDefault();
                window.submits++;
            });
        });
    });

    test.describe('native synchronization', () => {
        test('synchronizes external native changes without duplicating events', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                UI.TagsInput.init(node);
                node.add(new Option('Cherry label', 'Cherry'));
                node.value = 'Cherry';
                node.dispatchEvent(new Event('change', { bubbles: true }));
            });
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Cherry']);
            await expect(page.locator('#tags option')).toHaveText(['Apple label', 'Banana label', 'Cherry label']);
            expect(await page.evaluate((_) => $('#tags').tagsinput('getValue'))).toEqual(['Cherry']);
            expect(await page.evaluate((_) => window.changes)).toBe(1);
        });

        test('observes added and removed native options', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                UI.TagsInput.init(node);
                node.add(new Option('Cherry label', 'Cherry', false, true));
            });
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple', 'Cherry']);
            await page.evaluate((_) => document.querySelector('#tags option[value="Apple"]').remove());
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Cherry']);
            expect(await page.evaluate((_) => window.changes)).toBe(0);
        });

        test('updates accessible labels, descriptions, and error references', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                UI.TagsInput.init(node);
                node.setAttribute('aria-label', 'Favorite fruit');
                node.setAttribute('aria-describedby', 'help');
                node.setAttribute('aria-errormessage', 'error');
                node.setAttribute('aria-invalid', 'true');
            });
            const control = page.getByRole('combobox', { name: 'Favorite fruit' });
            await expect(control).toHaveAttribute('aria-describedby', 'help');
            await expect(control).toHaveAttribute('aria-errormessage', 'error');
            await expect(control).toHaveAttribute('aria-invalid', 'true');
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                node.removeAttribute('aria-describedby');
                node.removeAttribute('aria-errormessage');
                node.removeAttribute('aria-invalid');
            });
            await expect(control).not.toHaveAttribute('aria-describedby');
            await expect(control).not.toHaveAttribute('aria-errormessage');
            await expect(control).not.toHaveAttribute('aria-invalid');
        });
    });

    test.describe('submission', () => {
        test('updates FormData without emitting changes or replacing defaults', async ({ page }) => {
            await page.evaluate((_) => UI.TagsInput.init(document.querySelector('#tags')).setValue(['Banana', 'New']));
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).getAll('fruit'))).toEqual(['Banana', 'New']);
            expect(await page.evaluate((_) => window.changes)).toBe(0);
            await expect(page.locator('#tags option').first()).toHaveAttribute('selected', '');
        });

        test('excludes a disabled native control from FormData', async ({ page }) => {
            await page.evaluate((_) => UI.TagsInput.init(document.querySelector('#tags')).disable());
            expect(await page.evaluate((_) => new FormData(document.querySelector('#form')).has('fruit'))).toBe(false);
        });

        for (const value of ['Banana', 'New']) {
            test(`prevents Enter from submitting while confirming ${value}`, async ({ page }) => {
                await page.evaluate((_) => UI.TagsInput.init(document.querySelector('#tags')));
                await page.getByRole('combobox').fill(value);
                await page.getByRole('combobox').press('Enter');
                await expect(page.locator('#tags')).toHaveValues(['Apple', value]);
                expect(await page.evaluate((_) => window.submits)).toBe(0);
                expect(await page.evaluate((_) => window.changes)).toBe(1);
                await page.getByRole('button', { name: 'Submit', exact: true }).click();
                expect(await page.evaluate((_) => window.submits)).toBe(1);
            });
        }
    });

    test.describe('validation', () => {
        test('preserves native required validation and redirects invalid focus', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                node.required = true;
                UI.TagsInput.init(node).removeAll();
            });
            expect(await page.locator('#tags').evaluate((node) => node.validity.valueMissing)).toBe(true);
            await page.getByRole('button', { name: 'Submit', exact: true }).click();
            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
            expect(await page.evaluate((_) => window.submits)).toBe(0);
            await page.evaluate((_) => $('#tags').tagsinput('setValue', 'Banana'));
            await expect(page.getByRole('combobox')).not.toHaveAttribute('aria-invalid');
            expect(await page.locator('#tags').evaluate((node) => node.checkValidity())).toBe(true);
        });
    });

    test.describe('disabled state', () => {
        for (const selector of ['#tags', 'fieldset']) {
            test(`tracks native disabled state (${selector})`, async ({ page }) => {
                await page.evaluate((selector) => {
                    UI.TagsInput.init(document.querySelector('#tags'), { minSearch: 0 }).show();
                    document.querySelector(selector).disabled = true;
                }, selector);
                await expect(page.getByRole('combobox')).toBeDisabled();
                await expect(page.getByRole('button', { name: 'Remove selection: Apple' })).toBeDisabled();
                await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
                await page.getByRole('combobox').dispatchEvent('keydown', { key: 'Backspace' });
                await page.getByRole('button', { name: 'Remove selection: Apple' }).dispatchEvent('click');
                await expect(page.locator('#tags')).toHaveValues(['Apple']);
                expect(await page.evaluate((_) => window.changes)).toBe(0);
                await page.evaluate((selector) => document.querySelector(selector).disabled = false, selector);
                await expect(page.getByRole('combobox')).toBeEnabled();
            });
        }

        test('honors an initially disabled fieldset even after calling enable', async ({ page }) => {
            await page.evaluate((_) => {
                document.querySelector('fieldset').disabled = true;
                const instance = UI.TagsInput.init(document.querySelector('#tags'));
                instance.enable();
                instance.show();
            });
            await expect(page.getByRole('combobox')).toBeDisabled();
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
            await page.evaluate((_) => document.querySelector('fieldset').disabled = false);
            await expect(page.getByRole('combobox')).toBeEnabled();
        });

        test('closes a disabled control even when hide is canceled', async ({ page }) => {
            await page.evaluate((_) => {
                const instance = UI.TagsInput.init(document.querySelector('#tags'), { minSearch: 0 });
                instance.show();
                $.addEvent('#tags', 'hide.ui.tagsinput', (event) => event.preventDefault());
                instance.disable();
            });
            await expect(page.getByRole('combobox')).toBeDisabled();
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });
    });

    test.describe('reset', () => {
        test('restores default selections silently and removes generated tags', async ({ page }) => {
            await page.evaluate((_) => {
                const instance = UI.TagsInput.init(document.querySelector('#tags'));
                instance.setValue(['Banana', 'New']);
                instance.show();
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).press('Enter');
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
            await expect(page.locator('#tags option')).toHaveCount(2);
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
            expect(await page.evaluate((_) => window.changes)).toBe(0);
        });

        test('resets an initially empty select without retaining generated options', async ({ page }) => {
            await page.evaluate((_) => {
                const node = document.querySelector('#tags');
                node.replaceChildren();
                UI.TagsInput.init(node).setValue('New');
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues([]);
            await expect(page.locator('#tags option')).toHaveCount(0);
            await expect(page.locator('.tagsinput-selection')).toHaveCount(0);
        });

        test('does not synchronize a canceled reset', async ({ page }) => {
            await page.evaluate((_) => {
                UI.TagsInput.init(document.querySelector('#tags')).setValue('Banana');
                document.querySelector('#form').addEventListener('reset', (event) => event.preventDefault());
            });
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Banana']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Banana']);
        });

        test('rebinds reset handling when the external form owner changes', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.insertAdjacentHTML('beforeend', '<form id="second"><button type="reset">Second reset</button></form>');
                const node = document.querySelector('#tags');
                const instance = UI.TagsInput.init(node);
                node.setAttribute('form', 'second');
                instance.setValue('Banana');
            });
            await page.getByRole('button', { name: 'Second reset' }).click();
            await expect(page.locator('#tags')).toHaveValues(['Apple']);
            await expect(page.locator('.tagsinput-selection')).toHaveText(['Apple']);
        });

        test('clears an unconfirmed search on reset', async ({ page }) => {
            await page.evaluate((_) => UI.TagsInput.init(document.querySelector('#tags')));
            await page.getByRole('combobox').fill('Banana');
            await page.evaluate((_) => document.querySelector('#form').reset());
            await expect(page.getByRole('combobox')).toHaveValue('');
            await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test.describe('keyboard navigation', () => {
        test('keeps unconfirmed text when focus moves to a removal button', async ({ page }) => {
            await page.evaluate((_) => UI.TagsInput.init(document.querySelector('#tags')).setValue(['Apple', 'Banana']));
            await page.getByRole('combobox').fill('New');
            await page.getByRole('combobox').press('Shift+Tab');
            await expect(page.getByRole('button', { name: 'Remove selection: Banana' })).toBeFocused();
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'Banana']);
        });
    });

    test.describe('disposal', () => {
        test('does not remove another instance or consumer change listeners', async ({ page }) => {
            await page.evaluate((_) => {
                document.body.insertAdjacentHTML('beforeend', '<select id="second" multiple><option>Other</option></select>');
                UI.TagsInput.init(document.querySelector('#tags'));
                UI.TagsInput.init(document.querySelector('#second'), { minSearch: 0 });
                $('#tags').tagsinput('dispose');
                $.triggerEvent('#tags', 'change.ui.tagsinput');
                $('#second').tagsinput('show');
            });
            expect(await page.evaluate((_) => window.changes)).toBe(1);
            await expect(page.getByRole('option', { name: 'Other' })).toBeVisible();
            await page.locator('#outside').click();
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
        });
    });
});
