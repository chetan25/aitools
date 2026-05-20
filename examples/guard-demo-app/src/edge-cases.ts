/**
 * EDGE CASES - Complex scenarios and potential false positives
 *
 * This file tests corner cases, false positives, and complex scenarios
 * to ensure Guard is precise and doesn't over-flag legitimate code.
 */

namespace aiGuard {
  export function safe(strings: TemplateStringsArray, ...values: any[]): string {
    return strings.reduce((result, str, i) => result + str + (values[i] ?? ''), '');
  }
}

namespace anthropic {
  export namespace messages {
    export function create(params: any): any {
      return {};
    }
  }
}

// ============================================================================
// EDGE CASE 1: Variables that look like they're from user but aren't
// ============================================================================

function notActuallyUserInput() {
  // SAFE: these are constants/computed, not user input
  const CONST_PREFIX = "System: ";
  const computed = Math.random().toString();
  const timestamp = new Date().toISOString();
  
  const prompt = `${CONST_PREFIX}${computed}:${timestamp}`;
  console.log(prompt); // Not SDK, so safe anyway
}

// ============================================================================
// EDGE CASE 2: Properties that reference SDK but aren't actually SDK calls
// ============================================================================

class FakeSDK {
  messages = {
    create: (params: any) => `Mock: ${params}`,
  };
}

function notRealSDK(userInput: string) {
  // SAFE: this is NOT the real anthropic SDK
  const fake = new FakeSDK();
  const prompt = `User: ${userInput}`;
  fake.messages.create({ prompt }); // Not real SDK, shouldn't flag
}

// ============================================================================
// EDGE CASE 3: Template literals in comments
// ============================================================================

function hasComments(userInput: string) {
  // SAFE: template in comment should be ignored
  // This would be unsafe: `${userInput}`
  
  const safe = aiGuard.safe`User: ${userInput}`;
  return safe;
}

// ============================================================================
// EDGE CASE 4: String literals that look like templates but aren't
// ============================================================================

function stringNotTemplate() {
  // SAFE: these are plain strings, not template literals
  const backQuote = "`literal backtick`";
  const dollarSign = "$variable notation";
  const combined = "`${not a template}`";
  
  return { backQuote, dollarSign, combined };
}

// ============================================================================
// EDGE CASE 5: Empty template literals
// ============================================================================

function emptyTemplates() {
  // SAFE: no variables in templates
  const empty = ``;
  const whitespace = `   `;
  const escaped = `\n\t`;
  
  anthropic.messages.create({ prompt: empty });
  anthropic.messages.create({ prompt: whitespace });
  anthropic.messages.create({ prompt: escaped });
}

// ============================================================================
// EDGE CASE 6: Tagged template literals (not aiGuard.safe)
// ============================================================================

function customTag(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.join("");
}

function otherTaggedTemplate(userInput: string) {
  // Question: Should this flag? It has a variable but uses custom tag
  // For now, Guard may flag this as a potential issue
  const prompt = customTag`User: ${userInput}`;
  console.log(prompt);
}

// ============================================================================
// EDGE CASE 7: Variables in non-critical positions
// ============================================================================

function nonCriticalVariables(userInput: string) {
  // SAFE: variable is in metadata, not prompt content
  anthropic.messages.create({
    prompt: "Standard prompt",
    metadata: {
      user: userInput, // Not part of actual prompt
    },
  });
}

// ============================================================================
// EDGE CASE 8: SDK calls that shouldn't be flagged
// ============================================================================

function otherMethods(userInput: string) {
  // SAFE: these aren't prompt injection points
  anthropic.messages.create({
    model: userInput, // Model selection, not prompt
  });
  
  anthropic.messages.create({
    max_tokens: 100,
    temperature: 0.7,
  });
}

// ============================================================================
// EDGE CASE 9: Deeply nested SDK calls
// ============================================================================

function deepNesting(userInput: string) {
  // Might flag: deeply nested but still unsafe
  const obj = {
    nested: {
      deeply: {
        messages: {
          create: (p: any) => p,
        },
      },
    },
  };
  
  // This probably won't be caught since it's not recognized as SDK
  obj.nested.deeply.messages.create({ prompt: `User: ${userInput}` });
}

// ============================================================================
// EDGE CASE 10: Reassigned SDK references
// ============================================================================

function reassignedSDK(userInput: string) {
  // Questionable: Guard might not catch reassigned references
  const client = anthropic;
  
  client.messages.create({
    prompt: `User: ${userInput}`,
  });
}

// ============================================================================
// EDGE CASE 11: Destructured SDK imports
// ============================================================================

namespace destructuredExample {
  // Questionable: Guard might not catch destructured imports
  // const { messages } = anthropic;
  // messages.create({ prompt: `User: ${userInput}` });
}

// ============================================================================
// EDGE CASE 12: String interpolation that looks like templates
// ============================================================================

function fakeInterpolation(userInput: string) {
  // SAFE: this is JavaScript, not a template literal
  const fakeTemplate = "$" + "{userInput}";
  console.log(fakeTemplate); // Prints: "${userInput}"
}

// ============================================================================
// EDGE CASE 13: Multiple SDK namespaces
// ============================================================================

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

function multipleSDKs(userInput: string) {
  // UNSAFE in all three SDKs
  anthropic.messages.create({
    prompt: `Anthropic: ${userInput}`,
  });
  
  openai.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `OpenAI: ${userInput}`,
      },
    ],
  });
  
  vercelAI.generateText({
    prompt: `VercelAI: ${userInput}`,
  });
}

// ============================================================================
// EDGE CASE 14: Wrapping patterns that aren't aiGuard.safe
// ============================================================================

function customSafeWrapper(userInput: string) {
  // Likely SAFE but Guard won't recognize it
  const customSafe = (s: TemplateStringsArray, ...v: any[]) => s[0];
  const prompt = customSafe`User: ${userInput}`;
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 15: Parameters with similar names
// ============================================================================

function similarNames(
  userInput: string,
  userInformation: string,
  userInputRaw: string,
  getUserInput: () => string
) {
  // MULTIPLE UNSAFE: all parameter variations
  anthropic.messages.create({ prompt: `Input: ${userInput}` });
  anthropic.messages.create({ prompt: `Info: ${userInformation}` });
  anthropic.messages.create({ prompt: `Raw: ${userInputRaw}` });
  anthropic.messages.create({ prompt: `Func: ${getUserInput()}` });
}

// ============================================================================
// EDGE CASE 16: Complex type annotations (shouldn't affect detection)
// ============================================================================

type PromptConfig = {
  content: string;
  system?: string;
};

function typeAnnotations(userInput: string): PromptConfig {
  // UNSAFE: type annotation doesn't make it safe
  const config: PromptConfig = {
    content: `User: ${userInput}`,
  };
  
  return config;
}

// ============================================================================
// EDGE CASE 17: Conditional expressions with mixed safety
// ============================================================================

function mixedSafety(condition: boolean, userInput: string) {
  // UNSAFE: one branch is unsafe
  const prompt = condition
    ? aiGuard.safe`Safe: ${userInput}`
    : `Unsafe: ${userInput}`; // This branch is unsafe
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 18: Multiple levels of function indirection
// ============================================================================

function getPromptFactory(userInput: string) {
  return () => `Indirect: ${userInput}`;
}

function indirectCall(user: string) {
  const factory = getPromptFactory(user);
  const prompt = factory();
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 19: Logical operators in template positions
// ============================================================================

function logicalOperators(userInput: string | null) {
  // UNSAFE: template with potentially undefined value
  const fallback = "Default";
  const prompt = `User: ${userInput || fallback}`;
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 20: Template literals with escape sequences
// ============================================================================

function escapeSequences(userInput: string) {
  // UNSAFE: escape sequences don't make it safe
  const prompt = `User input:\n${userInput}\nEnd`;
  
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 21: Multiple SDK parameters
// ============================================================================

function multipleParams(userInput: string, systemPrompt: string) {
  // UNSAFE: at least userInput is unsafe
  anthropic.messages.create({
    systemPrompt: systemPrompt, // Could be safe if constant
    prompt: `User: ${userInput}`, // Unsafe
    metadata: {
      user: userInput, // Not a prompt field, but still variable
    },
  });
}

// ============================================================================
// EDGE CASE 22: Try-catch with unsafe templates
// ============================================================================

async function tryCatchUnsafe(userInput: string) {
  try {
    // UNSAFE: still unsafe in try block
    await anthropic.messages.create({
      prompt: `User: ${userInput}`,
    });
  } catch (error) {
    console.error(error);
  }
}

// ============================================================================
// EDGE CASE 23: Nullish coalescing
// ============================================================================

function nullishCoalescing(userInput: string | null) {
  // UNSAFE: still uses unvalidated user input
  const prompt = `User: ${userInput ?? "Unknown"}`;
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 24: Optional chaining
// ============================================================================

function optionalChaining(userObj: any) {
  // UNSAFE: accessing user property is still unsafe
  const prompt = `User: ${userObj?.name}`;
  anthropic.messages.create({ prompt });
}

// ============================================================================
// EDGE CASE 25: Safe wrapper in property value
// ============================================================================

function safeInProperty(userInput: string) {
  // SAFE: wrapped in aiGuard.safe
  const params = {
    prompt: aiGuard.safe`User: ${userInput}`,
    temperature: 0.7,
  };
  
  anthropic.messages.create(params);
}

export {
  notActuallyUserInput,
  notRealSDK,
  hasComments,
  stringNotTemplate,
  emptyTemplates,
  customTag,
  otherTaggedTemplate,
  nonCriticalVariables,
  otherMethods,
  deepNesting,
  reassignedSDK,
  fakeInterpolation,
  multipleSDKs,
  customSafeWrapper,
  similarNames,
  typeAnnotations,
  mixedSafety,
  getPromptFactory,
  indirectCall,
  logicalOperators,
  escapeSequences,
  multipleParams,
  tryCatchUnsafe,
  nullishCoalescing,
  optionalChaining,
  safeInProperty,
};
