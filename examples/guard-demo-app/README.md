# Guard ESLint Rule - Comprehensive Demo App

This directory contains a comprehensive demo application that tests the Guard ESLint rule against all edge cases and scenarios defined in the CLAUDE.md specification.

## Overview

The Guard ESLint rule detects unsanitized user input passed to AI model SDKs, preventing prompt injection vulnerabilities. This demo app validates that the rule correctly:

- Allows safe patterns (constants, aiGuard.safe wrapped templates)
- Flags unsafe patterns (unvalidated variables in templates/concatenation)
- Handles edge cases (nested templates, async/await, complex scenarios)
- Detects usage across multiple AI SDKs (Anthropic, OpenAI, Vercel AI)

## Directory Structure

```
guard-demo-app/
├── src/
│   ├── safe-examples.ts       # Patterns that SHOULD NOT flag
│   ├── unsafe-examples.ts     # Patterns that SHOULD flag
│   └── edge-cases.ts          # Complex scenarios and false positive tests
├── tests/
│   └── demo.test.ts           # Test runner validating Guard detection
├── .eslintrc.json             # Guard rule configured in strict mode
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Features Tested

### Safe Patterns (No Violations Expected)

1. Constant strings - No variables in templates
2. aiGuard.safe wrapped - Explicitly marked as safe
3. System prompts - Static instructions
4. Non-SDK contexts - Templates not passed to AI SDKs
5. Complex safe scenarios - Arrow functions, async/await, object shorthand

Example:
```typescript
// SAFE: Wrapped in aiGuard.safe
const prompt = aiGuard.safe`You are helpful. User said: ${userMessage}`;
```

### Unsafe Patterns (Violations Expected)

1. Direct template literals - Unvalidated variables
2. String concatenation - Variables concatenated with strings
3. Nested templates - Multiple levels of unvalidated input
4. Arrow functions - Returning unsafe prompts
5. Async/await - Unsafe templates in async contexts
6. Object shorthand - Unsafe values in object literals

Example:
```typescript
// UNSAFE: Unvalidated variable in template
anthropic.messages.create({
  prompt: `You are helpful. User said: ${userMessage}`
});
```

### Edge Cases

- Nested template literals
- Multiple SDK variations
- Reassigned SDK references
- Function indirection
- Conditional expressions with mixed safety
- Type annotations and escape sequences

## Getting Started

### Installation

```bash
cd /tmp/aitools/examples/guard-demo-app
pnpm install
```

### Build

```bash
npm run build
```

### Run ESLint

```bash
npm run lint
```

#### Generate JSON Report

```bash
npm run lint:json
```

### Run Tests

```bash
npm test
```

### Run Full Demo

```bash
npm run demo
```

## Expected Results

- safe-examples.ts: 0 violations
- unsafe-examples.ts: 20+ violations
- edge-cases.ts: 10+ violations

## File Descriptions

### src/safe-examples.ts
Contains 15+ safe patterns that should NOT trigger violations.
Expected violations: 0

### src/unsafe-examples.ts
Contains 20+ unsafe patterns that SHOULD trigger violations.
Expected violations: 20+

### src/edge-cases.ts
Contains 25+ complex scenarios testing precision.
Expected violations: 10+

### tests/demo.test.ts
Jest test suite validating Guard behavior across all scenarios.

## License

MIT
