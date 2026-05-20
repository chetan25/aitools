# CLAUDE.md — Implementation Rules for @aitools

This file governs how Claude Code agents implement features for @aitools. All agents must follow these rules.

---

## General Principles

1. **Explicit over implicit** — Show constraints, limitations, and trade-offs in code comments
2. **Test-driven** — Write tests before or alongside implementation
3. **Production-ready** — Ship code that could go to production today (security, error handling, logging)
4. **Realistic over aspirational** — Targets and benchmarks must be achievable in practice

---

## Guard: ESLint Rule Implementation

### MVP Scope (Week 1–2)

**What to build:**
- [ ] ESLint rule detecting unsafe prompt patterns
- [ ] Require explicit `aiGuard.safe` wrapper for safety
- [ ] CLI validator for scanning codebases
- [ ] 40+ test cases covering pass/fail scenarios

**What NOT to build (Phase 2):**
- ❌ SWC plugin (ESLint-only for MVP)
- ❌ Data flow analysis (too complex)
- ❌ Python port (defer to v0.2)
- ❌ Backend runtime middleware (ESLint is sufficient)

### Detection Approach

**Guard MVP uses explicit allowlist pattern, NOT semantic analysis:**

```typescript
// ❌ FLAGGED: Unsanitized template literal
const prompt = `You are helpful. User said: ${userMessage}`;

// ✅ SAFE: Wrapped in aiGuard.safe
const prompt = aiGuard.safe`You are helpful. User said: ${userMessage}`;

// ✅ SAFE: Constant string (no variables)
const systemPrompt = "You are a helpful assistant.";
```

**Why:** AST can't determine if `sanitizePrompt()` actually works. Require developers to explicitly mark safe patterns.

### File Structure

```
packages/@aitools/guard/
├── src/
│   ├── index.ts              ← ESLint plugin entry point
│   ├── rules/
│   │   └── unsafe-prompt.ts  ← Main rule logic
│   └── utils/
│       └── ast-helpers.ts    ← Template literal detection
├── tests/
│   ├── rules/
│   │   └── unsafe-prompt.test.ts
│   └── fixtures/
│       ├── safe-patterns.ts
│       └── unsafe-patterns.ts
├── package.json
├── README.md
└── .eslintrc.json            ← Testing config
```

### Rule API

**Rule exports:**
```typescript
export default {
  rules: {
    'unsafe-prompt': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Detect unsanitized user input to AI models',
          recommended: true
        }
      },
      create(context) {
        // Detection logic here
      }
    }
  }
};
```

### Allowed SDK Methods

Guard should detect these SDK calls (not "any SDK"):
```typescript
const SDK_METHODS = [
  'anthropic.messages.create',
  'openai.chat.completions.create',
  'vercelAI.generateText',
];
```

**Rationale:** Start narrow, expand based on feedback. Better to miss 1% than flag 30% false positives.

### Test Requirements

Minimum 40 test cases:

**Safe patterns (should NOT flag):**
- Template literals with only constants
- Variables wrapped in `aiGuard.safe\`\``
- System prompts (no variables)
- Comments (ignored)
- Strings in non-SDK contexts

**Unsafe patterns (SHOULD flag):**
- Template literal with unvalidated variable: `` `...${userInput}...` ``
- String concatenation with variables: `"prompt: " + userVar`
- Nested template literals
- Variables passed to SDK methods without wrapper

**Edge cases:**
- Arrow functions returning unsafe prompts
- Async/await with template literals
- Object shorthand with unsafe templates

### Performance Requirements

- ESLint rule on 10K LOC: < 100ms
- CLI scan on 100K LOC: < 500ms

### Configuration Support

Minimal config (can be expanded later):
```typescript
// .eslintrc.json
{
  "rules": {
    "@aitools/guard/unsafe-prompt": [
      "error",
      {
        "allowedSDKs": ["anthropic", "openai"],
        "allowSafePattern": "aiGuard.safe"  // Only this pattern is safe
      }
    ]
  }
}
```

---

## Cluster: Concurrent Rendering Engine

### MVP Scope (Week 3–6)

**What to build:**
- [ ] Tokio async runtime + browser pool
- [ ] Puppeteer bindings (napi-rs)
- [ ] 50–100 concurrent browsers (NOT 10K)
- [ ] Realistic performance benchmarks
- [ ] Graceful failure recovery

**What NOT to build (Phase 2):**
- ❌ Multi-region orchestration
- ❌ Advanced ML-based scheduling
- ❌ WASM rendering engine
- ❌ Team dashboard / analytics

### Realistic Performance Targets

**DO NOT aim for:**
- ❌ p50 latency 200ms (unrealistic with JS execution)
- ❌ p99 latency 500ms (ignores network variance)
- ❌ 100K+ pages/hour (impossible with single instance)

**Aim for instead:**
- ✅ p50 latency 300–400ms (realistic)
- ✅ p99 latency 1–2 seconds (acknowledges outliers)
- ✅ 50K+ pages/hour (achievable, impressive)
- ✅ 50–100 concurrent browsers per instance
- ✅ <5s failure recovery

### Architecture

Single-instance coordinator with worker pool:

```
Client → Task Queue → Coordinator (Tokio) → Browser Pool (50–100 instances) → Results
```

**Not:**
```
❌ Multi-region with global load balancer (save for v2)
❌ 10,000 concurrent browsers (unrealistic memory)
❌ ML-based scheduling (too complex)
```

### Browser Pool Lifecycle

```rust
// Pool size: 50–100 (NOT 10K)
const POOL_SIZE = 50;

// Page lifecycle:
// 1. Acquire browser from pool (LRU eviction if needed)
// 2. Create page within browser
// 3. Navigate to URL
// 4. Wait for render complete (with timeout: 30s)
// 5. Return page to pool
// 6. On error: evict browser, respawn
```

### Retry Strategy

Exponential backoff with jitter:

```rust
const MAX_RETRIES = 3;

fn backoff(attempt: u32) -> Duration {
  let ms = (100 * 2_u32.pow(attempt)).min(30_000);
  let jitter = random(0..1_000);
  Duration::from_millis(ms + jitter)
}
```

**Retryable errors:**
- Network timeout
- Connection reset
- Browser crash

**Non-retryable:**
- Invalid URL (400–404)
- Permission denied
- Content policy violation

### Failure Modes

**Circuit breaker:**
```rust
// If >80% of tasks fail in 10s window:
// 1. Stop accepting new tasks
// 2. Return 429 (Too Many Requests)
// 3. Wait 30s, then retry
// 4. Log incident for debugging
```

### API Surface

CLI:
```bash
npx @aitools/cluster screenshot \
  --input urls.txt \
  --output screenshots/ \
  --workers 50 \
  --timeout 30000
```

Node API:
```typescript
import { Cluster } from '@aitools/cluster';

const cluster = new Cluster({ workers: 50 });
const results = await cluster.screenshot([
  { url: 'example.com', viewport: { width: 1200, height: 800 } }
]);
```

### File Structure

```
packages/@aitools/cluster/
├── src/
│   ├── index.ts              ← Node.js entry point
│   ├── coordinator.ts        ← Task queue + load balancing
│   ├── pool.ts               ← Browser pool manager
│   └── native/
│       ├── lib.rs            ← Rust code
│       └── Cargo.toml
├── tests/
│   ├── coordinator.test.ts
│   └── pool.test.ts
├── package.json
└── README.md
```

### Test Requirements

- [ ] Browser pool scaling: 10 → 50 → 100 browsers
- [ ] Failure recovery: crash 1 browser, auto-respawn
- [ ] Timeout handling: page hangs, kill after 30s
- [ ] Retry logic: fail once, succeed on retry
- [ ] Metrics: track latency, throughput, errors

### Benchmarks (Honest)

```
Single browser:     300–500ms per page (with network)
50 concurrent:      6–8 seconds for 1000 pages
100 concurrent:     3–4 seconds for 1000 pages
Failure recovery:   <5 seconds
Memory per browser: 50–100MB (realistic)
```

---

## Studio: VS Code Extension (DEFER TO v0.2)

**Reason:** Guard + Cluster MVP are simpler, higher ROI.

**v0.2 scope:** Real-time Guard diagnostics in editor + Cluster preview pane

---

## Cross-Cutting Concerns

### Logging

Use structured logging (JSON):
```typescript
logger.info({
  type: 'rule_violation',
  file: 'src/api.ts',
  line: 42,
  pattern: 'unsafe_template_literal',
  violation: 'unvalidated user input'
});
```

### Error Handling

Never swallow errors silently:
```typescript
try {
  // implementation
} catch (err) {
  logger.error({ error: err, context: 'function_name' });
  throw new Error(`Meaningful message: ${err.message}`);
}
```

### Documentation

Every public function needs:
- JSDoc comment
- Input/output types
- Example usage

### Security

- No hardcoded secrets
- No eval or dynamic `require()`
- Input validation on all external APIs

---

## Git Commit Format

Use conventional commits:
```
feat(guard): initial ESLint rule for prompt injection
fix(cluster): handle browser crashes gracefully
docs(architecture): clarify realistic performance targets
```

---

## Code Review Checklist

Before pushing:
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No security warnings (`npm audit`)
- [ ] Types compile (`tsc --noEmit`)
- [ ] Performance acceptable (benchmarks in PR)
- [ ] Error handling present (no silent failures)
- [ ] Documentation updated (README, comments)

---

## Deployment

### npm Publishing

Tagged releases auto-publish via GitHub Actions:
```bash
git tag @aitools/guard@0.1.0
git push --tags
# GitHub Actions runs, publishes to npm
```

### Pre-Release Testing

```bash
npm pack
npm install -g ./aitools-guard-0.1.0.tgz
# Manual testing before release
```

---

## Questions?

If implementation hits constraints not covered here:
1. **Ask first** (document the decision)
2. **Prefer narrow scope** over feature creep
3. **Honest over aspirational** (realistic targets beat hype)
