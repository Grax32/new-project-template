# Shared Models

This folder contains pure TypeScript interfaces and types that are shared between the API and web applications.

## Rules

1. **No External Dependencies**: Models should NOT import anything from outside this folder
2. **Pure Data Structures**: Only interfaces, types, and enums - no classes with logic
3. **Self-Contained**: Each model file should be independent
4. **No Framework Dependencies**: No Angular, NestJS, or any framework-specific code

## Usage

Import models in your apps:

```typescript
import { User } from '@shared/models';
```

## Adding New Models

1. Create a new `.model.ts` file in this folder
2. Define your interface/type
3. Export it in `index.ts`

Example:

```typescript
// product.model.ts
export interface Product {
    id: string;
    name: string;
    price: number;
}
```

Then add to `index.ts`:

```typescript
export * from './product.model';
```
