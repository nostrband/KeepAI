/**
 * KeepAI CLI — agent-facing command-line tool.
 *
 * Commands:
 *   init <code>       Pair with KeepAI daemon
 *   run <svc> <method> Execute a service operation
 *   help [service]    List services/methods or detailed help
 *   status            Check connection status
 *   disconnect        Remove pairing and local identity
 */

import { Command } from 'commander';
import { KeepAI, KeepAIError } from './sdk.js';
import { isPaired, getConfigDir } from './storage.js';
import { EXIT_CODES } from '@keepai/proto';
import type { ServiceHelp } from '@keepai/proto';

const program = new Command();

program
  .name('keepai')
  .description('CLI for KeepAI — safe gate for AI agents')
  .version('0.1.0');

// --- init ---

program
  .command('init <code>')
  .description('Pair with a KeepAI daemon')
  .option('--timeout <ms>', 'Pairing timeout in milliseconds', '30000')
  .action(async (code: string, opts: { timeout: string }) => {
    try {
      const configDir = getConfigDir();

      if (isPaired(configDir)) {
        console.error('Already paired. Run "keepai disconnect" first to re-pair.');
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }

      console.log('Connecting to KeepAI daemon...');

      const result = await KeepAI.init(code, {
        timeout: Number(opts.timeout),
      });

      console.log('✓ Paired successfully\n');

      if (result.services.length > 0) {
        console.log('Available services:');
        for (const svc of result.services) {
          const accounts = svc.accounts?.map((a) => a.id).join(', ') ?? 'none';
          console.log(`  ${svc.service} (${accounts}) — ${svc.methods.length} methods`);
        }
      }

      console.log(`\nConfig saved to ${configDir}/`);
      console.log('Run "keepai help" to see available services.');
    } catch (err) {
      handleError(err);
    }
  });

// --- run ---

program
  .command('run <service> <method>')
  .description('Execute a service operation')
  .option('--account <id>', 'Account ID to use')
  .option('--params <json>', 'Parameters as JSON')
  .option('--timeout <ms>', 'Request timeout in milliseconds')
  .option('--raw', 'Output raw JSON')
  .allowUnknownOption(true)
  .action(
    async (
      service: string,
      method: string,
      opts: { account?: string; params?: string; timeout?: string; raw?: boolean },
      cmd: Command
    ) => {
      try {
        const keep = new KeepAI({
          timeout: opts.timeout ? Number(opts.timeout) : undefined,
        });

        // Build params from --params JSON and/or --key=value flags
        let params: Record<string, unknown> = {};

        if (opts.params) {
          try {
            params = JSON.parse(opts.params);
          } catch {
            console.error('Error: Invalid JSON in --params');
            process.exit(EXIT_CODES.GENERAL_ERROR);
          }
        }

        // Parse remaining flags as params
        const args = cmd.args.slice(2); // skip service and method
        for (const arg of args) {
          if (arg.startsWith('--') && arg.includes('=')) {
            const eqIdx = arg.indexOf('=');
            const key = arg.slice(2, eqIdx);
            const value = arg.slice(eqIdx + 1);
            // Try to parse as JSON, fallback to string
            try {
              params[key] = JSON.parse(value);
            } catch {
              params[key] = value;
            }
          }
        }

        if (opts.account) {
          params.account = opts.account;
        }

        const result = await keep.run(service, method, params);

        if (opts.raw) {
          process.stdout.write(JSON.stringify(result));
        } else {
          console.log(JSON.stringify(result, null, 2));
        }

        keep.close();
      } catch (err) {
        handleError(err);
      }
    }
  );

// --- help ---

program
  .command('help [service]')
  .description('List available services and methods')
  .action(async (service?: string) => {
    try {
      const keep = new KeepAI();
      const result = await keep.help(service);

      if (Array.isArray(result)) {
        // All services
        console.log('Available services:\n');
        for (const svc of result) {
          printServiceHelp(svc);
        }
      } else {
        printServiceHelp(result as ServiceHelp);
      }

      keep.close();
    } catch (err) {
      handleError(err);
    }
  });

// --- status ---

program
  .command('status')
  .description('Check connection status')
  .action(async () => {
    try {
      const keep = new KeepAI();
      const result = await keep.status();

      if (!result.paired) {
        console.log('Not paired with any KeepAI daemon.');
        console.log('Run "keepai init <code>" to pair.');
        process.exit(EXIT_CODES.NOT_PAIRED);
      }

      console.log('Daemon: connected');

      if (result.services && result.services.length > 0) {
        console.log('\nServices:');
        for (const svc of result.services) {
          const accounts = svc.accounts?.map((a) => a.id).join(', ') ?? 'none';
          console.log(`  ${svc.service}: ${accounts}`);
        }
      }

      keep.close();
    } catch (err) {
      handleError(err);
    }
  });

// --- disconnect ---

program
  .command('disconnect')
  .description('Remove pairing and local identity')
  .action(() => {
    try {
      const configDir = getConfigDir();

      if (!isPaired(configDir)) {
        console.log('Not paired.');
        return;
      }

      const keep = new KeepAI();
      keep.disconnect();

      console.log('Disconnected from KeepAI daemon.');
      console.log(`Removed local identity from ${configDir}/`);
    } catch (err) {
      handleError(err);
    }
  });

// --- helpers ---

function printServiceHelp(svc: ServiceHelp): void {
  const accounts = svc.accounts?.map((a) => a.label ?? a.id).join(', ');
  console.log(`  ${svc.name ?? svc.service}`);
  if (accounts) {
    console.log(`    accounts: ${accounts}`);
  }

  for (const m of svc.methods) {
    const padded = m.name.padEnd(28);
    console.log(`    ${padded}${m.description}`);
  }
  console.log('');
}

function handleError(err: unknown): never {
  if (err instanceof KeepAIError) {
    console.error(`Error: ${err.message}`);
    process.exit(err.exitCode);
  }

  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error('Unknown error');
  }
  process.exit(EXIT_CODES.GENERAL_ERROR);
}

// Run
program.parse();
