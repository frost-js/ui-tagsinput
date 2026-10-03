import { expect, test } from '#test';

test.describe('TagsInput remote results', () => {
    test.beforeEach(async ({ page }) => {
        await page.evaluate(() => {
            $.setHtml(document.body,
                '<label for="tags">Fruit</label><select id="tags" multiple class="input-outline">' +
                '<option value="Apple" selected>Apple label</option></select>',
            );
            window.requests = [];
            window.getResults = (request) => {
                let resolve;
                let reject;
                const promise = new Promise((success, failure) => {
                    resolve = success;
                    reject = failure;
                });
                const entry = { request, resolve, reject, cancelled: false };
                promise.cancel = () => entry.cancelled = true;
                window.requests.push(entry);
                return promise;
            };
        });
    });

    test.describe('responses', () => {
        test('hides suggestions for an empty response', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                debounce: 0, minSearch: 0, getResults: () => ({ results: [] }),
            }).show());
            await expect(page.getByRole('option')).toHaveCount(0);
            await expect(page.getByRole('listbox')).toBeHidden();
        });

        test('normalizes and deduplicates primitive results', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                debounce: 0, minSearch: 0, getResults: () => ({ results: [0, 'Banana', 'Banana', null, undefined] }),
            }).show());
            await expect(page.getByRole('option')).toHaveText(['0', 'Banana']);
            await page.getByRole('option', { name: '0', exact: true }).click();
            await expect(page.locator('#tags')).toHaveValues(['Apple', '0']);
        });

        test('shows loading until the request resolves and omits an empty term', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                debounce: 0, minSearch: 0, getResults: window.getResults,
            }).show());
            await expect(page.getByRole('status')).toHaveText('Loading..');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            expect(await page.evaluate(() => window.requests[0].request.offset)).toBe(0);
            expect(await page.evaluate(() => Object.hasOwn(window.requests[0].request, 'term'))).toBe(false);
            await page.evaluate(() => window.requests[0].resolve({ results: ['Banana'] }));
            await expect(page.getByRole('option')).toHaveText(['Banana']);
            await expect(page.getByRole('status')).toHaveCount(0);
        });
    });

    test.describe('errors and retry', () => {
        for (const failure of ['throw', 'reject', 'malformed']) {
            test(`shows an error after a search ${failure} and allows retry`, async ({ page }) => {
                await page.evaluate((failure) => {
                    let first = true;
                    UI.TagsInput.init($.findOne('#tags'), {
                        debounce: 0,
                        getResults: () => {
                            if (first) {
                                first = false;
                                if (failure === 'throw') {
                                    throw new Error('Unavailable');
                                }
                                if (failure === 'reject') {
                                    return Promise.reject(new Error('Unavailable'));
                                }
                                return { results: 'Invalid' };
                            }
                            return { results: ['Banana'] };
                        },
                    });
                }, failure);
                await page.getByRole('combobox').fill('bad');
                await expect(page.getByRole('status')).toHaveText('Error loading data.');
                await page.getByRole('combobox').fill('Banana');
                await expect(page.getByRole('option')).toHaveText(['Banana']);
                await expect(page.getByRole('status')).toHaveCount(0);
            });
        }
    });

    test.describe('cancellation', () => {
        test('cancels the previous search and ignores stale responses', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                getResults: window.getResults, debounce: 0,
            }));
            await page.getByRole('combobox').fill('old');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.getByRole('combobox').fill('new');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            expect(await page.evaluate(() => window.requests[1].request.offset)).toBe(0);
            expect(await page.evaluate(() => window.requests[1].request.term)).toBe('new');
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
            await page.evaluate(() => {
                window.requests[1].resolve({ results: ['New'] });
                window.requests[0].resolve({ results: ['Old'], showMore: true });
            });
            await expect(page.getByRole('option')).toHaveText(['New']);
        });

        test('ignores stale rejection while the latest search remains loading', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                getResults: window.getResults, debounce: 0,
            }));
            await page.getByRole('combobox').fill('old');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.getByRole('combobox').fill('new');
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(2);
            await page.evaluate(() => window.requests[0].reject(new Error('Stale')));
            await expect(page.getByRole('status')).toHaveText('Loading..');
            await page.evaluate(() => window.requests[1].resolve({ results: ['New'] }));
            await expect(page.getByRole('option')).toHaveText(['New']);
        });

        for (const method of ['hide', 'dispose', 'disable']) {
            test(`cancels pending work on ${method} and ignores its result`, async ({ page }) => {
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                    getResults: window.getResults, debounce: 0, minSearch: 0,
                }).show());
                await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
                await page.evaluate((method) => {
                    $('#tags').tagsinput(method);
                    window.requests[0].resolve({ results: ['Late'] });
                }, method);
                await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
                expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
            });
        }

        test('preserves thenable cancellation and tolerates a throwing cancel callback', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                debounce: 0, minSearch: 0,
                getResults: () => ({
                    then(resolve) {
                        window.requests.push({ resolve, cancelled: false });
                    },
                    cancel() {
                        window.requests[0].cancelled = true;
                        throw new Error('Cancellation failed');
                    },
                }),
            }).show());
            await expect.poll(() => page.evaluate(() => window.requests.length)).toBe(1);
            await page.evaluate(() => {
                $('#tags').tagsinput('hide');
                window.requests[0].resolve({ results: ['Late'] });
            });
            await expect(page.locator('.tagsinput-menu')).toHaveCount(0);
            expect(await page.evaluate(() => window.requests[0].cancelled)).toBe(true);
        });
    });

    test.describe('pagination', () => {
        test.use({ mockClock: true });

        test('uses raw offsets while deduplicating results across pages', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                getResults: window.getResults, debounce: 0, minSearch: 0, maxHeight: '40px',
            }).show());
            await page.clock.runFor(1);
            await page.evaluate(() => window.requests[0].resolve({ results: ['Apple', 'Apple', 'Banana'], showMore: true }));
            await expect(page.getByRole('option')).toHaveText(['Apple', 'Banana']);
            await page.getByRole('listbox').evaluate((node) => {
                node.scrollTop = node.scrollHeight;
                node.dispatchEvent(new Event('scroll'));
                node.dispatchEvent(new Event('scroll'));
            });
            await page.clock.runFor(251);
            expect(await page.evaluate(() => window.requests.length)).toBe(2);
            expect(await page.evaluate(() => window.requests[1].request.offset)).toBe(3);
            await page.evaluate(() => window.requests[1].resolve({ results: ['Banana', 'Cherry'] }));
            await expect(page.getByRole('option')).toHaveText(['Apple', 'Banana', 'Cherry']);
        });

        test.describe('automatic pagination', () => {
            test('fills a short menu and stops when an empty page claims more results', async ({ page }) => {
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                    getResults: window.getResults, debounce: 0, minSearch: 0,
                }).show());
                await page.clock.runFor(1);
                await page.evaluate(() => window.requests[0].resolve({ results: ['Banana'], showMore: true }));
                await page.clock.runFor(251);
                expect(await page.evaluate(() => window.requests.length)).toBe(2);
                expect(await page.evaluate(() => window.requests[1].request.offset)).toBe(1);
                await page.evaluate(() => window.requests[1].resolve({ results: [], showMore: true }));
                await page.clock.runFor(1000);
                await expect(page.getByRole('option')).toHaveText(['Banana']);
                expect(await page.evaluate(() => window.requests.length)).toBe(2);
            });
        });
    });

    test.describe('debounce', () => {
        test.use({ mockClock: true });

        test('coalesces rapid typing into one request for the latest term', async ({ page }) => {
            await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                getResults: window.getResults, debounce: 250,
            }));
            await page.getByRole('combobox').fill('B');
            await page.getByRole('combobox').fill('Ba');
            await page.getByRole('combobox').fill('Banana');
            await page.clock.runFor(249);
            expect(await page.evaluate(() => window.requests.length)).toBe(0);
            await page.clock.runFor(1);
            expect(await page.evaluate(() => window.requests.length)).toBe(1);
            expect(await page.evaluate(() => window.requests[0].request.term)).toBe('Banana');
        });

        for (const action of ['clear', 'hide', 'dispose']) {
            test(`cancels a queued search on ${action}`, async ({ page }) => {
                await page.evaluate(() => UI.TagsInput.init($.findOne('#tags'), {
                    getResults: window.getResults, debounce: 250,
                }));
                await page.getByRole('combobox').fill('Banana');
                if (action === 'clear') {
                    await page.getByRole('combobox').fill('');
                } else {
                    await page.evaluate((action) => $('#tags').tagsinput(action), action);
                }
                await page.clock.runFor(1000);
                expect(await page.evaluate(() => window.requests.length)).toBe(0);
            });
        }
    });
});
