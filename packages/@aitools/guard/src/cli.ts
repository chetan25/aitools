#!/usr/bin/env node

/**
 * @aitools/guard CLI
 *
 * Scans a directory for prompt injection vulnerabilities.
 *
 * Usage:
 *   npx @aitools/guard scan ./src --format json
 *   npx @aitools/guard scan ./src --format text
 */

import { promises as fs } from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const KNOWN_SDK_PATTERNS = [
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

interface Violation {
  file: string;
  line: number;
  column: number;
  pattern: string;
  severity: 'error' | 'warning';
  message: string;
}

interface ScanResult {
  violations: Violation[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    filesScanned: number;
  };
}

/**
 * Get all TypeScript/JavaScript files recursively
 */
async function getAllJSFiles(
  dir: string,
  extensions = ['.ts', '.tsx', '.js', '.jsx']
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip common non-source directories
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build'
      ) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await getAllJSFiles(fullPath, extensions)));
      } else if (
        entry.isFile() &&
        extensions.some(ext => entry.name.endsWith(ext))
      ) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return files;
}

/**
 * Check if a string matches AI SDK patterns
 */
function isAISDKPattern(chain: string): boolean {
  return KNOWN_SDK_PATTERNS.some(
    pattern => pattern === chain || chain.startsWith(`${pattern.split('.')[0]}.`)
  );
}

/**
 * Extract member chain from AST node
 */
function getMemberChain(node: any): string {
  if (!node) return '';

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'MemberExpression') {
    const obj = getMemberChain(node.object);
    const prop = node.computed ? '' : node.property?.name || '';
    return obj ? `${obj}.${prop}` : prop;
  }

  return '';
}

/**
 * Scan a single file for violations
 */
async function scanFile(filepath: string): Promise<Violation[]> {
  try {
    const content = await fs.readFile(filepath, 'utf8');

    let ast: any;
    try {
      ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        allowSuperOutsideMethod: true,
      });
    } catch (parseError) {
      // Skip unparseable files
      return [];
    }

    const violations: Violation[] = [];

    // Walk the AST
    function walk(node: any, parent: any = null) {
      if (!node) return;

      // Check for unsafe template literals in SDK calls
      if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
        if (isTemplateLiteralInSDKCall(node, parent, ast)) {
          // Check if wrapped in aiGuard.safe
          if (!isWrappedInSafePattern(parent)) {
            const lines = content.split('\n');
            const line = lines[node.loc.start.line - 1] || '';
            violations.push({
              file: filepath,
              line: node.loc.start.line,
              column: node.loc.start.column,
              pattern: 'unsafe_template_literal',
              severity: 'error',
              message: `Unsafe template literal with variable in AI SDK call: ${line.trim().substring(0, 60)}...`,
            });
          }
        }
      }

      // Check for unsafe string concatenation
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        if (isUnsafeConcat(node) && isInSDKCallContext(node, parent, ast)) {
          const lines = content.split('\n');
          const line = lines[node.loc.start.line - 1] || '';
          violations.push({
            file: filepath,
            line: node.loc.start.line,
            column: node.loc.start.column,
            pattern: 'unsafe_concatenation',
            severity: 'error',
            message: `Unsafe string concatenation with variable in AI SDK call: ${line.trim().substring(0, 60)}...`,
          });
        }
      }

      // Recurse through children
      for (const key in node) {
        if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') {
          continue;
        }
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((item: any) => {
            if (item && typeof item === 'object' && item.type) {
              walk(item, node);
            }
          });
        } else if (child && typeof child === 'object' && child.type) {
          walk(child, node);
        }
      }
    }

    walk(ast);
    return violations;
  } catch (error) {
    console.error(`Error scanning ${filepath}:`, error);
    return [];
  }
}

/**
 * Check if template literal is in SDK call context
 */
function isTemplateLiteralInSDKCall(
  node: any,
  parent: any,
  ast: any
): boolean {
  // Simple heuristic: look for parent CallExpression
  return (
    (parent?.type === 'TaggedTemplateExpression' ||
      parent?.type === 'CallExpression') &&
    isAISDKPattern(getMemberChain(parent?.callee || parent?.tag))
  );
}

/**
 * Check if string concatenation is unsafe (has variables)
 */
function isUnsafeConcat(node: any): boolean {
  return (
    node.left.type === 'Identifier' ||
    node.right.type === 'Identifier' ||
    node.left.type === 'Literal' ||
    node.right.type === 'Literal'
  );
}

/**
 * Check if concatenation is in SDK call context
 */
function isInSDKCallContext(node: any, parent: any, ast: any): boolean {
  let current = parent;
  while (current) {
    if (
      current.type === 'CallExpression' &&
      isAISDKPattern(getMemberChain(current.callee))
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Check if wrapped in safe pattern
 */
function isWrappedInSafePattern(parent: any): boolean {
  if (parent?.type === 'TaggedTemplateExpression') {
    const chain = getMemberChain(parent.tag);
    return chain === 'aiGuard.safe' || chain.endsWith('.aiGuard.safe');
  }
  return false;
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args[0] !== 'scan') {
    console.log(`
@aitools/guard CLI - Prompt injection detection

Usage:
  npx @aitools/guard scan <directory> [--format json|text]

Examples:
  npx @aitools/guard scan ./src
  npx @aitools/guard scan ./src --format json
  npx @aitools/guard scan . --format text
    `);
    process.exit(1);
  }

  const directory = args[1];
  const formatArg = args.findIndex(a => a === '--format');
  const format = formatArg >= 0 ? args[formatArg + 1] : 'text';

  if (!['json', 'text'].includes(format)) {
    console.error('Invalid format. Use "json" or "text".');
    process.exit(1);
  }

  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      console.error(`${directory} is not a directory.`);
      process.exit(1);
    }
  } catch {
    console.error(`Directory not found: ${directory}`);
    process.exit(1);
  }

  console.log(`Scanning ${directory} for prompt injection vulnerabilities...`);

  const files = await getAllJSFiles(directory);
  const result: ScanResult = {
    violations: [],
    summary: {
      total: 0,
      errors: 0,
      warnings: 0,
      filesScanned: 0,
    },
  };

  for (const file of files) {
    const violations = await scanFile(file);
    result.violations.push(...violations);
    result.summary.filesScanned++;
  }

  result.summary.total = result.violations.length;
  result.summary.errors = result.violations.filter(
    v => v.severity === 'error'
  ).length;
  result.summary.warnings = result.violations.filter(
    v => v.severity === 'warning'
  ).length;

  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Text format
    if (result.violations.length === 0) {
      console.log('\n✓ No violations found!');
    } else {
      console.log(`\n⚠️  Found ${result.violations.length} violation(s):\n`);
      for (const v of result.violations) {
        const icon = v.severity === 'error' ? '❌' : '⚠️';
        console.log(`${icon} ${v.file}:${v.line}:${v.column}`);
        console.log(`   ${v.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Files scanned: ${result.summary.filesScanned}`);
    console.log(`   Total violations: ${result.summary.total}`);
    console.log(`   Errors: ${result.summary.errors}`);
    console.log(`   Warnings: ${result.summary.warnings}`);
  }

  process.exit(result.summary.errors > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
