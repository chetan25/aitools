/**
 * UNSAFE EXAMPLES - These patterns SHOULD flag violations
 *
 * This file demonstrates patterns that the Guard ESLint rule
 * should flag as security issues.
 */

// Mock SDK functions for demonstration
namespace anthropic {
  export namespace messages {
    export function create(params: any): any {
      return {};
    }
  }
}

namespace openai {
  export namespace chat {
    export namespace completions {
      export function create(params: any): any {
        return {};
      }
    }
  }
}

namespace vercelAI {
  export function generateText(params: any): any {
    return {};
  }
}

// ============================================================================
// PATTERN 1: Direct template literal with variable in SDK call
// ============================================================================

function unsafeDirectTemplate(userMessage: string) {
  // ❌ UNSAFE: unvalidated variable in template
  anthropic.messages.create({
    prompt: `You are helpful. User said: ${userMessage}`,
  });
}

function unsafeOpenAITemplate(userQuery: string) {
  // ❌ UNSAFE: unvalidated variable passed to OpenAI
  openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `User question: ${userQuery}`,
      },
    ],
  });
}

function unsafeVercelAITemplate(userInput: string) {
  // ❌ UNSAFE: unvalidated variable in Vercel AI
  vercelAI.generateText({
    prompt: `Process this: ${userInput}`,
  });
}

// ============================================================================
// PATTERN 2: String concatenation with variable in SDK call
// ============================================================================

function unsafeStringConcat(userText: string) {
  // ❌ UNSAFE: concatenation with variable
  anthropic.messages.create({
    prompt: "User input: " + userText,
  });
}

function unsafeConcatMultiple(name: string, query: string) {
  // ❌ UNSAFE: multiple variables concatenated
  anthropic.messages.create({
    prompt: "User " + name + " asked: " + query,
  });
}

function unsafeMixedConcat(prefix: string, userInput: string) {
  // ❌ UNSAFE: mixed concatenation
  const prompt = prefix + ` User said: ${userInput}`;
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 3: Variables assigned then passed to SDK
// ============================================================================

function unsafeVariableAssign(userMessage: string) {
  // ❌ UNSAFE: variable with template assigned, then used
  const prompt = `You are helpful. User: ${userMessage}`;
  
  anthropic.messages.create({ prompt });
}

function unsafeNestedAssign(userInput: string) {
  // ❌ UNSAFE: nested assignment
  const inner = `Inner: ${userInput}`;
  const outer = `Outer: ${inner}`;
  
  anthropic.messages.create({ prompt: outer });
}

// ============================================================================
// PATTERN 4: Arrow functions returning unsafe prompts
// ============================================================================

const unsafeArrow = (userMessage: string) => {
  // ❌ UNSAFE: arrow function returns unsafe template
  return anthropic.messages.create({
    prompt: `Message: ${userMessage}`,
  });
};

const unsafeArrowTemplate = (userInput: string) => `Direct: ${userInput}`;

function callUnsafeArrow(user: string) {
  const prompt = unsafeArrowTemplate(user);
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 5: Async/await with unsafe patterns
// ============================================================================

async function unsafeAsync(userQuery: string) {
  // ❌ UNSAFE: async template with unvalidated input
  const result = await anthropic.messages.create({
    prompt: `Async query: ${userQuery}`,
  });
  return result;
}

async function unsafeAsyncConcat(userInput: string) {
  // ❌ UNSAFE: async concatenation
  const prompt = "User: " + userInput;
  return await anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 6: Object shorthand with unsafe templates
// ============================================================================

function unsafeObjectShorthand(userMessage: string) {
  // ❌ UNSAFE: object shorthand with unsafe template
  const prompt = `User: ${userMessage}`;
  
  return anthropic.messages.create({
    prompt,
    temperature: 0.5,
  });
}

function unsafeObjectProperty(userInput: string) {
  // ❌ UNSAFE: computed property with unsafe template
  const params = {
    [`prompt_${Date.now()}`]: `Input: ${userInput}`,
  };
  
  anthropic.messages.create(params);
}

// ============================================================================
// PATTERN 7: Nested templates (both unsafe)
// ============================================================================

function unsafeNestedTemplates(firstName: string, lastName: string) {
  // ❌ UNSAFE: nested unvalidated templates
  const name = `${firstName} ${lastName}`;
  const prompt = `User: ${name}`;
  
  anthropic.messages.create({ prompt });
}

function deeplyNestedUnsafe(input1: string, input2: string) {
  // ❌ UNSAFE: multiple levels of nesting
  const level1 = `Level1: ${input1}`;
  const level2 = `Level2: ${level1}`;
  const level3 = `Level3: ${level2} ${input2}`;
  
  anthropic.messages.create({ prompt: level3 });
}

// ============================================================================
// PATTERN 8: Array/Map with unsafe templates
// ============================================================================

function unsafeArrayPrompts(topics: string[]) {
  // ❌ UNSAFE: each prompt has unvalidated variable
  const prompts = topics.map(topic => `Discuss: ${topic}`);
  
  prompts.forEach(prompt => {
    anthropic.messages.create({ prompt });
  });
}

function unsafePromptMap(users: Record<string, string>) {
  // ❌ UNSAFE: object values have unvalidated variables
  const prompts = Object.values(users).map(name => `User: ${name}`);
  return prompts;
}

// ============================================================================
// PATTERN 9: Function returning unsafe template
// ============================================================================

function getUnsafePrompt(userMessage: string): string {
  return `You are helpful. User: ${userMessage}`;
}

function callGetUnsafePrompt(user: string) {
  const prompt = getUnsafePrompt(user);
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 10: Conditional with unsafe templates
// ============================================================================

function unsafeConditional(isAdmin: boolean, user: string) {
  // ❌ UNSAFE: both branches have unsafe templates
  let prompt: string;
  
  if (isAdmin) {
    prompt = `Admin: ${user}`;
  } else {
    prompt = `User: ${user}`;
  }
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 11: Ternary with unsafe templates
// ============================================================================

function unsafeTernary(isVIP: boolean, userName: string) {
  // ❌ UNSAFE: ternary with unsafe templates on both sides
  const prompt = isVIP ? `VIP User: ${userName}` : `Regular: ${userName}`;
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 12: Template in array literal passed to SDK
// ============================================================================

function unsafeArrayLiteral(userMessage: string) {
  // ❌ UNSAFE: array with unsafe template
  anthropic.messages.create({
    messages: [
      {
        role: "user",
        content: `Message: ${userMessage}`,
      },
    ],
  });
}

// ============================================================================
// PATTERN 13: IIFE with unsafe pattern
// ============================================================================

const unsafeIIFE = ((userInput: string) => {
  // ❌ UNSAFE: IIFE returns unsafe template
  return `Process: ${userInput}`;
})("default");

// ============================================================================
// PATTERN 14: Class method with unsafe pattern
// ============================================================================

class UnsafePromptGenerator {
  generatePrompt(userInput: string): string {
    // ❌ UNSAFE: method returns unsafe template
    return `Input: ${userInput}`;
  }
  
  async generateAsync(query: string): Promise<void> {
    // ❌ UNSAFE: async method with unsafe template
    await anthropic.messages.create({
      prompt: `Query: ${query}`,
    });
  }
  
  callSDK(userMessage: string) {
    // ❌ UNSAFE: direct unsafe template in method
    const prompt = `Message: ${userMessage}`;
    anthropic.messages.create({ prompt });
  }
}

// ============================================================================
// PATTERN 15: Multiple unsafe patterns in one function
// ============================================================================

function multipleUnsafePatterns(
  name: string,
  query: string,
  userId: string
) {
  // ❌ UNSAFE: all of these are unvalidated
  const greeting = `Hello ${name}`;
  const userQuery = `Query: ${query}`;
  const metadata = `ID: ${userId}`;
  
  anthropic.messages.create({
    prompt: `${greeting}. ${userQuery}. ${metadata}`,
  });
}

// ============================================================================
// PATTERN 16: Spread operator with unsafe templates
// ============================================================================

function unsafeSpread(userMessage: string) {
  // ❌ UNSAFE: spread with unsafe template
  const params = {
    content: `User: ${userMessage}`,
    ...{
      metadata: `From: ${userMessage}`,
    },
  };
  
  anthropic.messages.create(params);
}

// ============================================================================
// PATTERN 17: Complex concatenation patterns
// ============================================================================

function unsafeComplexConcat(input1: string, input2: string, input3: string) {
  // ❌ UNSAFE: complex mixing of concatenation
  const part1 = "Start: " + input1;
  const part2 = `Middle: ${input2}`;
  const prompt = part1 + part2 + " End: " + input3;
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 18: Computed property access with unsafe template
// ============================================================================

function unsafeComputedAccess(userInput: string) {
  // ❌ UNSAFE: unsafe template in computed key
  const config = {
    [`message_${userInput}`]: `Value: ${userInput}`,
  };
  
  const prompt = config[`message_${userInput}`];
  anthropic.messages.create({ prompt });
}

// ============================================================================
// PATTERN 19: Filter/reduce with unsafe templates
// ============================================================================

function unsafeFilterReduce(inputs: string[]) {
  // ❌ UNSAFE: reduce produces unsafe templates
  const prompts = inputs.reduce(
    (acc, input) => [...acc, `Item: ${input}`],
    [] as string[]
  );
  
  prompts.forEach(prompt => {
    anthropic.messages.create({ prompt });
  });
}

// ============================================================================
// PATTERN 20: Callback with unsafe template
// ============================================================================

function unsafeCallback(userData: string[]) {
  // ❌ UNSAFE: callback produces unsafe templates
  function processUser(user: string) {
    const prompt = `Process: ${user}`;
    anthropic.messages.create({ prompt });
  }
  
  userData.forEach(processUser);
}

export {
  unsafeDirectTemplate,
  unsafeOpenAITemplate,
  unsafeVercelAITemplate,
  unsafeStringConcat,
  unsafeConcatMultiple,
  unsafeMixedConcat,
  unsafeVariableAssign,
  unsafeNestedAssign,
  unsafeArrow,
  unsafeArrowTemplate,
  callUnsafeArrow,
  unsafeAsync,
  unsafeAsyncConcat,
  unsafeObjectShorthand,
  unsafeObjectProperty,
  unsafeNestedTemplates,
  deeplyNestedUnsafe,
  unsafeArrayPrompts,
  unsafePromptMap,
  getUnsafePrompt,
  callGetUnsafePrompt,
  unsafeConditional,
  unsafeTernary,
  unsafeArrayLiteral,
  unsafeIIFE,
  UnsafePromptGenerator,
  multipleUnsafePatterns,
  unsafeSpread,
  unsafeComplexConcat,
  unsafeComputedAccess,
  unsafeFilterReduce,
  unsafeCallback,
};
