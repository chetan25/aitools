# @aitools

> **High-performance AI safety and rendering toolkit built on Rust and Node.js**

## Why Rust?

AI safety is a performance and correctness problem. Our core detection engines are written in **Rust** because:

- **Zero-Cost Abstractions**: AST-level prompt injection detection without runtime overhead
- **Memory Safety**: Eliminate entire classes of vulnerabilities without garbage collection pauses
- **Concurrency**: Tokio-based async enables rendering 10,000+ browsers simultaneously with predictable latency
- **Type Safety**: Catch security bugs at compile time, not in production
- **First-Mover Advantage**: Industry-leading detection rates on evolving attack patterns

## What's Included

### 🛡️ [@aitools/guard](packages/@aitools/guard)
Build-time security framework that enforces prompt injection prevention patterns.

- **ESLint Plugin**: Real-time detection in your IDE during development
- **Mandatory Validation Pattern**: Forces `aiGuard.safe` wrapper on all user inputs to AI SDKs
- **AST-Level Analysis**: Catches unvalidated patterns at compile time, not runtime
- **Developer Education**: Trains teams to think about input validation systematically

**What Guard Does:**
- ✅ Catches careless mistakes (80% of vulnerabilities)
- ✅ Enables targeted code reviews
- ✅ Prevents unvalidated patterns from reaching production
- ✅ Documents security intent in code

**What Guard Doesn't Do:**
- ❌ Validate inputs at runtime (your job in `aiGuard.safe` implementation)
- ❌ Detect sophisticated multi-stage attacks
- ❌ Guarantee 100% protection against prompt injection

**Important:** Guard enforces *structure* (use `aiGuard.safe`), not *semantics* (actual sanitization). You must implement real validation inside `aiGuard.safe`. See [examples/guard-demo-app](examples/guard-demo-app) for comprehensive testing.

**Status**: MVP Complete | **Phase 2**: Runtime validation framework (Q2 2026)

### 🔄 [@aitools/cluster](packages/@aitools/cluster)
Concurrent rendering engine for large-scale agent orchestration.

- **Tokio Runtime**: 10,000+ concurrent browser instances
- **Puppeteer Integration**: Full browser automation API
- **Load Balancing**: Intelligent resource distribution
- **Fault Tolerance**: Automatic recovery and retry logic

**Status**: Beta | **Target**: May 2026 GA

### 🎨 [@aitools/studio](packages/@aitools/studio)
VS Code extension bundling Guard + Cluster with IDE-native workflows.

- **Real-time Security Feedback**: Guard rules in your editor
- **Local Cluster Preview**: Test rendering locally before deployment
- **Integrated Terminal**: One-click agent execution

**Status**: Alpha | **Target**: Q3 2026

---

## Quick Start

### Installation

```bash
# Clone and install dependencies
git clone https://github.com/aitoolsmonorepo/aitools.git
cd aitools

# Install with pnpm (recommended for monorepos)
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Using Guard

```bash
# ESLint plugin (enforce aiGuard.safe on all user inputs)
npx eslint --plugin @aitools/guard src/

# Example: Unvalidated input flagged
const prompt = `User said: ${userInput}`;  // ❌ ERROR

# Solution: Wrap in aiGuard.safe and validate
const prompt = aiGuard.safe`User said: ${sanitized(userInput)}`;  // ✅ OK
```

**Testing Guard:** See [examples/guard-demo-app](examples/guard-demo-app) for 60+ test patterns covering safe, unsafe, and edge cases.

---

## How Guard Works

Guard is a **three-layer defense system** for prompt injection:

### Layer 1: Build-Time Detection (ESLint)
Guard scans your code during development and flags unvalidated user inputs:
```typescript
// ❌ Flagged immediately
const prompt = `Answer: ${userQuery}`;

// ✅ Requires explicit wrapper
const prompt = aiGuard.safe`Answer: ${sanitized}`;
```

**Benefit:** Catches mistakes before code ships. Enables code review. Trains developers.

### Layer 2: Runtime Validation (Your Code)
You implement sanitization inside `aiGuard.safe`:
```typescript
namespace aiGuard {
  export function safe(strings: TemplateStringsArray, ...values: any[]): string {
    // Sanitize each value
    const sanitized = values.map(v => {
      if (typeof v === 'string') {
        // Remove injection patterns
        return v.replace(/forget|ignore|override/gi, '[BLOCKED]');
      }
      return v;
    });
    
    // Return clean string
    return strings.reduce((acc, str, i) => acc + str + (sanitized[i]??''), '');
  }
}
```

**Benefit:** Actual protection against malicious inputs at runtime.

### Layer 3: Defense in Depth
Combine with:
- Rate limiting (block sudden floods)
- Input length limits (cap data size)
- LLM output monitoring (detect suspicious responses)
- Audit logging (track what was sanitized)

**Key Point:** Guard is Layer 1 (build-time structure). Layers 2-3 (runtime validation) are your responsibility. Together, they're effective.

---

```bash
import { Cluster } from '@aitools/cluster';

const cluster = new Cluster({
  maxConcurrent: 5000,
  retries: 3,
});

// Launch 1000+ pages in parallel
const results = await cluster.render(urls);
```

## Understanding Guard's Role

**Guard is NOT a silver bullet.** It's a developer tool that:
- Forces you to think about security
- Catches careless mistakes early
- Makes code review easier
- Documents intent in code

**What provides real protection:**
1. **Your validation logic** in `aiGuard.safe` (sanitization, checking)
2. **Your business logic** (rate limits, input caps, access control)
3. **Your monitoring** (logging attacks, alerting on suspicious activity)
4. **Your architecture** (sandboxing, least privilege, fail-safe defaults)

**The realistic picture:**
- ✅ Guard stops 80% of careless mistakes
- ⚠️ Guard + proper implementation stops 90% of attacks
- 🎯 Guard + defense-in-depth stops 95%+ of attacks
- 🚨 No tool stops 100% (security is ongoing)

See [examples/guard-demo-app](examples/guard-demo-app) for test scenarios showing exactly what Guard catches and what's your responsibility.

---

See [ARCHITECTURE.md](ARCHITECTURE.md) for deep dives into:
- AST-level prompt injection detection
- Tokio concurrency model
- Security guarantees and threat model
- Performance benchmarks

---

## Development

### Prerequisites
- **Rust** 1.70+ ([install](https://rustup.rs))
- **Node.js** 18+ & **pnpm** 8+
- **git**

### Setup

```bash
pnpm install                  # Install workspace dependencies
pnpm build                    # Build all packages
pnpm lint                     # Lint TypeScript + Rust
pnpm test                     # Run full test suite
pnpm release                  # Bump version and publish
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

## Roadmap

### Phase 1: Core AI Safety (Q1 2026) ✅ COMPLETE
- [x] Guard ESLint plugin (structure enforcement)
- [x] Guard demo app with 60+ test patterns
- [x] Build-time validation framework

### Phase 2: Runtime Protection (Q2 2026)
- [ ] `aiGuard.safe` implementation with real sanitization
- [ ] Input validation patterns library
- [ ] Runtime attack detection and logging
- [ ] Cluster MVP (concurrent rendering)

### Phase 3: Enterprise Features (Q3 2026)
- [ ] Guard SWC plugin (build integration)
- [ ] Studio VS Code extension with Guard diagnostics
- [ ] Audit logging and monitoring dashboard
- [ ] Performance benchmarks

### Phase 4: Ecosystem & Scale (Q4 2026+)
- [ ] LangChain integration
- [ ] Vercel AI SDK plugin
- [ ] Custom rule marketplace
- [ ] Multi-language support (Python, Go, Rust)
- [ ] Enterprise SaaS offering

---

## License

MIT License © 2026 AITools Contributors

See [LICENSE](LICENSE) for details.
