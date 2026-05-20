/**
 * SAFE EXAMPLES - These patterns SHOULD NOT flag violations
 *
 * This file demonstrates patterns that the Guard ESLint rule
 * should allow without warnings.
 */

// ============================================================================
// PATTERN 1: Constants (no variables)
// ============================================================================

const SYSTEM_PROMPT = "You are a helpful assistant that follows instructions carefully.";
const SAFE_TEMPLATE = "Please respond to the user question.";

function constantStringExample() {
  const prompt = "Always be respectful and honest in your responses.";
  return prompt;
}

// ============================================================================
// PATTERN 2: aiGuard.safe wrapped templates
// ============================================================================

namespace aiGuard {
  export function safe(strings: TemplateStringsArray, ...values: any[]): string {
    // In reality, this would perform validation/sanitization
    return strings.reduce((result, str, i) => result + str + (values[i] ?? ''), '');
  }
}

function safeWrappedTemplateExample(userMessage: string) {
  // ✅ SAFE: wrapped in aiGuard.safe
  const prompt = aiGuard.safe`You are helpful. User said: ${userMessage}`;
  return prompt;
}

function multipleVarsWrapped(name: string, query: string) {
  // ✅ SAFE: wrapped in aiGuard.safe with multiple variables
  const prompt = aiGuard.safe`Hello ${name}, here is your result for: ${query}`;
  return prompt;
}

// ============================================================================
// PATTERN 3: Non-SDK context templates
// ============================================================================

function nonSDKTemplate(userInput: string) {
  // ✅ SAFE: not passed to SDK, just local use
  const localMessage = `Processing: ${userInput}`;
  console.log(localMessage);
  return localMessage;
}

function nonSDKConcatenation(user: string) {
  // ✅ SAFE: string concatenation not in SDK context
  const localValue = "User: " + user;
  console.log(localValue);
  return localValue;
}

// ============================================================================
// PATTERN 4: System prompts with no variables
// ============================================================================

const SYSTEM_INSTRUCTIONS = `
You are an AI assistant designed to help with documentation.
You follow these rules:
1. Always cite sources
2. Be clear and concise
3. Avoid speculation
`;

function getSystemPrompt() {
  return SYSTEM_INSTRUCTIONS;
}

// ============================================================================
// PATTERN 5: Variables in safe contexts
// ============================================================================

function safeVariableUsage(fileName: string) {
  // ✅ SAFE: variable used in log, not SDK
  const logMessage = `File processed: ${fileName}`;
  console.log(logMessage);
  return logMessage;
}

function safeObjectConstruction(userId: string) {
  // ✅ SAFE: variable in object literal, not passed to SDK
  const metadata = {
    user: userId,
    timestamp: new Date().toISOString(),
  };
  return metadata;
}

// ============================================================================
// PATTERN 6: Wrapped function returns
// ============================================================================

function wrappedPromptFactory(topic: string): string {
  return aiGuard.safe`Generate content about: ${topic}`;
}

const wrappedArrowFunction = (question: string): string =>
  aiGuard.safe`Answer this question: ${question}`;

// ============================================================================
// PATTERN 7: Async/await with safe patterns
// ============================================================================

async function asyncSafePrompt(userQuery: string): Promise<string> {
  const systemPrompt = "You are helpful.";
  const safeUserPrompt = aiGuard.safe`User query: ${userQuery}`;
  
  // ✅ SAFE: awaited result passed to SDK
  return aiGuard.safe`${systemPrompt} ${safeUserPrompt}`;
}

async function asyncWithConstant(userId: string): Promise<void> {
  const SAFE_PREFIX = "Process user: ";
  const result = `${SAFE_PREFIX}${userId}`;
  console.log(result);
}

// ============================================================================
// PATTERN 8: Object shorthand with safe values
// ============================================================================

function objectShorthandSafe(title: string) {
  const safeTitle = aiGuard.safe`Title: ${title}`;
  
  // ✅ SAFE: shorthand with wrapped value
  return {
    safeTitle,
    constant: "static value",
  };
}

// ============================================================================
// PATTERN 9: Complex safe scenarios
// ============================================================================

function chainedSafeOperations(input: string) {
  const step1 = aiGuard.safe`First: ${input}`;
  const step2 = aiGuard.safe`Second: ${step1}`;
  return aiGuard.safe`Final: ${step2}`;
}

function conditionalSafePrompt(isAdmin: boolean, user: string) {
  const basePrompt = "Standard user prompt.";
  
  if (isAdmin) {
    return aiGuard.safe`Admin user: ${user}`;
  }
  
  return aiGuard.safe`Regular user: ${user}`;
}

// ============================================================================
// PATTERN 10: Multiple safe patterns in single function
// ============================================================================

function multiSafePatterns(
  userName: string,
  userQuestion: string,
  userId: string
) {
  const systemPrompt = "You are a helpful assistant.";
  
  const userGreeting = aiGuard.safe`Hello ${userName}`;
  const userQuery = aiGuard.safe`User asks: ${userQuestion}`;
  const metadata = aiGuard.safe`User ID: ${userId}`;
  
  return {
    system: systemPrompt,
    greeting: userGreeting,
    query: userQuery,
    metadata: metadata,
  };
}

// ============================================================================
// PATTERN 11: Safe in array/map contexts
// ============================================================================

function safeArrayOfPrompts(topics: string[]) {
  // ✅ SAFE: each mapped prompt is wrapped
  return topics.map(topic => aiGuard.safe`Discuss: ${topic}`);
}

function safePromptObject(users: Record<string, string>) {
  // ✅ SAFE: each prompt in object is wrapped
  return Object.entries(users).reduce(
    (acc, [id, name]) => ({
      ...acc,
      [id]: aiGuard.safe`User: ${name}`,
    }),
    {}
  );
}

// ============================================================================
// PATTERN 12: Safe with template nesting (both wrapped)
// ============================================================================

function nestedSafeTemplates(firstName: string, lastName: string) {
  // ✅ SAFE: both layers wrapped
  const name = aiGuard.safe`${firstName} ${lastName}`;
  return aiGuard.safe`User name is: ${name}`;
}

// ============================================================================
// PATTERN 13: Empty templates (no variables)
// ============================================================================

function emptyTemplates() {
  const empty = `This is a constant template`;
  const another = `No variables here`;
  
  return { empty, another };
}

// ============================================================================
// PATTERN 14: IIFE with safe pattern
// ============================================================================

const safeIIFE = (() => {
  const getPrompt = (input: string) => aiGuard.safe`Process: ${input}`;
  return getPrompt;
})();

// ============================================================================
// PATTERN 15: Class methods with safe patterns
// ============================================================================

class SafePromptGenerator {
  private prefix = "AI Response: ";
  
  generatePrompt(userInput: string): string {
    return aiGuard.safe`${this.prefix}${userInput}`;
  }
  
  generateSystemPrompt(): string {
    return "Standard system instructions.";
  }
  
  async asyncGenerate(query: string): Promise<string> {
    return aiGuard.safe`Async query: ${query}`;
  }
}

export {
  constantStringExample,
  safeWrappedTemplateExample,
  multipleVarsWrapped,
  nonSDKTemplate,
  nonSDKConcatenation,
  getSystemPrompt,
  safeVariableUsage,
  safeObjectConstruction,
  wrappedPromptFactory,
  wrappedArrowFunction,
  asyncSafePrompt,
  asyncWithConstant,
  objectShorthandSafe,
  chainedSafeOperations,
  conditionalSafePrompt,
  multiSafePatterns,
  safeArrayOfPrompts,
  safePromptObject,
  nestedSafeTemplates,
  emptyTemplates,
  safeIIFE,
  SafePromptGenerator,
};
