# React, TypeScript & Framer Motion Guidelines

Follow these guidelines when coding React components with TypeScript and Framer Motion:

## 1. Type-Only Imports
When `verbatimModuleSyntax` is enabled in `tsconfig.json`, types must be imported using type-only import syntax. Do not mix type imports with value imports.
* **Incorrect**: `import { Transaction, helperFunc } from './types';`
* **Correct**: 
  ```typescript
  import { helperFunc } from './types';
  import type { Transaction } from './types';
  ```

## 2. Browser Timer Typings
Do not use `NodeJS.Timeout` to type client-side timers in React components, as the `NodeJS` global namespace does not exist in standard browser environments. Instead, use browser type utilities:
* **Incorrect**: `let interval: NodeJS.Timeout | null = null;`
* **Correct**: `let interval: ReturnType<typeof setInterval> | null = null;`

## 3. Framer Motion Transition Types
Framer Motion transition options check for specific literals (e.g., `'spring' | 'tween' | 'inertia'`). By default, TypeScript infers plain strings as generic type `string`, which fails type check constraints.
Always cast Framer Motion transition properties with `as const`:
* **Incorrect**: `transition={{ type: 'spring', stiffness: 100 }}`
* **Correct**: `transition={{ type: 'spring' as const, stiffness: 100 }}`

## 4. TSX Markup Attributes
Always use `className` instead of `class` on TSX markup tags.
* **Incorrect**: `<div class="card">`
* **Correct**: `<div className="card">`
