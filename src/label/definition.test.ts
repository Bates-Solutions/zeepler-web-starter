import { describe, it, expect } from 'vitest';
import {
  buildRequest,
  checkField,
  checkValues,
  exampleValues,
  fieldForPath,
  FIELDS,
  LABEL_DOTS,
} from './definition';

// The bounds zeepler's validator enforces on a request body (validate.mjs in
// the zeepler repo), restated so a change to the definition that the API would
// refuse fails here first.
const FONT = /^[A-Z0-9](,\d{1,4}(,\d{1,4})?)?$/;

function apiProblems(body: ReturnType<typeof buildRequest>['body']): string[] {
  const problems: string[] = [];
  if (body.config.size !== '4x2') problems.push('size');
  body.templates.forEach((t, i) => {
    const [x, y] = t.coords;
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
      problems.push(`${i}: coords not whole dots`);
    if (x >= LABEL_DOTS.width || y >= LABEL_DOTS.height) problems.push(`${i}: coords outside the label`);
    const value = body.data[t.dataPath];
    if (typeof value !== 'string') problems.push(`${i}: dataPath ${t.dataPath} not in data`);
    if (t.type === 'Text' && t.font !== undefined && !FONT.test(t.font)) problems.push(`${i}: font`);
    if (
      t.type === 'Text' &&
      t.maxLength !== undefined &&
      !(Number.isInteger(t.maxLength) && t.maxLength > 0)
    ) {
      problems.push(`${i}: maxLength`);
    }
    if (
      t.type === 'QRCode' &&
      !(Number.isInteger(t.magnification) && t.magnification >= 1 && t.magnification <= 10)
    ) {
      problems.push(`${i}: magnification`);
    }
  });
  return problems;
}

describe('the label definition', () => {
  it('builds a body the API accepts from the example values', () => {
    const { body } = buildRequest(exampleValues());
    expect(body.templates).toHaveLength(FIELDS.length);
    expect(apiProblems(body)).toEqual([]);
  });

  it('builds a body the API accepts with every field at its longest', () => {
    const longest = Object.fromEntries(
      FIELDS.map((f) => [
        f.id,
        f.input === 'integer'
          ? String(f.max)
          : f.input === 'url'
            ? `https://x.io/${'a'.repeat((f.maxLength ?? 20) - 13)}`
            : 'A'.repeat(f.maxLength ?? 1),
      ]),
    );
    expect(checkValues(longest)).toEqual({});
    expect(apiProblems(buildRequest(longest).body)).toEqual([]);
  });

  it('accepts the example values as they stand', () => {
    expect(checkValues(exampleValues())).toEqual({});
  });

  it('keeps each text field and its element to the same length', () => {
    for (const f of FIELDS) {
      if (f.element.type === 'Text' && f.element.maxLength !== undefined)
        expect(f.maxLength).toBe(f.element.maxLength);
    }
  });

  it('leaves an empty optional field off the label, and says which field each template is', () => {
    const { body, fieldFor } = buildRequest({ ...exampleValues(), description: ' ', productUrl: '' });
    expect(body.data).not.toHaveProperty('description');
    expect(body.templates.map((t) => t.dataPath)).toEqual(fieldFor);
    expect(fieldFor).toEqual(['itemName', 'sku', 'bin', 'quantity']);
  });

  it('prints the quantity with its label', () => {
    expect(buildRequest(exampleValues()).body.data.quantity).toBe('Qty 100');
  });

  it("maps the API's field paths back to inputs", () => {
    const { fieldFor } = buildRequest({ ...exampleValues(), description: '' });
    expect(fieldForPath('templates[1].dataPath', fieldFor)).toBe('sku');
    expect(fieldForPath('templates[3].coords', fieldFor)).toBe('quantity');
    expect(fieldForPath('data.bin', fieldFor)).toBe('bin');
    expect(fieldForPath('config.size', fieldFor)).toBeUndefined();
    expect(fieldForPath('templates[9].type', fieldFor)).toBeUndefined();
  });
});

describe('checking a field', () => {
  const field = (id: string) => FIELDS.find((f) => f.id === id)!;

  it.each([
    ['itemName', '', 'Item name is required.'],
    ['itemName', 'x'.repeat(19), 'Item name can be at most 18 characters.'],
    ['quantity', '1.5', 'Quantity must be a whole number.'],
    ['quantity', '-1', 'Quantity must be a whole number.'],
    ['quantity', '1000000', 'Quantity must be from 0 to 999999.'],
    ['productUrl', 'example.com', 'Product URL must be a web address starting https://.'],
    ['productUrl', 'javascript:alert(1)', 'Product URL must be a web address starting https://.'],
    ['sku', 'ÄBC', 'Use letters, digits and ordinary punctuation only.'],
  ])('%s %j: %s', (id, value, message) => {
    expect(checkField(field(id), value)).toBe(message);
  });

  it('lets an optional field be empty', () => {
    expect(checkField(field('description'), '')).toBeNull();
    expect(checkField(field('productUrl'), '')).toBeNull();
  });
});
