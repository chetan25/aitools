/**
 * ESLint Rule Tests: unsafe-prompt
 *
 * Comprehensive test suite covering:
 * - Safe patterns (should pass)
 * - Unsafe patterns (should fail)
 * - Edge cases
 */

import { RuleTester } from 'eslint';
import plugin from '@aitools/guard';

const ruleTester = new RuleTester({
  // ESLint 9 flat config format
  files: ['**/*.js'],
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

// Get the rule from the plugin
const rule = plugin.rules['unsafe-prompt'];

describe('unsafe-prompt rule', () => {
  ruleTester.run('unsafe-prompt', rule!, {
    valid: [
      // Safe: constant strings (no variables)
      {
        code: 'const prompt = "You are a helpful assistant";',
      },
      {
        code: 'const prompt = `You are a helpful assistant`;',
      },
      {
        code: `const prompt = \`System: respond concisely\`;`,
      },

      // Safe: wrapped in aiGuard.safe
      {
        code: `
          import { aiGuard } from '@aitools/guard';
          const userInput = getUserInput();
          const prompt = aiGuard.safe\`You are helpful. User said: \${userInput}\`;
          const response = await openai.chat.completions.create({ messages: [{ content: prompt }] });
        `,
      },
      {
        code: `
          const aiGuard = { safe: String.raw };
          const prompt = aiGuard.safe\`Template: \${variable}\`;
        `,
      },

      // Safe: not in SDK context
      {
        code: `
          const userMessage = getUserMessage();
          const template = \`Hello \${userMessage}\`;
          console.log(template);
        `,
      },

      // Safe: only used in local logging
      {
        code: `
          function logMessage(user) {
            const msg = \`User: \${user}\`;
            logger.info(msg);
          }
        `,
      },

      // Safe: concatenation not in SDK context
      {
        code: `
          const name = 'John';
          const greeting = 'Hello ' + name;
          console.log(greeting);
        `,
      },

      // Safe: system prompt (no variables in template)
      {
        code: `
          const systemPrompt = 'You are Claude. Be helpful.';
          const response = await anthropic.messages.create({
            system: systemPrompt,
            messages: [{ role: 'user', content: 'Hello' }]
          });
        `,
      },

      // Safe: variable assignment separate from SDK call
      {
        code: `
          const systemPrompt = 'You are Claude';
          const response = await anthropic.messages.create({
            system: systemPrompt,
            messages: []
          });
        `,
      },

      // Safe: arrow function with safe wrapper
      {
        code: `
          const createPrompt = (input) => aiGuard.safe\`Echo: \${input}\`;
        `,
      },

      // Safe: async function with safe wrapper
      {
        code: `
          async function askAI(question) {
            const prompt = aiGuard.safe\`Q: \${question}\`;
            return await openai.chat.completions.create({
              messages: [{ role: 'user', content: prompt }]
            });
          }
        `,
      },

      // Safe: conditional with safe pattern
      {
        code: `
          const prompt = isAdmin
            ? aiGuard.safe\`Admin query: \${query}\`
            : aiGuard.safe\`User query: \${query}\`;
        `,
      },

      // Safe: custom SDK method (not in known list)
      {
        code: `
          const result = myCustomAI.generate(\`Input: \${userInput}\`);
        `,
      },

      // Safe: template literal in object not passed to SDK
      {
        code: `
          const config = {
            template: \`Hello \${name}\`,
            debug: true
          };
          console.log(config);
        `,
      },

      // Safe: variable used in non-SDK function
      {
        code: `
          function processMessage(msg) {
            const formatted = \`Message: \${msg}\`;
            return formatted.toUpperCase();
          }
        `,
      },

      // Safe: concatenation in non-SDK context
      {
        code: `
          function buildString(part1, part2) {
            return part1 + ' ' + part2;
          }
        `,
      },

      // Safe: nested template but wrapped safely
      {
        code: `
          const inner = aiGuard.safe\`inner: \${x}\`;
          const outer = aiGuard.safe\`outer: \${inner}\`;
        `,
      },

      // Safe: string in comment
      {
        code: `
          // const bad = \`prompt: \${userInput}\`;
          const good = aiGuard.safe\`prompt: \${userInput}\`;
        `,
      },

      // Safe: constants in template
      {
        code: `
          const SYSTEM = 'helpful';
          const prompt = \`System: \${SYSTEM}\`;
        `,
      },

      // Safe: no expressions
      {
        code: `
          const response = await openai.chat.completions.create({
            messages: [{ content: \`Your system prompt\` }]
          });
        `,
      },
    ],

    invalid: [
      // Unsafe: unvalidated template in SDK call
      {
        code: `
          const userInput = getUserInput();
          const prompt = \`You are helpful. User said: \${userInput}\`;
          const response = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
            suggestions: [
              {
                messageId: 'wrapWithSafe',
                output: expect.any(String)
              }
            ]
          },
        ],
      },

      // Unsafe: direct template in SDK argument
      {
        code: `
          const userMsg = getUserMessage();
          await openai.chat.completions.create({
            messages: [{ content: \`User: \${userMsg}\` }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: anthropic SDK with template
      {
        code: `
          const userInput = req.body.message;
          const response = await anthropic.messages.create({
            messages: [{ content: \`Question: \${userInput}\` }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: vercelAI SDK
      {
        code: `
          const query = getQuery();
          const result = await vercelAI.generateText({
            prompt: \`Query: \${query}\`
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: string concatenation with variable
      {
        code: `
          const userInput = getUserInput();
          const prompt = 'Say: ' + userInput;
          await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeConcat',
          },
        ],
      },

      // Unsafe: concatenation on right side
      {
        code: `
          const userInput = getUserInput();
          const prompt = userInput + ' is the user query';
          await anthropic.messages.create({
            messages: [{ content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeConcat',
          },
        ],
      },

      // Unsafe: nested templates
      {
        code: `
          const name = getUserName();
          const msg = \`Name: \${name}\`;
          const prompt = \`User info: \${msg}\`;
          await openai.chat.completions.create({
            messages: [{ content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: arrow function returning unsafe template
      {
        code: `
          const createPrompt = (input) => \`Echo: \${input}\`;
          const msg = createPrompt(userInput);
          await openai.chat.completions.create({
            messages: [{ content: msg }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: async function with unsafe template
      {
        code: `
          async function askAI(question) {
            const prompt = \`Q: \${question}\`;
            return await openai.chat.completions.create({
              messages: [{ role: 'user', content: prompt }]
            });
          }
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: template in object property passed to SDK
      {
        code: `
          const userInput = getInput();
          const payload = {
            prompt: \`Prompt: \${userInput}\`
          };
          await openai.chat.completions.create(payload);
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: multiple variables in template
      {
        code: `
          const part1 = getUserPart1();
          const part2 = getUserPart2();
          const prompt = \`\${part1} and \${part2}\`;
          await anthropic.messages.create({
            messages: [{ content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: wrong wrapper (not aiGuard.safe)
      {
        code: `
          const userInput = getUserInput();
          const prompt = myWrapper\`You are helpful. User said: \${userInput}\`;
          await openai.chat.completions.create({
            messages: [{ content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: string concatenation in ternary
      {
        code: `
          const userInput = getUserInput();
          const prompt = isAdmin ? 'Admin: ' + userInput : 'User: ' + userInput;
          await openai.chat.completions.create({
            messages: [{ content: prompt }]
          });
        `,
        errors: [
          {
            messageId: 'unsafeConcat',
          },
          {
            messageId: 'unsafeConcat',
          },
        ],
      },

      // Unsafe: template in array passed to SDK
      {
        code: `
          const userMsg = req.query.q;
          await openai.chat.completions.create({
            messages: [\{ role: 'user', content: \`Message: \${userMsg}\` \}]
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: vercelAI.streamText
      {
        code: `
          const query = getQuery();
          const stream = await vercelAI.streamText({
            prompt: \`Query: \${query}\`
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },

      // Unsafe: anthropic completions
      {
        code: `
          const userInput = getUserInput();
          const response = await anthropic.completions.create({
            prompt: \`Say: \${userInput}\`
          });
        `,
        errors: [
          {
            messageId: 'unsafeTemplate',
          },
        ],
      },
    ],
  });
});
