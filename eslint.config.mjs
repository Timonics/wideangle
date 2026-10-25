import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * Flat ESLint config.
 *
 * `eslint-config-next` v16 ships native flat configs, so there is no
 * need for `FlatCompat` — and using it here produced a
 * "Converting circular structure to JSON" crash from
 * `@eslint/eslintrc` when the react plugin's config object was
 * validated.
 */
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...coreWebVitals,
  ...typescript,
];

export default eslintConfig;
