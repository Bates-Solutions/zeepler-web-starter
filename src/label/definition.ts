/**
 * The one label this app makes: a 4x2 warehouse bin label.
 *
 * This file is the whole label. The form is generated from `FIELDS`, and
 * `buildRequest` turns what was typed into the body `POST /v1/zeeplify` takes.
 * To make your own label, edit this file and nothing else.
 *
 * Each field becomes one entry in `data` (keyed by its `id`) and one element in
 * `templates` that prints it. The request format is documented at
 * https://zeepler.com/documentation.
 *
 * Coordinates are in dots at 203 dpi, from the top-left corner. Validation
 * cannot tell you that two elements overlap or that text runs off the edge,
 * because ZPL text does not wrap: print a label on real stock after changing
 * any of them.
 */

export const LABEL_SIZE = '4x2';
export const LABEL_DOTS = { width: 815, height: 406 } as const;

type TextElement = { type: 'Text'; coords: [number, number]; font?: string; maxLength?: number };
type BarCodeElement = { type: 'BarCode'; coords: [number, number]; style?: 'code128' | 'code93' | 'ean13' };
type QRCodeElement = { type: 'QRCode'; coords: [number, number]; magnification: number };
export type Element = TextElement | BarCodeElement | QRCodeElement;
export type Template = Element & { dataPath: string };

export interface Field {
  /** The key in `data`, and the input's name. */
  id: string;
  label: string;
  hint?: string;
  input: 'text' | 'integer' | 'url';
  required: boolean;
  /** For text and url inputs. Keep it in step with the element: text past it is cut off. */
  maxLength?: number;
  /** For integer inputs. */
  min?: number;
  max?: number;
  /** Characters allowed, for a barcode that cannot encode everything. */
  pattern?: { regex: RegExp; message: string };
  /** What the form starts with, so Generate works before anything is typed. */
  example: string;
  /** How the typed value is printed. Defaults to the value itself. */
  toData?: (value: string) => string;
  element: Element;
}

export const FIELDS: Field[] = [
  {
    id: 'itemName',
    label: 'Item name',
    input: 'text',
    required: true,
    // The QR code starts at x 600, so the text columns stop short of it.
    maxLength: 18,
    example: 'Hex bolt M8 x 40',
    element: { type: 'Text', coords: [30, 30], font: '0,50', maxLength: 18 },
  },
  {
    id: 'description',
    label: 'Description',
    input: 'text',
    required: false,
    maxLength: 32,
    example: 'Zinc plated, box of 100',
    element: { type: 'Text', coords: [30, 95], font: '0,28', maxLength: 32 },
  },
  {
    id: 'sku',
    label: 'SKU',
    hint: 'Printed as a Code 128 barcode.',
    input: 'text',
    required: true,
    maxLength: 20,
    // Code 128 subset B: printable ASCII.
    pattern: { regex: /^[\x20-\x7e]*$/, message: 'Use letters, digits and ordinary punctuation only.' },
    example: 'HB-M8-40-Z',
    element: { type: 'BarCode', coords: [30, 145], style: 'code128' },
  },
  {
    id: 'bin',
    label: 'Bin location',
    hint: 'Printed large, to read across an aisle.',
    input: 'text',
    required: true,
    maxLength: 12,
    example: 'A-04-03',
    element: { type: 'Text', coords: [30, 235], font: '0,60', maxLength: 12 },
  },
  {
    id: 'quantity',
    label: 'Quantity',
    input: 'integer',
    required: true,
    min: 0,
    max: 999999,
    example: '100',
    toData: (value) => `Qty ${value}`,
    element: { type: 'Text', coords: [30, 330], font: '0,40' },
  },
  {
    id: 'productUrl',
    label: 'Product URL',
    hint: 'Printed as a QR code on the right.',
    input: 'url',
    required: false,
    // A longer URL makes a bigger QR code, and past this it would run off the
    // right-hand edge at this position.
    maxLength: 60,
    example: 'https://example.com/p/HB-M8-40-Z',
    element: { type: 'QRCode', coords: [600, 30], magnification: 5 },
  },
];

export type Values = Record<string, string>;

export const exampleValues = (): Values => Object.fromEntries(FIELDS.map((f) => [f.id, f.example]));

/** Check one value against its field. Returns a message, or null when it is fine. */
export function checkField(field: Field, raw: string): string | null {
  const value = raw.trim();
  if (value === '') return field.required ? `${field.label} is required.` : null;
  if (field.maxLength !== undefined && value.length > field.maxLength) {
    return `${field.label} can be at most ${field.maxLength} characters.`;
  }
  if (field.input === 'integer') {
    if (!/^\d+$/.test(value)) return `${field.label} must be a whole number.`;
    const n = Number(value);
    if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
      return `${field.label} must be from ${field.min ?? 0} to ${field.max}.`;
    }
  }
  if (field.input === 'url') {
    let url: URL | null = null;
    try {
      url = new URL(value);
    } catch {
      // handled below
    }
    if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) {
      return `${field.label} must be a web address starting https://.`;
    }
  }
  if (field.pattern && !field.pattern.regex.test(value)) return field.pattern.message;
  return null;
}

/** Every field's problem, keyed by field id. Empty when the form can be sent. */
export function checkValues(values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of FIELDS) {
    const message = checkField(field, values[field.id] ?? '');
    if (message) errors[field.id] = message;
  }
  return errors;
}

export interface LabelRequest {
  config: { size: typeof LABEL_SIZE };
  data: Record<string, string>;
  templates: Template[];
}

/**
 * The request body for these values. An optional field left empty is left off
 * the label, so `fieldFor` says which field each template came from: a `400`
 * names a template by its index (`templates[3].dataPath`), and this is how that
 * error finds its way back to the right input.
 */
export function buildRequest(values: Values): { body: LabelRequest; fieldFor: string[] } {
  const data: Record<string, string> = {};
  const templates: Template[] = [];
  const fieldFor: string[] = [];

  for (const field of FIELDS) {
    const value = (values[field.id] ?? '').trim();
    if (value === '') continue;
    data[field.id] = field.toData ? field.toData(value) : value;
    templates.push({ ...field.element, dataPath: field.id });
    fieldFor.push(field.id);
  }

  return { body: { config: { size: LABEL_SIZE }, data, templates }, fieldFor };
}

/** The field an API error's `field` path points at, if it points at one. */
export function fieldForPath(path: string, fieldFor: string[]): string | undefined {
  // The API names a value problem by its template (`templates[2].dataPath`),
  // never by a path into `data`.
  const template = /^templates\[(\d+)\]/.exec(path);
  return template ? fieldFor[Number(template[1])] : undefined;
}
