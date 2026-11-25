import { buildCustomerExecutionPlan } from './customer-execution-plan';

describe('customer execution plan', () => {
  it('creates service activities, dependencies and a separate recurring workstream', () => {
    const plan = buildCustomerExecutionPlan('Dashboard de ventas y operaciones', [
      { code: 'D01', name: 'Diagnóstico focalizado', quantity: 1, cadence: 'once' },
      { code: 'B02', name: 'BI para un equipo', quantity: 1, cadence: 'once' },
      { code: 'ADM01', name: 'Contratación asistida', quantity: 1, cadence: 'once' },
      { code: 'INF01', name: 'Puesta en marcha de VPS', quantity: 1, cadence: 'once' },
      { code: 'INF06', name: 'Gestión VPS Esencial', quantity: 1, cadence: 'monthly' },
    ]);
    expect(plan.version).toBe('iqualitys-execution-plan-v1');
    expect(plan.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(plan.summary.recurringServices).toBe(1);
    expect(plan.tasks.find((t) => t.key === 'b02-1')?.dependsOn).toContain('d01-3');
    expect(plan.tasks.find((t) => t.key === 'inf01-1')?.dependsOn).toEqual(
      expect.arrayContaining(['adm01-3', 'd01-3']),
    );
    expect(plan.tasks.find((t) => t.key === 'inf06-1')?.dependsOn).toEqual(['aceptacion']);
    expect(plan.tasks.at(-1)?.key).toBe('cierre');
  });
  it('is deterministic and never duplicates service task keys', () => {
    const lines = [
      { code: 'B01', name: 'Tablero BI inicial', quantity: 1, cadence: 'once' as const },
    ];
    const a = buildCustomerExecutionPlan('Tablero', lines),
      b = buildCustomerExecutionPlan('Tablero', lines);
    expect(a.hash).toBe(b.hash);
    expect(new Set(a.tasks.map((t) => t.key)).size).toBe(a.tasks.length);
  });
});
