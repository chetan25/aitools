# Architecture

## Overview

@aitools is a three-layer security and rendering platform:

1. **Guard Layer**: Static analysis for prompt injection detection (AST-level)
2. **Cluster Layer**: Concurrent rendering and orchestration (Tokio + Puppeteer)
3. **Studio Layer**: IDE integration and developer experience (VS Code extension)

This document outlines the design, threat model, and performance characteristics.

---

## Guard: AST-Level Prompt Injection Detection

### Design Philosophy

Guard operates at the **Abstract Syntax Tree (AST)** level, before code execution. This provides:

- **Zero Runtime Overhead**: Analysis happens at build/lint time
- **Deterministic Results**: No false negatives due to dynamic execution
- **Type-Safe Rules**: Rust-backed detection engines

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Source Code                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    TypeScript/JavaScript Parser    │
        │    (via SWC/Babel)                 │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    Rust Detection Engine           │
        │    • Template Injection Rules      │
        │    • Function Argument Validation  │
        │    • Model Input Sanitization      │
        │    • Context Escape Analysis       │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    ESLint / SWC Output             │
        │    (violations with line refs)     │
        └────────────────────────────────────┘
```

### Detection Rules (Examples)

**Rule: Unsanitized Model Input**
```rust
// ❌ UNSAFE: Direct user input to LLM
const response = await openai.chat.completions.create({
  messages: [{ role: "user", content: userInput }]
});

// ✅ SAFE: Validated and typed input
const sanitized = sanitizePrompt(userInput);
const response = await openai.chat.completions.create({
  messages: [{ role: "user", content: sanitized }]
});
```

**Rule: Template String Injection**
```rust
// ❌ UNSAFE: Template concatenation
const prompt = `Extract data from: ${userUrl}`;

// ✅ SAFE: Parameterized
const prompt = createPrompt("Extract data from: {url}", { url: userUrl });
```

**Rule: Prompt Override via Chained Calls**
```rust
// ❌ UNSAFE: Attacker controls system prompt
const system = `You are helpful. ${userContext}`;

// ✅ SAFE: System prompt is constant
const system = "You are a helpful assistant.";
const userMessage = ensureSafe(userContext);
```

### SWC Plugin Architecture

```
Source → SWC Parser → Rust Detection Engine
                              │
                              ├→ ESLint (lint-time)
                              ├→ SWC Transform (build-time)
                              └→ Runtime Warning Injector
```

---

## Cluster: Concurrent Rendering Engine

### Design Philosophy

Cluster enables **large-scale distributed rendering** with:

- **10,000+ Concurrent Browsers**: Tokio-based async runtime
- **Fault Tolerance**: Automatic recovery, exponential backoff
- **Resource-Aware Scheduling**: Intelligent batching and prioritization
- **Real-Time Telemetry**: Prometheus metrics for production visibility

### Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     Client Application                        │
│              (Batch URLs, JavaScript, Configuration)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │  Cluster Coordinator (Tokio Async)    │
        │  • Load Balancer                      │
        │  • Task Queue Manager                 │
        │  • Resource Allocator                 │
        └───────────────┬───────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │ Worker 1   │ │ Worker 2   │ │ Worker N   │
    │ (Puppeteer)│ │ (Puppeteer)│ │ (Puppeteer)│
    │ Pages: 50  │ │ Pages: 50  │ │ Pages: 50  │
    └────────────┘ └────────────┘ └────────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │    Results Aggregator                 │
        │    (Failures, Retries, Metrics)       │
        └───────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │    Client Results (JSON/Stream)       │
        │    • Rendered Content                 │
        │    • Screenshots                      │
        │    • Performance Metrics              │
        └───────────────────────────────────────┘
```

### Concurrency Model

**Tokio Runtime**:
- Event-driven, non-blocking I/O
- M:N thread scheduling (thousands of tasks per OS thread)
- Zero-copy streaming of results

**Puppeteer Integration**:
- Chrome DevTools Protocol (CDP) over WebSocket
- Page pooling with LRU eviction
- Automatic cleanup on connection loss

### Performance Guarantees

| Metric | Target | Notes |
|--------|--------|-------|
| **p50 latency** | 200ms | Single page render |
| **p99 latency** | 500ms | Including network jitter |
| **Throughput** | 100K+ pages/hour | Clustered across nodes |
| **Memory/Page** | 50-100 MB | Shared process overhead amortized |
| **Fault Recovery** | <5s | Auto-reconnect + retry |

### Retry Strategy

```rust
// Exponential backoff with jitter
const backoff = min(100ms * 2^attempt, 30s) + random(0ms, 1s)

// Max retries: 3
// Retryable errors: network timeouts, connection drops
// Non-retryable: invalid URLs, permission errors
```

---

## Studio: IDE Integration

### Architecture

```
┌──────────────────────────────────────────────┐
│   VS Code Extension Host                     │
├──────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  │
│ │  Guard LSP Client                       │  │
│ │  Real-time inline diagnostics           │  │
│ │  Hover tooltips, quick fixes            │  │
│ └─────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────┐  │
│ │  Cluster Local Preview                  │  │
│ │  Spawn isolated Node process            │  │
│ │  Sandbox rendering, results webview     │  │
│ └─────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────┐  │
│ │  Terminal Integration                   │  │
│ │  npx @aitools/studio --preview          │  │
│ │  Live browser pool management           │  │
│ └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Security Threat Model

### Threat: Prompt Injection
**Guard Mitigation**: AST-level detection of unsanitized user input flowing to LLM calls.

### Threat: Remote Code Execution (Cluster)
**Mitigation**: 
- Sandboxed browser instances
- No direct host file system access
- Chromium security sandbox
- Network isolation options

### Threat: Denial of Service
**Mitigation**:
- Resource quotas per task
- Rate limiting on API endpoints
- Circuit breaker for cascading failures

### Threat: Data Leakage
**Mitigation**:
- In-memory result encryption (optional)
- Audit logging for compliance
- No persistent storage of rendered content

---

## Data Flow

```
Untrusted Input → Guard Analysis → Type-Safe Rendering → Cluster Execution → Results
     (Guard)         (ESLint/SWC)      (TypeScript)      (Tokio/Puppeteer)
```

---

## Extension Points

### Custom Guard Rules

```rust
// rules/my_rule.rs
pub struct MyRule;

impl Rule for MyRule {
    fn analyze(&self, ast: &Program) -> Vec<Violation> {
        // Custom detection logic
    }
}
```

### Cluster Plugins

```typescript
// plugins/custom-handler.ts
export class CustomHandler implements ClusterPlugin {
  async onPageCreated(page: Page): Promise<void> {
    // Custom initialization
  }
  
  async onResultComplete(result: RenderResult): Promise<void> {
    // Post-processing
  }
}
```

---

## Performance Benchmarks

### Guard

| Operation | Time | Notes |
|-----------|------|-------|
| Parse + analyze 10K LOC | 50ms | SWC parser + Rust engine |
| ESLint on CI | 200ms | Full monorepo lint pass |
| SWC plugin transform | 100ms | Build integration, no overhead |

### Cluster

| Operation | Time | Notes |
|-----------|------|-------|
| Launch 1K pages | 10s | Parallel browser pool initialization |
| Render 1K pages | 45s | Network variability, 100 concurrent |
| Recover from crash | 3s | Auto-reconnect + re-render |

---

## Future Roadmap

### Guard v2 (Q3 2026)
- Runtime interception (Babel plugin for dev-time catch)
- Llama inference engine (on-device models for validation)
- GitHub integration (PR auto-blocking on violations)

### Cluster v2 (Q4 2026)
- Multi-region orchestration
- WebAssembly rendering (WASM-based browser engine)
- Advanced scheduling (ML-based resource prediction)

### Studio v2 (2027)
- Debugger integration
- Performance profiler
- Team collaboration dashboard

---

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and guidelines.

