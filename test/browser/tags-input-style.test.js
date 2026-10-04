import { expect, test } from '#test';

test.describe('TagsInput styles', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<button id="outside">Outside</button><div id="host" style="width:260px">' +
                '<label for="tags">Fruit</label><select id="tags" multiple class="input-outline">' +
                '<option value="Apple" selected>Apple label</option><option value="Banana">Banana label</option>' +
                '</select></div>',
            );
        });
    });

    test.describe('control sizing', () => {
        for (const style of ['filled', 'outline']) {
            for (const { size, fontSize } of [
                { size: '', fontSize: '16px' },
                { size: 'sm', fontSize: '14px' },
                { size: 'lg', fontSize: '20px' },
            ]) {
                test.describe(`${style}, size=${size || 'default'}`, () => {
                    test.beforeEach(async ({ page }) => {
                        await page.evaluate(({ style, size }) => {
                            const node = $.findOne('#tags');
                            $.setAttribute(node, 'class', `input-${style}${size ? ` input-${size}` : ''}`);
                            const reference = $.create('input');
                            $.setProperty(reference, 'id', 'reference');
                            $.setAttribute(reference, 'class', $.getProperty(node, 'className'));
                            $.append($.findOne('#host'), reference);
                            UI.TagsInput.init(node, { minSearch: 0 });
                        }, { style, size });
                    });

                    test('matches UI control and menu sizing', async ({ page }) => {
                        const toggle = page.locator('.tagsinput');
                        const reference = page.locator('#reference');
                        for (const property of ['font-size', 'padding-top', 'padding-bottom', 'height', 'border-top-width', 'border-radius']) {
                            const value = await reference.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                            await expect(toggle).toHaveCSS(property, value);
                        }
                        await expect(toggle).toHaveCSS('width', '260px');
                        await page.getByRole('combobox').click();
                        await expect(page.getByRole('listbox')).toHaveCSS('font-size', fontSize);
                    });

                    test('inherits the editor font and keeps an empty control at the UI input height', async ({ page }) => {
                        await page.evaluate(() => $('#tags').tagsinput('removeAll'));
                        await expect(page.getByRole('combobox')).toHaveCSS('font-size', fontSize);
                        const height = await page.locator('#reference').evaluate((node) => getComputedStyle(node).height);
                        await expect(page.locator('.tagsinput')).toHaveCSS('height', height);
                    });
                });
            }
        }
    });

    test.describe('selection overflow', () => {
        for (const direction of ['ltr', 'rtl']) {
            test(`keeps chips and removal buttons inside a narrow control (${direction})`, async ({ page }) => {
                await page.evaluate((direction) => {
                    const node = $.findOne('#tags');
                    $.setProperty(node, 'dir', direction);
                    UI.TagsInput.init(node).setValue(['An extremely long tag '.repeat(20), 'Banana']);
                }, direction);
                const control = page.locator('.tagsinput');
                await expect(control).toHaveCSS('direction', direction);
                expect(await control.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
                await expect(control).toHaveCSS('column-gap', '4px');
                const bounds = await control.boundingBox();
                for (const button of await control.getByRole('button').all()) {
                    const clear = await button.boundingBox();
                    expect(clear.x).toBeGreaterThanOrEqual(bounds.x);
                    expect(clear.x + clear.width).toBeLessThanOrEqual(bounds.x + bounds.width);
                }
            });
        }
    });

    test.describe('search sizing', () => {
        for (const display of ['grid', 'flex']) {
            test(`measures search text independently of a ${display} page layout`, async ({ page }) => {
                await page.evaluate((display) => {
                    $.setAttribute(document.body, 'style', `display:${display};grid-template-columns:320px`);
                    UI.TagsInput.init($.findOne('#tags'));
                }, display);
                await page.getByRole('combobox').fill('Long search '.repeat(30));
                const control = page.locator('.tagsinput');
                expect(await control.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
                const color = await control.evaluate((node) => getComputedStyle(node).color);
                await expect(page.getByRole('combobox')).toHaveCSS('color', color);
            });
        }
    });

    test.describe('menu sizing and overflow', () => {
        test('wraps long results and constrains the scrollable menu', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                fullWidth: true, maxHeight: '70px', minSearch: 0,
                data: Array.from({ length: 10 }, (_, index) => `${index}: ${'x'.repeat(200)}`),
            }).show());
            await expect(page.getByRole('listbox')).toHaveCSS('width', '260px');
            await expect(page.getByRole('listbox')).toHaveCSS('max-height', '70px');
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
            expect(await page.getByRole('listbox').evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
        });
    });

    test.describe('input groups', () => {
        for (const [style, nested] of [['outline', false], ['outline', true], ['filled', false], ['filled', true]]) {
            test.describe(`${style}, nested=${nested}`, () => {
                test.beforeEach(async ({ page }) => {
                    await page.evaluate(({ style, nested }) => {
                        const host = $.findOne('#host');
                        const select = `<select id="tags" multiple class="input-${style} input-floating"><option selected>Apple</option></select>`;
                        const field = nested ? `<div class="form-input">${select}<label for="tags" class="label-floating">Fruit</label></div>` : select;
                        $.setHtml(host, `<div class="input-group input-group-sm"><span class="input-group-text">@</span>${field}<button class="btn">Go</button></div>`);
                        UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                    }, { style, nested });
                });

                test('fits the control and adjoining button within the group', async ({ page }) => {
                    const bounds = await page.locator('.input-group').boundingBox();
                    const button = await page.getByRole('button', { name: 'Go' }).boundingBox();
                    expect(button.x + button.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
                    expect(button.y).toBe(bounds.y);
                    await expect(page.locator('.tagsinput')).toHaveCSS('border-top-left-radius', '0px');
                    await expect(page.locator('.tagsinput')).toHaveCSS('border-top-right-radius', '0px');
                });

                test('applies focus styling to the group', async ({ page }) => {
                    await page.getByRole('combobox').click();
                    const group = page.locator('.input-group');
                    if (style === 'outline') {
                        await expect(group).not.toHaveCSS('box-shadow', 'none');
                    } else {
                        await expect(page.locator('.tagsinput')).toHaveCSS('background-size', '0% 2px, 100% 1px');
                        expect(await group.evaluate((node) => getComputedStyle(node, '::after').opacity)).toBe('1');
                    }
                    await expect(page.locator('.tagsinput')).toHaveCSS('box-shadow', 'none');
                });

                test('uses the small input-group menu font size', async ({ page }) => {
                    await page.getByRole('combobox').click();
                    await expect(page.getByRole('listbox')).toHaveCSS('font-size', '14px');
                });
            });
        }

        test('retains the starting radius when the native select is the first input-group child', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml($.findOne('#host'),
                    '<div class="input-group"><select id="tags" multiple class="input-outline">' +
                    '<option selected>Apple</option></select><button class="btn">Go</button></div>',
                );
                UI.TagsInput.init($.findOne('#tags'));
            });
            const radius = await page.locator('.input-group').evaluate((node) => getComputedStyle(node).borderTopLeftRadius);
            await expect(page.locator('.tagsinput')).toHaveCSS('border-top-left-radius', radius);
            await expect(page.locator('.tagsinput')).toHaveCSS('border-top-right-radius', '0px');
        });
    });

    test.describe('floating labels', () => {
        for (const style of ['outline', 'filled']) {
            for (const direction of ['ltr', 'rtl']) {
                test(`preserves the label above the selected tags (${style}, ${direction})`, async ({ page }) => {
                    await page.evaluate(({ style, direction }) => {
                        $.setHtml($.findOne('#host'), `<div class="input-group" dir="${direction}">` +
                            '<span class="input-group-text">Fruit</span><div class="form-input">' +
                            `<select id="tags" multiple class="input-${style} input-floating"><option selected>Apple</option></select>` +
                            '<label for="tags" class="label-floating">Favorite fruit</label></div></div>');
                        UI.TagsInput.init($.findOne('#tags'), { minSearch: 0 });
                    }, { style, direction });
                    const control = page.getByRole('combobox', { name: 'Favorite fruit' });
                    const label = page.locator('.label-floating');
                    await control.click();
                    await expect(page.getByRole('listbox')).toBeVisible();
                    expect(await label.evaluate((node) => {
                        const range = document.createRange();
                        range.selectNodeContents(node);
                        const text = range.getBoundingClientRect();
                        $.setStyle(node, 'pointerEvents', 'auto');
                        const visible = document.elementFromPoint(text.x + text.width / 2, text.y + text.height / 2) === node;
                        $.removeStyle(node, 'pointer-events');
                        return visible;
                    })).toBe(true);
                    await control.press('Escape');
                    await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
                });
            }
        }
    });

    test.describe('focus, disabled, and validation styling', () => {
        for (const { style, focusProperty } of [
            { style: 'filled', focusProperty: 'background-size' },
            { style: 'outline', focusProperty: 'box-shadow' },
        ]) {
            test.describe(style, () => {
                test.beforeEach(async ({ page }) => {
                    await page.evaluate((style) => {
                        const node = $.findOne('#tags');
                        $.setAttribute(node, 'class', `input-${style}`);
                        UI.TagsInput.init(node);
                        const reference = $.create('input');
                        $.setProperty(reference, 'id', 'reference');
                        $.setAttribute(reference, 'class', `input-${style}`);
                        $.append($.findOne('#host'), reference);
                    }, style);
                });

                test('matches UI focus styling and clears focus on blur', async ({ page }) => {
                    await page.evaluate(() => $.addClass($.findOne('#reference'), 'focus'));
                    await page.getByRole('combobox').focus();
                    const toggle = page.locator('.tagsinput');
                    await expect(toggle).toHaveClass(/focus/);
                    const value = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), focusProperty);
                    await expect(toggle).toHaveCSS(focusProperty, value);
                    await page.locator('#outside').click();
                    await expect(toggle).not.toHaveClass(/focus/);
                });

                test('matches UI validation styling', async ({ page }) => {
                    await page.evaluate(() => $.addClass($.findOne('#host'), 'form-error'));
                    for (const property of ['background-color', 'border-color']) {
                        const value = await page.locator('#reference').evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
                        await expect(page.locator('.tagsinput')).toHaveCSS(property, value);
                    }
                });

                for (const invalid of [false, true]) {
                    test(`matches UI disabled styling (invalid=${invalid})`, async ({ page }) => {
                        await page.evaluate((invalid) => {
                            if (invalid) {
                                $.addClass('#host', 'form-error');
                            } else {
                                $.removeClass('#host', 'form-error');
                            }
                            $('#tags').tagsinput('disable');
                            $.setProperty($.findOne('#reference'), 'disabled', true);
                        }, invalid);
                        await expect(page.getByRole('combobox')).toBeDisabled();
                        const color = await page.locator('#reference').evaluate((node) => getComputedStyle(node).backgroundColor);
                        await expect(page.locator('.tagsinput')).toHaveCSS('background-color', color);
                    });
                }
            });
        }
    });

    test.describe('attachment and positioning', () => {
        for (const direction of ['ltr', 'rtl']) {
            test(`matches the reference width when appended to body (${direction})`, async ({ page }) => {
                await page.evaluate((direction) => {
                    $.setProperty($.findOne('#tags'), 'dir', direction);
                    UI.TagsInput.init($.findOne('#tags'), {
                        minSearch: 0, fullWidth: true, appendTo: document.body,
                    }).show();
                }, direction);
                await expect(page.locator('body > .tagsinput-menu')).toBeVisible();
                await expect(page.getByRole('listbox')).toHaveCSS('direction', direction);
                const control = await page.locator('.tagsinput').boundingBox();
                await expect(page.getByRole('listbox')).toHaveCSS('width', `${control.width}px`);
                const menu = await page.getByRole('listbox').boundingBox();
                expect(menu.y).toBeGreaterThanOrEqual(control.y + control.height - 1);
            });
        }
    });

    test.describe('modal integration', () => {
        test('keeps the editor and menu usable inside a UI modal', async ({ page }) => {
            await page.evaluate(() => {
                $.setHtml(document.body,
                    '<div id="modal" class="modal" tabindex="-1"><div class="modal-dialog">' +
                    '<div class="modal-content"><div class="modal-body"><label for="tags">Fruit</label>' +
                    '<select id="tags" multiple class="input-outline">' +
                    '<option selected>Apple</option>' +
                    '<option>Banana</option></select>' +
                    '</div></div></div></div>',
                );
                UI.TagsInput.init($.findOne('#tags'), { minSearch: 0, fullWidth: true });
                UI.Modal.init($.findOne('#modal')).show();
            });
            await page.getByRole('combobox').click();
            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.getByRole('listbox')).toBeVisible();
            await page.getByRole('option', { name: 'Banana', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Apple', 'Banana']);
            await expect(page.getByRole('combobox')).toBeFocused();
            await expect(page.locator('#modal')).toBeVisible();
        });
    });
});
