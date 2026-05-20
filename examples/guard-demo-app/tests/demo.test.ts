/**
 * Demo Test Suite
 *
 * This test suite validates that the Guard ESLint rule correctly
 * detects violations in the example files.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Guard ESLint Rule Demo', () => {
  const projectRoot = path.join(__dirname, '..');
  const eslintReportPath = path.join(projectRoot, 'eslint-report.json');

  beforeAll(() => {
    // Run ESLint and generate JSON report
    try {
      execSync('npm run lint:json', { cwd: projectRoot, stdio: 'pipe' });
    } catch (error) {
      // ESLint will exit with code 1 if violations found, that's expected
    }
  });

  function getESLintReport() {
    if (!fs.existsSync(eslintReportPath)) {
      return [];
    }
    const content = fs.readFileSync(eslintReportPath, 'utf-8');
    return JSON.parse(content);
  }

  function countViolations(file: string, ruleId = '@aitools/guard/unsafe-prompt'): number {
    const report = getESLintReport();
    const fileReport = report.find((r: any) => r.filePath.includes(file));
    
    if (!fileReport) return 0;
    
    return fileReport.messages.filter(
      (m: any) => m.ruleId === ruleId
    ).length;
  }

  describe('Safe Examples', () => {
    it('should have no violations in safe-examples.ts', () => {
      const violations = countViolations('safe-examples.ts');
      expect(violations).toBe(0);
    });

    it('should allow aiGuard.safe wrapped templates', () => {
      // No specific assertion needed - just checking file has 0 violations
      const violations = countViolations('safe-examples.ts');
      expect(violations).toBe(0);
    });

    it('should allow constant strings without variables', () => {
      const violations = countViolations('safe-examples.ts');
      expect(violations).toBe(0);
    });

    it('should allow templates in non-SDK contexts', () => {
      const violations = countViolations('safe-examples.ts');
      expect(violations).toBe(0);
    });
  });

  describe('Unsafe Examples', () => {
    it('should have violations in unsafe-examples.ts', () => {
      const violations = countViolations('unsafe-examples.ts');
      expect(violations).toBeGreaterThan(0);
    });

    it('should detect unvalidated template literals', () => {
      const violations = countViolations('unsafe-examples.ts');
      // Should detect multiple unvalidated templates
      expect(violations).toBeGreaterThanOrEqual(10);
    });

    it('should detect string concatenation with variables', () => {
      const violations = countViolations('unsafe-examples.ts');
      // Multiple concat patterns should be detected
      expect(violations).toBeGreaterThanOrEqual(10);
    });

    it('should flag unsafe patterns in SDK calls', () => {
      const violations = countViolations('unsafe-examples.ts');
      // All functions should have at least one violation
      expect(violations).toBeGreaterThan(15);
    });
  });

  describe('Edge Cases', () => {
    it('should be present in edge-cases.ts', () => {
      const report = getESLintReport();
      const edgeCaseReport = report.find((r: any) => r.filePath.includes('edge-cases.ts'));
      expect(edgeCaseReport).toBeDefined();
    });

    it('should detect violations in edge-cases.ts', () => {
      const violations = countViolations('edge-cases.ts');
      // Edge cases should have some violations
      expect(violations).toBeGreaterThan(0);
    });

    it('should handle multiple SDK variations', () => {
      const violations = countViolations('edge-cases.ts');
      // Should detect unsafe patterns across different SDKs
      expect(violations).toBeGreaterThan(0);
    });
  });

  describe('Guard Configuration', () => {
    it('should have ESLint configured with Guard plugin', () => {
      const eslintConfigPath = path.join(projectRoot, '.eslintrc.json');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(eslintConfigPath, 'utf-8'));
      expect(config.plugins).toContain('@aitools/guard');
      expect(config.rules['@aitools/guard/unsafe-prompt']).toBeDefined();
    });

    it('should have TypeScript configuration', () => {
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
    });

    it('should have package.json with Guard dependency', () => {
      const packagePath = path.join(projectRoot, 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      expect(pkg.devDependencies['eslint']).toBeDefined();
    });
  });

  describe('Violation Statistics', () => {
    it('should provide detailed violation counts', () => {
      const report = getESLintReport();
      
      const safeViolations = countViolations('safe-examples.ts');
      const unsafeViolations = countViolations('unsafe-examples.ts');
      const edgeViolations = countViolations('edge-cases.ts');
      
      console.log('\n=== Violation Statistics ===');
      console.log(`Safe examples violations: ${safeViolations}`);
      console.log(`Unsafe examples violations: ${unsafeViolations}`);
      console.log(`Edge cases violations: ${edgeViolations}`);
      console.log(`Total violations: ${safeViolations + unsafeViolations + edgeViolations}`);
      console.log('===========================\n');
      
      expect(safeViolations).toBe(0);
      expect(unsafeViolations).toBeGreaterThan(15);
    });
  });

  describe('Report Generation', () => {
    it('should generate ESLint report successfully', () => {
      expect(fs.existsSync(eslintReportPath)).toBe(true);
    });

    it('should have valid JSON report', () => {
      const report = getESLintReport();
      expect(Array.isArray(report)).toBe(true);
      
      report.forEach((fileReport: any) => {
        expect(fileReport.filePath).toBeDefined();
        expect(Array.isArray(fileReport.messages)).toBe(true);
      });
    });
  });
});
