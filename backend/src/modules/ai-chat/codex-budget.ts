import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
}
interface Entry {
  id: string;
  day: string;
  user: string;
  status: 'pending' | 'reported' | 'unknown';
  tokens: number;
}
interface Ledger {
  version: 1;
  entries: Entry[];
}
export interface BudgetPolicy {
  daily: number;
  perUserDaily: number;
  reservation: number;
}

export class CodexBudget {
  private readonly file: string;
  private readonly lock: string;
  constructor(
    private readonly directory: string,
    private readonly policy: BudgetPolicy,
  ) {
    for (const number of Object.values(policy))
      if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid Codex budget');
    if (policy.reservation > Math.min(policy.daily, policy.perUserDaily))
      throw new Error('Codex reservation exceeds budget');
    mkdirSync(directory, { recursive: true });
    if (lstatSync(directory).isSymbolicLink())
      throw new Error('Codex budget directory must not be a link');
    this.file = join(directory, 'usage.json');
    this.lock = join(directory, 'usage.lock');
  }

  private load(): Ledger {
    if (!existsSync(this.file)) return { version: 1, entries: [] };
    const stat = lstatSync(this.file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
      throw new Error('Invalid Codex ledger');
    const ledger = JSON.parse(readFileSync(this.file, 'utf8')) as Ledger;
    if (ledger.version !== 1 || !Array.isArray(ledger.entries) || ledger.entries.length > 4000)
      throw new Error('Invalid Codex ledger');
    const ids = new Set<string>();
    for (const entry of ledger.entries) {
      if (
        !entry ||
        typeof entry.id !== 'string' ||
        ids.has(entry.id) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.day) ||
        !/^[a-f0-9]{64}$/.test(entry.user) ||
        !['pending', 'unknown', 'reported'].includes(entry.status) ||
        !Number.isSafeInteger(entry.tokens) ||
        entry.tokens < 0
      )
        throw new Error('Invalid Codex ledger entry');
      ids.add(entry.id);
    }
    return ledger;
  }

  private mutate<T>(fn: (ledger: Ledger) => T): T {
    const fd = openSync(this.lock, 'wx');
    try {
      writeFileSync(fd, JSON.stringify({ pid: process.pid, date: new Date().toISOString() }));
      const ledger = this.load();
      const result = fn(ledger);
      const temporary = this.file + '.' + randomUUID() + '.tmp';
      const output = openSync(temporary, 'wx');
      try {
        writeFileSync(output, JSON.stringify(ledger));
        fsyncSync(output);
      } finally {
        closeSync(output);
      }
      renameSync(temporary, this.file);
      return result;
    } finally {
      closeSync(fd);
      unlinkSync(this.lock);
    }
  }

  reserve(userId: string, now = new Date()): string {
    const user = createHash('sha256').update(userId).digest('hex');
    const day = now.toISOString().slice(0, 10);
    return this.mutate((ledger) => {
      if (ledger.entries.length >= 4000)
        throw new Error('Codex ledger full; operator archival required');
      const today = ledger.entries.filter((entry) => entry.day === day);
      if (
        today.reduce((sum, entry) => sum + entry.tokens, 0) + this.policy.reservation >
          this.policy.daily ||
        today.filter((entry) => entry.user === user).reduce((sum, entry) => sum + entry.tokens, 0) +
          this.policy.reservation >
          this.policy.perUserDaily
      )
        throw new Error('Presupuesto diario de Codex agotado');
      const id = randomUUID();
      ledger.entries.push({ id, day, user, tokens: this.policy.reservation, status: 'pending' });
      return id;
    });
  }

  finish(id: string, usage?: Usage): void {
    this.mutate((ledger) => {
      const entry = ledger.entries.find((item) => item.id === id);
      if (!entry || entry.status !== 'pending')
        throw new Error('Codex reservation missing or already settled');
      if (
        usage &&
        Number.isSafeInteger(usage.input_tokens) &&
        usage.input_tokens >= 0 &&
        Number.isSafeInteger(usage.output_tokens) &&
        usage.output_tokens >= 0
      ) {
        entry.status = 'reported';
        entry.tokens = usage.input_tokens + usage.output_tokens;
      } else entry.status = 'unknown';
    });
  }

  report() {
    const ledger = this.load();
    const day = new Date().toISOString().slice(0, 10);
    const entries = ledger.entries.filter((entry) => entry.day === day);
    return {
      day,
      calls: entries.length,
      tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0),
      pending: entries.filter((entry) => entry.status === 'pending').length,
      unknown: entries.filter((entry) => entry.status === 'unknown').length,
      policy: this.policy,
    };
  }
}
