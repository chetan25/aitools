#!/usr/bin/env node

/**
 * @aitools/cluster CLI
 *
 * Command-line interface for cluster rendering.
 * Usage: npx @aitools/cluster screenshot --input urls.txt --output screenshots/ --workers 50
 */

import * as fs from 'fs';
import * as path from 'path';
import { Cluster, ScreenshotOptions, PDFOptions, HTMLOptions } from './index';

interface CLIOptions {
  command: 'screenshot' | 'pdf' | 'html';
  input?: string;
  output?: string;
  workers?: number;
  timeout?: number;
  format?: string;
  quality?: number;
  verbose?: boolean;
}

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const opts: CLIOptions = {
    command: 'screenshot',
    workers: 50,
    timeout: 30000,
    format: 'json',
    verbose: false,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'screenshot') opts.command = 'screenshot';
    else if (arg === 'pdf') opts.command = 'pdf';
    else if (arg === 'html') opts.command = 'html';
    else if (arg === '--input' && args[i + 1]) opts.input = args[++i];
    else if (arg === '--output' && args[i + 1]) opts.output = args[++i];
    else if (arg === '--workers' && args[i + 1]) opts.workers = parseInt(args[++i], 10);
    else if (arg === '--timeout' && args[i + 1]) opts.timeout = parseInt(args[++i], 10);
    else if (arg === '--format' && args[i + 1]) opts.format = args[++i];
    else if (arg === '--quality' && args[i + 1]) opts.quality = parseInt(args[++i], 10);
    else if (arg === '--verbose') opts.verbose = true;
    else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
@aitools/cluster CLI

Usage:
  npx @aitools/cluster <command> [options]

Commands:
  screenshot    Capture page screenshots (default)
  pdf           Generate PDF documents
  html          Extract rendered HTML

Options:
  --input FILE        Input file with URLs (one per line)
  --output DIR        Output directory for rendered files
  --workers NUM       Number of concurrent browsers (10-100, default: 50)
  --timeout MS        Page timeout in milliseconds (default: 30000)
  --format FORMAT     Output format: json or text (default: json)
  --quality NUM       Image quality 0-100 (for screenshots, default: 80)
  --verbose           Enable debug logging
  --help              Show this help message

Examples:
  # Render screenshots from urls.txt to output/ folder
  npx @aitools/cluster screenshot --input urls.txt --output screenshots/ --workers 100

  # Generate PDFs with custom timeout
  npx @aitools/cluster pdf --input urls.txt --output pdfs/ --timeout 45000

  # Extract HTML
  npx @aitools/cluster html --input urls.txt --output html/
`);
}

/**
 * Read URLs from input file
 */
function readUrls(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

/**
 * Write output file
 */
function writeOutput(dir: string, filename: string, content: Buffer | string): void {
  const filePath = path.join(dir, filename);
  const fileDir = path.dirname(filePath);

  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(filePath, content);
  } else {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * Main CLI handler
 */
async function main(): Promise<void> {
  const opts = parseArgs(process.argv);

  if (!opts.input) {
    console.error('Error: --input is required');
    process.exit(1);
  }

  if (!opts.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  try {
    // Read URLs
    const urls = readUrls(opts.input);
    console.log(`Loaded ${urls.length} URLs from ${opts.input}`);

    // Create output directory
    if (!fs.existsSync(opts.output)) {
      fs.mkdirSync(opts.output, { recursive: true });
    }

    // Initialize cluster
    const cluster = new Cluster({
      poolSize: opts.workers || 50,
      timeout: opts.timeout || 30000,
      debug: opts.verbose || false,
    });

    console.log(`Starting cluster with ${opts.workers || 50} workers...`);
    await cluster.initialize();

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process URLs
    console.log(`Rendering ${urls.length} pages...`);
    const startTime = Date.now();

    if (opts.command === 'screenshot') {
      const options: ScreenshotOptions[] = urls.map((url) => ({
        url,
        format: 'png',
        quality: opts.quality || 80,
      }));

      const renderResults = await cluster.screenshot(options);

      for (const result of renderResults) {
        if (result.status === 'success' && result.content) {
          const filename = `${Buffer.from(result.url).toString('hex').slice(0, 16)}.png`;
          writeOutput(opts.output, filename, result.content);
          successCount++;
          results.push({ url: result.url, status: 'success', latency: result.latency });
        } else {
          errorCount++;
          results.push({
            url: result.url,
            status: result.status,
            error: result.error,
            latency: result.latency,
          });
        }
      }
    } else if (opts.command === 'pdf') {
      const options: PDFOptions[] = urls.map((url) => ({ url }));
      const renderResults = await cluster.pdf(options);

      for (const result of renderResults) {
        if (result.status === 'success' && result.content) {
          const filename = `${Buffer.from(result.url).toString('hex').slice(0, 16)}.pdf`;
          writeOutput(opts.output, filename, result.content);
          successCount++;
          results.push({ url: result.url, status: 'success', latency: result.latency });
        } else {
          errorCount++;
          results.push({
            url: result.url,
            status: result.status,
            error: result.error,
            latency: result.latency,
          });
        }
      }
    } else if (opts.command === 'html') {
      const options: HTMLOptions[] = urls.map((url) => ({ url }));
      const renderResults = await cluster.html(options);

      for (const result of renderResults) {
        if (result.status === 'success' && result.content) {
          const filename = `${Buffer.from(result.url).toString('hex').slice(0, 16)}.html`;
          writeOutput(opts.output, filename, result.content);
          successCount++;
          results.push({ url: result.url, status: 'success', latency: result.latency });
        } else {
          errorCount++;
          results.push({
            url: result.url,
            status: result.status,
            error: result.error,
            latency: result.latency,
          });
        }
      }
    }

    const elapsedTime = Date.now() - startTime;
    const throughput = Math.round((urls.length / elapsedTime) * 1000 * 60);

    // Print results
    const stats = cluster.getStats();
    console.log(`\nResults:`);
    console.log(`  Success: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  Time: ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`  Throughput: ${throughput} pages/minute`);
    console.log(`  p50 latency: ${stats.p50Latency.toFixed(0)}ms`);
    console.log(`  p99 latency: ${stats.p99Latency.toFixed(0)}ms`);

    // Save results to JSON
    if (opts.format === 'json') {
      const resultsPath = path.join(opts.output, 'results.json');
      fs.writeFileSync(
        resultsPath,
        JSON.stringify(
          {
            command: opts.command,
            totalUrls: urls.length,
            successCount,
            errorCount,
            elapsedTime,
            throughputPerMinute: throughput,
            stats,
            results,
          },
          null,
          2
        )
      );
      console.log(`\nResults saved to ${resultsPath}`);
    }

    // Shutdown
    await cluster.shutdown();

    // Exit with appropriate code
    if (errorCount === 0) {
      process.exit(0);
    } else if (errorCount < successCount) {
      process.exit(2); // Partial failure
    } else {
      process.exit(1); // All failed
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
