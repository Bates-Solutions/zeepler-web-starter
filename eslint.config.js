import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Label content can carry anything a forker puts on a label, so none of
      // it is logged: no console in the app at all.
      'no-console': 'error',
      // Nothing is ever parsed as HTML. React escapes what it renders; these
      // are the ways round that.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Do not render HTML from strings.',
        },
        {
          selector: 'MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Do not write HTML from strings.',
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: 'Do not write HTML from strings.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
);
