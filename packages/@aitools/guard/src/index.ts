/**
 * @aitools/guard ESLint Plugin
 *
 * Provides ESLint rules for detecting AI prompt injection vulnerabilities
 * at build-time through AST analysis.
 *
 * Usage:
 * {
 *   "plugins": ["@aitools/guard"],
 *   "extends": ["plugin:@aitools/guard/recommended"],
 *   "rules": {
 *     "@aitools/guard/unsafe-prompt": "error"
 *   }
 * }
 */

import unsafePromptRule from './rules/unsafe-prompt';
import { Rule } from 'eslint';

interface GuardPlugin {
  rules: Record<string, Rule.RuleModule>;
  configs: Record<string, any>;
}

const plugin: GuardPlugin = {
  rules: {
    'unsafe-prompt': unsafePromptRule,
  },

  configs: {
    recommended: {
      plugins: ['@aitools/guard'],
      rules: {
        '@aitools/guard/unsafe-prompt': [
          'error',
          {
            allowedSDKs: ['anthropic', 'openai', 'vercelAI'],
            allowSafePattern: 'aiGuard.safe',
          },
        ],
      },
    },
  },
};

export default plugin;
export { Rule };
