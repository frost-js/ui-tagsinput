/**
 * Normalizes a selection limit to a nonnegative integer.
 * @param {number} value The requested limit.
 * @returns {number} The limit, or zero for unlimited selections.
 */
export function normalizeLimit(value) {
    const number = Number(value);

    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

/**
 * Normalizes text for case- and accent-insensitive matching and sorting.
 * @param {string} value The text.
 * @returns {string} The normalized text.
 */
export function normalizeText(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * Copies scalar or array values into unique strings, excluding nullish values.
 * @param {string|number|(string|number)[]|null|undefined} value The values.
 * @param {boolean} [trim=false] Whether to trim each value.
 * @returns {string[]} The normalized values.
 */
export function normalizeValues(value, trim = false) {
    const values = Array.isArray(value) ? value : [value];

    return [...new Set(values
        .filter((entry) => entry !== null && entry !== undefined)
        .map((entry) => trim ? String(entry).trim() : String(entry)))];
}
