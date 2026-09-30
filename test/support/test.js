import process from 'node:process';
import { test as base, expect } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';
import { setupClock } from '../setup/browser.js';

const collectCoverage = process.env.FROST_UI_TAGSINPUT_COVERAGE === 'true';

const test = base.extend({
    mockClock: [false, { option: true }],
    uiPage: [
        async ({ page, mockClock }, use, testInfo) => {
            if (collectCoverage) {
                await page.coverage.startJSCoverage({ resetOnNavigation: false });
            }

            if (mockClock) {
                await setupClock(page);
            }

            await page.goto('/', { waitUntil: 'domcontentloaded' });
            await page.evaluate((_) => {
                if (!window.fQuery || !window.UI?.TagsInput ||
                    typeof window.fQuery.QuerySet.prototype.tagsinput !== 'function') {
                    throw new Error('Failed to initialize TagsInput on the test page.');
                }

                document.body.replaceChildren();
            });

            await page.waitForFunction((_) => {
                const node = document.createElement('div');
                node.className = 'tagsinput-menu text-center';
                document.body.append(node);

                const style = getComputedStyle(node);
                const ready = style.position === 'absolute' &&
                    style.textAlign === 'center';

                node.remove();
                return ready;
            });

            const errors = [];
            page.on('pageerror', (error) => errors.push(error));

            await use();

            expect(errors, 'Unexpected browser errors').toHaveLength(0);

            if (collectCoverage) {
                const coverage = await page.coverage.stopJSCoverage();
                await addCoverageReport(coverage, testInfo);
            }
        },
        { auto: true },
    ],
});

export { expect, test };
