/**
 * ESLint Rule: unsafe-prompt
 *
 * Detects unvalidated template literals and string concatenation
 * that could lead to prompt injection when passed to AI model APIs.
 *
 * Safe patterns:
 * - `aiGuard.safe`${variable}`` (explicit wrapping)
 * - "constant string" (no variables)
 * - Variables in non-SDK contexts
 *
 * Unsafe patterns:
 * - `${userInput}` (naked template variable)
 * - "prefix: " + userVar (string concatenation)
 * - Nested template literals
 */

import * as estree from 'estree';
import { Rule } from 'eslint';
import {
  isKnownAISDKCall,
  hasTemplateExpressions,
  isTemplateLiteral,
  isWrappedInAIGuardSafe,
  isBinaryExpression,
  isUnsafeBinaryExpression,
  getMemberChain,
  getExpressionName,
  isWrappedInSafePattern,
} from '../utils/ast-helpers';

interface UnsafePromptOptions {
  allowedSDKs?: string[];
  allowSafePattern?: string;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detect unsanitized user input to AI models (potential prompt injection)',
      recommended: true,
      url: 'https://github.com/aitoolsmonorepo/aitools/tree/main/packages/%40aitools/guard#unsafe-prompt',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      unsafeTemplate: 'Template literal with unvalidated variable passed to AI SDK. Wrap with aiGuard.safe`...` for explicit safety.',
      unsafeConcat: 'String concatenation with variable passed to AI SDK. Consider using template literals with aiGuard.safe`...`.',
      unsafeNestedTemplate: 'Nested template literal detected. This may indicate unsanitized input.',
      wrapWithAIGuardSafe: 'Wrap template literal with aiGuard.safe',
    },
  },

  create(context: Rule.RuleContext) {
    const options = context.options[0] as UnsafePromptOptions | undefined;
    const allowSafePattern = options?.allowSafePattern || 'aiGuard.safe';
    const sdkPatterns = options?.allowedSDKs || [
      'anthropic',
      'openai',
      'vercelAI',
    ];

    // Track parent nodes for context using WeakMap
    const parentMap = new WeakMap<any, any>();

    function getParent(node: estree.Node): estree.Node | undefined {
      return parentMap.get(node);
    }

    function setParent(node: estree.Node, parent: estree.Node): void {
      parentMap.set(node, parent);
    }

    /**
     * Check if a variable is used in an AI SDK call
     */
    function isVariableInSDKCall(node: estree.TemplateLiteral): boolean {
      let current: any = node;

      // Walk up to find if we're in an SDK call
      while (current) {
        const parent = getParent(current);
        if (!parent) break;

        if (parent.type === 'CallExpression') {
          const call = parent as estree.CallExpression;
          // Check if this is an SDK call
          const callee = call.callee;
          if (callee.type === 'MemberExpression') {
            const chain = getMemberChain(callee);
            // Check if any SDK pattern matches
            const matchesSdk = sdkPatterns.some(
              sdk =>
                chain.startsWith(`${sdk}.`) ||
                chain === sdk ||
                chain.includes(`.${sdk}.`)
            );
            if (matchesSdk) {
              return true;
            }
          }
        }

        current = parent;
      }

      return false;
    }

    return {
      '*': (node: any) => {
        const parent = (node as any).parent;
        if (parent && typeof parent === 'object') {
          setParent(node, parent);
        }
      },

      TemplateLiteral(node: estree.Node) {
        const template = node as estree.TemplateLiteral;

        // Skip if no expressions (constant string)
        if (!hasTemplateExpressions(template)) {
          return;
        }

        const parent = getParent(node);
        const grandparent = parent ? getParent(parent) : undefined;

        // Check if wrapped in safe pattern
        if (parent && isWrappedInSafePattern(parent, [allowSafePattern])) {
          return; // Safe pattern, allow
        }

        // Only flag if in SDK context
        if (!isVariableInSDKCall(template)) {
          return;
        }

        context.report({
          node,
          messageId: 'unsafeTemplate',
          suggest: [
            {
              messageId: 'wrapWithAIGuardSafe',
              fix(fixer) {
                // Replace the backtick with aiGuard.safe`
                const sourceCode = context.sourceCode;
                const start = (node.range as any)?.[0];
                const text = sourceCode.getText(node);

                if (text && text.startsWith('`')) {
                  return fixer.replaceTextRange(
                    [start as number, (start as number) + 1],
                    `${allowSafePattern}\``
                  );
                }

                return null;
              },
            },
          ],
        });
      },

      BinaryExpression(node: estree.Node) {
        const binary = node as estree.BinaryExpression;

        // Only check + operator for concatenation
        if (binary.operator !== '+') {
          return;
        }

        // Check if has variables (unsafe)
        if (!isUnsafeBinaryExpression(binary)) {
          return;
        }

        const parent = getParent(node);
        let current: any = node;

        // Walk up to find if we're in an SDK call
        let inSDKCall = false;
        while (current) {
          const p = getParent(current);
          if (!p) break;

          if (p.type === 'CallExpression') {
            const call = p as estree.CallExpression;
            const callee = call.callee;
            if (callee.type === 'MemberExpression') {
              const chain = getMemberChain(callee);
              const matchesSdk = sdkPatterns.some(
                sdk =>
                  chain.startsWith(`${sdk}.`) ||
                  chain === sdk ||
                  chain.includes(`.${sdk}.`)
              );
              if (matchesSdk) {
                inSDKCall = true;
                break;
              }
            }
          }

          current = p;
        }

        if (!inSDKCall) {
          return;
        }

        context.report({
          node,
          messageId: 'unsafeConcat',
        });
      },

      AssignmentExpression(node: estree.Node) {
        const assignment = node as estree.AssignmentExpression;

        // Check if assigning to a variable used in SDK context
        if (
          assignment.right.type === 'TemplateLiteral' ||
          assignment.right.type === 'BinaryExpression'
        ) {
          // Let individual handlers deal with it
        }
      },
    };
  },
};

export default rule;
