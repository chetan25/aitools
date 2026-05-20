# @aitools/guard

> **AST-level prompt injection detection for AI applications**

Static analysis security framework that detects prompt injection vulnerabilities at build-time, before code execution.

## Features

- 🛡️ **AST-Level Detection**: Catches injection patterns at parse time, not runtime
- ⚡ **Zero Runtime Overhead**: Operates during build/lint, with <50ms analysis on 10K LOC
- 🔧 **ESLint Plugin**: Real-time feedback in your IDE and CI/CD
- 📦 **SWC Plugin**: Seamless build integration (Next.js, Vite, etc.)
- 🎯 **Security-Focused Rules**: 50+ rules for common AI safety antipatterns
- 🚀 **First-Mover Advantage**: Industry-leading detection of evolving attack vectors

## Quick Start

### Installation

```bash
npm install --save-dev @aitools/guard
# or
pnpm add -D @aitools/guard
```

### ESLint Plugin

Add to `.eslintrc.json`:

```json
{
  "plugins": ["@aitools/guard"],
  "extends": ["plugin:@aitools/guard/recommended"],
  "rules": {
    "@aitools/guard/unsanitized-model-input": "error",
    "@aitools/guard/template-injection": "error",
    "@aitools/guard/prompt-override": "warn"
  }
}
```

Then run:

```bash
eslint src/ --plugin @aitools/guard
```

### SWC Plugin

In `next.config.js` or `swc.config.json`:

```javascript
{
  "jsc": {
    "experimental": {
      "plugins": [
        ["@aitools/guard/swc-plugin", {
          "mode": "error",      // "error" | "warn"
          "strict": true
        }]
      ]
    }
  }
}
```

## Detection Rules

### Core Rules (Enabled by Default)

| Rule | Detects | Example |
|------|---------|---------|
| `unsanitized-model-input` | Direct user input → LLM calls | `openai.createCompletion({ prompt: userInput })` |
| `template-injection` | Template string concatenation | `` `Extract: ${userUrl}` `` |
| `prompt-override` | Attacker-controlled system prompt | `const sys = `System: ${userContext}`;` |
| `dangerous-concatenation` | String concat to prompts | `prompt + userData` |
| `eval-in-prompt` | Dynamic code in LLM input | `eval(userCode)` → LLM |

### Security Rules

| Rule | Detects |
|------|---------|
| `no-hardcoded-secrets` | API keys in prompts |
| `sql-injection-risk` | SQL passed through LLM |
| `prompt-leakage` | System instructions exposed |
| `context-overflow` | Token limit bypass attempts |

### Extended Rules (Opt-In)

```json
{
  "rules": {
    "@aitools/guard/extended/no-jailbreak-patterns": "warn"
  }
}
```

## API Reference

### `analyze(code, options)`

Programmatic analysis:

```typescript
import { analyze } from '@aitools/guard';

const violations = await analyze(sourceCode, {
  strict: true,          // Enable strict mode
  rules: ['*'],          // Which rules to run
  ignorePatterns: [],    // Ignore certain files
});

for (const violation of violations) {
  console.log(`${violation.rule}: ${violation.message}`);
  console.log(`  at ${violation.loc.start.line}:${violation.loc.start.column}`);
}
```

### ESLint Plugin API

```typescript
import plugin from '@aitools/guard/eslint-plugin';

export default {
  plugins: { '@aitools/guard': plugin },
  rules: {
    '@aitools/guard/unsanitized-model-input': [
      'error',
      { checkAll: true, excludeFunctions: ['sanitizePrompt'] }
    ],
  },
};
```

## Performance

Benchmarks on typical codebases (M1 MacBook):

| Metric | Time | Scale |
|--------|------|-------|
| Parse + analyze | 45ms | 10K LOC |
| ESLint pass | 200ms | Full monorepo |
| Incremental rebuild | 15ms | Single file change |

## Roadmap

### Q2 2026
- [ ] 100+ detection rules
- [ ] Runtime interception (Babel plugin)
- [ ] GitHub PR integration

### Q3 2026
- [ ] Llama inference detection (on-device models)
- [ ] Custom rule builder UI
- [ ] Integration with security dashboards

### Q4 2026
- [ ] ML-based rule refinement
- [ ] Supply chain attack detection
- [ ] Enterprise licensing

## Threat Model

**In Scope**: Prompt injection at build/lint time

```typescript
// ❌ Detected
const response = await openai.createCompletion({
  prompt: `Answer: ${userInput}`
});
```

**Out of Scope**: Runtime injection (use runtime validation layers)

```typescript
// ✅ Safe (detected by Guard)
// Runtime validation ensures userInput is safe
const prompt = sanitizePrompt(userInput);
```

## Configuration

### .guardrc.json

```json
{
  "version": "1",
  "rules": {
    "unsanitized-model-input": "error",
    "template-injection": "error"
  },
  "excludePatterns": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts"
  ],
  "overrides": [
    {
      "files": ["src/legacy/**"],
      "rules": {
        "@aitools/guard/unsafe-pattern": "warn"
      }
    }
  ]
}
```

## FAQ

**Q: Why build-time analysis?**
A: Prompt injection is a logical vulnerability detectable at parse time. Analyzing the AST before execution gives us deterministic detection with zero runtime cost.

**Q: Does Guard prevent all injection attacks?**
A: No. Guard catches common antipatterns. Defense-in-depth requires runtime validation (use `@aitools/cluster` for secure rendering).

**Q: How often are rules updated?**
A: Rules are versioned independently. New attack patterns trigger minor version bumps. Subscribe to security advisories.

**Q: Can I disable rules?**
A: Yes, per-rule and per-file. See configuration above.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for dev setup and guidelines.

## License

MIT © AITools Contributors

## Support

- 📧 [Email](mailto:support@aitools.dev)
- 💬 [Discord](https://discord.gg/aitools)
- 📚 [Docs](https://github.com/aitoolsmonorepo/aitools/wiki)
