import { Prisma } from '@prisma/client';
import { sqlServerInput, sqlServerOutput, sqlServerSql } from './sqlserver.extension';

describe('SQL Server application contract', () => {
  it('encodes nested writes without changing JSON keys or selections', () => {
    const args = { data: { preferences: { mode: 'insensitive', where: [1] }, conversations: { create: { title: 'hello' } } }, select: { preferences: true, role: true } };
    expect(sqlServerInput('User', args)).toEqual({ ...args, data: { ...args.data, preferences: JSON.stringify(args.data.preferences) } });
    expect(sqlServerOutput('User', { preferences: '{"where":[1]}' })).toMatchObject({ preferences: { where: [1] } });
  });
  it('handles both null sentinels and rejects unsupported filters and enums', () => {
    expect(sqlServerInput('User', { data: { preferences: Prisma.DbNull } })).toEqual({ data: { preferences: null } });
    expect(sqlServerInput('User', { data: { preferences: Prisma.JsonNull } })).toEqual({ data: { preferences: 'null' } });
    expect(() => sqlServerInput('User', { where: { preferences: { path: ['x'], equals: 1 } } })).toThrow();
    expect(() => sqlServerInput('User', { data: { role: 'INVALID' } })).toThrow();
    expect(sqlServerInput('User', { orderBy: { role: 'asc' } })).toEqual({ orderBy: { role: 'asc' } });
  });
  it('translates known raw SQL while retaining pagination placeholders and locks', () => {
    expect(sqlServerSql('SELECT * FROM projects WHERE id = __PARAM_0__::uuid FOR UPDATE')).toContain('WITH (UPDLOCK, HOLDLOCK)');
    expect(sqlServerSql('ORDER BY tr.rank DESC NULLS LAST LIMIT __PARAM_0__::int OFFSET __PARAM_1__::int')).toBe('ORDER BY CASE WHEN tr.rank IS NULL THEN 1 ELSE 0 END, tr.rank DESC OFFSET __PARAM_1__ ROWS FETCH NEXT __PARAM_0__ ROWS ONLY');
  });
});
