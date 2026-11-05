import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CodexBudget } from './codex-budget';

describe('Codex persistent admission budget', () => {
  let directory: string;
  const policy = { daily: 200, perUserDaily: 150, reservation: 100 };
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'taskosaur-budget-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
  it('preserves unknown and interrupted reservations across restarts', () => {
    const first = new CodexBudget(directory, policy);
    first.finish(first.reserve('one'));
    const restarted = new CodexBudget(directory, policy);
    expect(() => restarted.reserve('one')).toThrow('agotado');
    restarted.reserve('two');
    expect(() => new CodexBudget(directory, policy).reserve('three')).toThrow('agotado');
    expect(restarted.report()).toMatchObject({ tokens: 200, pending: 1, unknown: 1 });
  });
  it('charges actual input plus output and rejects repeated settlement', () => {
    const meter = new CodexBudget(directory, policy);
    const id = meter.reserve('one');
    meter.finish(id, { input_tokens: 140, output_tokens: 80, cached_input_tokens: 70 });
    expect(meter.report().tokens).toBe(220);
    expect(() => meter.finish(id)).toThrow();
    expect(() => meter.reserve('two')).toThrow();
    expect(readFileSync(join(directory, 'usage.json'), 'utf8')).not.toContain('one');
  });
  it('refuses corrupt accounting and concurrent writers', () => {
    const meter = new CodexBudget(directory, policy);
    writeFileSync(join(directory, 'usage.json'), '{broken');
    expect(() => meter.reserve('one')).toThrow();
    writeFileSync(join(directory, 'usage.lock'), 'operator must inspect');
    expect(() => meter.reserve('one')).toThrow();
  });
});
