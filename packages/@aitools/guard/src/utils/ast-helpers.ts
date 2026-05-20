/**
 * AST helper utilities for analyzing template literals and function calls
 * Focuses on detecting unvalidated AI prompt patterns
 */

import * as estree from 'estree';

/**
 * Check if a node is a known AI SDK method call
 * Examples: anthropic.messages.create, openai.chat.completions.create
 */
export function isKnownAISDKCall(node: estree.Node | null | undefined): boolean {
  if (!node || node.type !== 'CallExpression') {
    return false;
  }

  const call = node as estree.CallExpression;
  const callee = call.callee;

  // Match member expressions like openai.chat.completions.create()
  if (callee.type === 'MemberExpression') {
    return isAISDKMemberExpression(callee);
  }

  return false;
}

/**
 * Check if a member expression matches known AI SDK patterns
 */
function isAISDKMemberExpression(node: estree.MemberExpression): boolean {
  const sdkPatterns = [
    'anthropic.messages.create',
    'anthropic.completions.create',
    'openai.chat.completions.create',
    'openai.completions.create',
    'openai.embeddings.create',
    'vercelAI.generateText',
    'vercelAI.generateObject',
    'vercelAI.streamText',
    'vercelAI.streamObject',
  ];

  const chain = getMemberChain(node);
  return sdkPatterns.some(pattern => pattern === chain);
}

/**
 * Extract full member expression chain as string
 * e.g., anthropic.messages.create
 */
export function getMemberChain(node: estree.Node | null | undefined): string {
  if (!node) return '';

  if (node.type === 'Identifier') {
    return (node as estree.Identifier).name;
  }

  if (node.type === 'MemberExpression') {
    const member = node as estree.MemberExpression;
    const obj = getMemberChain(member.object);
    const prop = member.computed
      ? ''
      : (member.property as estree.Identifier).name || '';
    return obj ? `${obj}.${prop}` : prop;
  }

  return '';
}

/**
 * Check if a node is a template literal
 */
export function isTemplateLiteral(node: estree.Node | null | undefined): boolean {
  return node?.type === 'TemplateLiteral';
}

/**
 * Check if a template literal has expressions (variables)
 */
export function hasTemplateExpressions(
  node: estree.TemplateLiteral | null | undefined
): boolean {
  return node ? node.expressions.length > 0 : false;
}

/**
 * Check if a template literal is wrapped in aiGuard.safe
 */
export function isWrappedInAIGuardSafe(
  parent: estree.Node | null | undefined,
  pattern: string = 'aiGuard.safe'
): boolean {
  if (!parent || parent.type !== 'TaggedTemplateExpression') {
    return false;
  }

  const tagged = parent as estree.TaggedTemplateExpression;
  const tagChain = getMemberChain(tagged.tag);

  return tagChain === pattern || tagChain.endsWith(`.${pattern}`);
}

/**
 * Check if a node is a binary expression (string concatenation)
 */
export function isBinaryExpression(node: estree.Node | null | undefined): boolean {
  return node?.type === 'BinaryExpression';
}

/**
 * Check if binary expression is string concatenation with an Identifier
 */
export function isUnsafeBinaryExpression(
  node: estree.BinaryExpression | null | undefined
): boolean {
  if (!node) return false;

  // Check for + operator only
  if (node.operator !== '+') {
    return false;
  }

  // At least one side should be an Identifier (variable)
  const leftIsVar = node.left.type === 'Identifier';
  const rightIsVar = node.right.type === 'Identifier';

  return leftIsVar || rightIsVar;
}

/**
 * Check if a node is a function argument (CallExpression)
 */
export function getFunctionArguments(
  node: estree.CallExpression | null | undefined
): (estree.Expression | estree.SpreadElement)[] {
  return node?.arguments || [];
}

/**
 * Check if an identifier appears in a function's arguments
 */
export function isIdInCallArguments(
  id: string,
  call: estree.CallExpression | null | undefined
): boolean {
  if (!call) return false;

  return call.arguments.some(arg => {
    if (arg.type === 'Identifier') {
      return (arg as estree.Identifier).name === id;
    }
    return false;
  });
}

/**
 * Extract the string representation of a simple Identifier or MemberExpression
 */
export function getExpressionName(node: estree.Node | null | undefined): string {
  if (!node) return '';

  if (node.type === 'Identifier') {
    return (node as estree.Identifier).name;
  }

  if (node.type === 'MemberExpression') {
    return getMemberChain(node);
  }

  return '';
}

/**
 * Check if a template literal is part of an object property
 */
export function isInObjectProperty(
  parent: estree.Node | null | undefined,
  grandparent: estree.Node | null | undefined
): boolean {
  if (parent?.type === 'Property' && grandparent?.type === 'ObjectExpression') {
    return true;
  }
  return false;
}

/**
 * Check if node is wrapped in a safe pattern (allows custom patterns)
 */
export function isWrappedInSafePattern(
  parent: estree.Node | null | undefined,
  safePatterns: string[]
): boolean {
  if (!parent || parent.type !== 'TaggedTemplateExpression') {
    return false;
  }

  const tagged = parent as estree.TaggedTemplateExpression;
  const tagChain = getMemberChain(tagged.tag);

  return safePatterns.some(
    pattern => tagChain === pattern || tagChain.endsWith(`.${pattern}`)
  );
}