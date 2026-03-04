/**
 * KeepAI CLI — agent-facing command-line tool.
 *
 * Commands:
 *   init <code>       Pair with KeepAI daemon
 *   run <svc> <method> Execute a service operation
 *   help [svc] [method] Explore services, methods, or method details
 *   status            Check connection status
 *   disconnect        Remove pairing and local identity
 */

import { Command } from 'commander';
import { KeepAI, KeepAIError } from './sdk.js';
import { isPaired, getConfigDir } from './storage.js';
import { EXIT_CODES } from '@keepai/proto';

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

      if (result.helpText) {
        console.log(result.helpText);
      }

      console.log(`\nConfig saved to ${configDir}/`);
      console.log('Run "keepai help" to see available services.');
    } catch (err) {
      handleError(err);
    }
  });

// --- run ---

program
  .command('run <service> [method]')
  .description('Execute a service operation')
  .option('--account <id>', 'Account ID to use')
  .option('--params <json>', 'Parameters as JSON')
  .option('--timeout <ms>', 'Request timeout in milliseconds')
  .option('--raw', 'Output raw JSON')
  .allowUnknownOption(true)
  .action(
    async (
      service: string,
      method: string | undefined,
      opts: { account?: string; params?: string; timeout?: string; raw?: boolean },
      cmd: Command
    ) => {
      try {
        // Check for --help in unknown args → redirect to help RPC
        const rawArgs = cmd.args || [];
        if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
          const keep = new KeepAI();
          const result = await keep.help(service, method);
          console.log(result.text);
          keep.close();
          return;
        }

        // No method → show service help
        if (!method) {
          const keep = new KeepAI();
          const result = await keep.help(service);
          console.log(result.text);
          keep.close();
          return;
        }

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

        // Parse remaining flags as params (skip service and method in args)
        const argStart = method ? 2 : 1;
        const args = cmd.args.slice(argStart);
        for (const arg of args) {
          if (arg.startsWith('--') && arg.includes('=')) {
            const eqIdx = arg.indexOf('=');
            const key = arg.slice(2, eqIdx);
            const value = arg.slice(eqIdx + 1);
            // Parse JSON objects/arrays/booleans/null, keep strings as-is
            // (avoids precision loss for large numeric tokens like pageToken)
            if (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false' || value === 'null') {
              try {
                params[key] = JSON.parse(value);
              } catch {
                params[key] = value;
              }
            } else {
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

          // Pagination hint (to stderr so it doesn't corrupt piped JSON)
          if (result && typeof result === 'object' && 'nextPageToken' in (result as any)) {
            const token = (result as any).nextPageToken;
            console.error(`\nMore results available. Next page: --pageToken=${token}`);
          }
        }

        keep.close();
      } catch (err) {
        handleError(err);
      }
    }
  );

// --- help ---

program
  .command('help [service] [method]')
  .description('Explore available services and methods')
  .action(async (service?: string, method?: string) => {
    try {
      const keep = new KeepAI();
      const result = await keep.help(service, method);
      console.log(result.text);
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

      if (result.helpText) {
        console.log('');
        console.log(result.helpText);
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

function handleError(err: unknown): never {
  if (err instanceof KeepAIError) {
    if (err.text) {
      console.error(err.text);
    } else {
      console.error(`Error: ${err.message}`);
    }
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
