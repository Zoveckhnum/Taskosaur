import { createHash } from 'node:crypto';

type Line = { code: string; name: string; quantity: number; cadence: 'once' | 'monthly' };
export type ExecutionTask = {
  key: string;
  phase: string;
  title: string;
  description: string;
  serviceCode?: string;
  parentKey?: string;
  dependsOn: string[];
  type: 'EPIC' | 'TASK';
  priority: 'HIGH' | 'MEDIUM';
};
export type ExecutionPlan = {
  version: 'iqualitys-execution-plan-v1';
  title: string;
  tasks: ExecutionTask[];
  hash: string;
  summary: { phases: number; activities: number; dependencies: number; recurringServices: number };
};
const family = (code: string) =>
  code.startsWith('ADM')
    ? 'Administración'
    : code.startsWith('INF')
      ? 'Infraestructura'
      : code.startsWith('SEC')
        ? 'Seguridad'
        : code.startsWith('AI')
          ? 'Administración IA'
          : code.startsWith('WA')
            ? 'WhatsApp'
            : (
                {
                  D: 'Diagnóstico',
                  P: 'Procesos',
                  T: 'Talento',
                  M: 'Medición',
                  B: 'BI y datos',
                  S: 'Tecnología',
                  A: 'Automatización e IA',
                  C: 'Continuidad',
                  H: 'Servicios adicionales',
                } as Record<string, string>
              )[code[0]] || 'Ejecución';
const steps = (code: string, cadence: string) => {
  if (cadence === 'monthly')
    return [
      'Definir responsables, canales y nivel de atención',
      'Activar el ciclo operativo y realizar la primera revisión',
      'Documentar continuidad, controles y reporte periódico',
    ];
  if (code.startsWith('D'))
    return [
      'Preparar alcance, agenda y fuentes autorizadas',
      'Realizar levantamiento y analizar la evidencia',
      'Preparar, presentar y validar el diagnóstico',
    ];
  if (code.startsWith('P'))
    return [
      'Levantar el proceso actual y sus responsables',
      'Diseñar y validar el proceso objetivo',
      'Documentar, comunicar y acompañar la adopción',
    ];
  if (code.startsWith('T'))
    return [
      'Confirmar alcance, participantes y criterios',
      'Diseñar y ejecutar la intervención de talento',
      'Validar resultados y entregar materiales',
    ];
  if (code.startsWith('M'))
    return [
      'Confirmar decisiones, fuentes e indicadores',
      'Diseñar reglas de cálculo, metas y responsables',
      'Validar mediciones y entregar la ficha de control',
    ];
  if (code.startsWith('B'))
    return [
      'Confirmar fuentes, accesos, indicadores y criterios',
      'Modelar datos y construir el tablero',
      'Validar cifras, realizar pruebas de usuario y liberar',
    ];
  if (code.startsWith('S'))
    return [
      'Definir arquitectura, accesos y criterios técnicos',
      'Configurar o desarrollar la solución',
      'Ejecutar pruebas, desplegar y entregar documentación',
    ];
  if (code.startsWith('A'))
    return [
      'Delimitar caso de uso, datos, riesgos y supervisión',
      'Construir y probar el flujo automatizado',
      'Validar controles, capacitar y liberar de forma supervisada',
    ];
  if (code.startsWith('ADM'))
    return [
      'Recabar datos administrativos y autorizaciones',
      'Coordinar el alta o la contratación con el titular',
      'Registrar responsables, vigencias y comprobantes',
    ];
  if (code.startsWith('INF'))
    return [
      'Confirmar accesos, dominio y requisitos de infraestructura',
      'Configurar, asegurar y verificar la infraestructura',
      'Desplegar, documentar y entregar accesos e inventario',
    ];
  if (code.startsWith('SEC'))
    return [
      'Confirmar activos, fuentes, alcance y riesgos',
      'Configurar controles, reglas o respuesta especializada',
      'Validar hallazgos, evidencias y continuidad operativa',
    ];
  if (code.startsWith('AI'))
    return [
      'Confirmar cuentas, credenciales y presupuesto autorizado',
      'Configurar controles de consumo y seguridad',
      'Validar operación y entregar registro técnico',
    ];
  if (code.startsWith('WA'))
    return [
      'Confirmar titularidad, cuenta empresarial y requisitos del canal',
      'Configurar canal, plantillas, webhooks y controles',
      'Probar extremo a extremo y entregar operación',
    ];
  return [
    'Confirmar alcance y prerrequisitos',
    'Ejecutar el servicio contratado',
    'Validar y entregar el resultado',
  ];
};
const slug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
export function buildCustomerExecutionPlan(title: string, lines: Line[]): ExecutionPlan {
  const tasks: ExecutionTask[] = [],
    phaseEpics = new Map<string, string>(),
    lastByService = new Map<string, string>();
  tasks.push({
    key: 'inicio',
    phase: 'Inicio',
    title: 'Confirmar inicio y criterios de aceptación',
    description:
      'Confirmar responsables, alcance firmado, calendario, riesgos, comunicación y criterios de aceptación antes de ejecutar servicios.',
    dependsOn: [],
    type: 'TASK',
    priority: 'HIGH',
  });
  for (const line of lines) {
    const phase = line.cadence === 'monthly' ? 'Operación recurrente' : family(line.code);
    let epic = phaseEpics.get(phase);
    if (!epic) {
      epic = 'fase-' + slug(phase);
      phaseEpics.set(phase, epic);
      tasks.push({
        key: epic,
        phase,
        title: phase,
        description: `Agrupa las actividades de ${phase.toLowerCase()} incluidas en la contratación.`,
        dependsOn: [],
        type: 'EPIC',
        priority: 'MEDIUM',
      });
    }
    let prior = 'inicio';
    const values = steps(line.code, line.cadence);
    values.forEach((label, index) => {
      const key = `${line.code.toLowerCase()}-${index + 1}`,
        description = `${line.name}. ${label}. Cantidad contratada: ${line.quantity}. Criterio de terminación: evidencia revisada y resultado documentado.`;
      tasks.push({
        key,
        phase,
        title: `${label} · ${line.name}`,
        description,
        serviceCode: line.code,
        parentKey: epic,
        dependsOn: [prior],
        type: 'TASK',
        priority: index === values.length - 1 ? 'HIGH' : 'MEDIUM',
      });
      prior = key;
    });
    lastByService.set(line.code, prior);
  }
  const diagnostics = [...lastByService]
      .filter(([code]) => ['D01', 'D02', 'D03'].includes(code))
      .map(([, key]) => key),
    once = lines
      .filter((l) => l.cadence === 'once')
      .map((l) => lastByService.get(l.code)!)
      .filter(Boolean);
  if (lastByService.has('ADM01') && lastByService.has('INF01')) {
    const task = tasks.find((t) => t.key === 'inf01-1');
    if (task) task.dependsOn = [lastByService.get('ADM01')!];
  }
  if (lastByService.has('INF01'))
    for (const code of ['INF02', 'INF03', 'INF04']) {
      const task = tasks.find((t) => t.key === `${code.toLowerCase()}-1`);
      if (task) task.dependsOn = [lastByService.get('INF01')!];
    }
  if (diagnostics.length)
    for (const task of tasks.filter(
      (t) =>
        t.serviceCode &&
        !t.serviceCode.startsWith('D') &&
        t.key.endsWith('-1') &&
        !t.serviceCode.startsWith('ADM'),
    ))
      task.dependsOn = [...new Set([...task.dependsOn, ...diagnostics])];
  tasks.push({
    key: 'qa',
    phase: 'Cierre',
    title: 'Ejecutar QA integral y revisión interna',
    description:
      'Comprobar entregables, evidencias, seguridad, conciliación de alcance y criterios de aceptación antes de presentar al cliente.',
    dependsOn: [...new Set(once.length ? once : ['inicio'])],
    type: 'TASK',
    priority: 'HIGH',
  });
  tasks.push({
    key: 'aceptacion',
    phase: 'Cierre',
    title: 'Obtener validación y aceptación del cliente',
    description:
      'Presentar los entregables, registrar observaciones, resolver pendientes acordados y conservar la aceptación de entrega.',
    dependsOn: ['qa'],
    type: 'TASK',
    priority: 'HIGH',
  });
  tasks.push({
    key: 'cierre',
    phase: 'Cierre',
    title: 'Entregar documentación y cerrar el proyecto',
    description:
      'Entregar inventario, accesos, manuales, respaldos aplicables, pendientes y ruta de continuidad. Cerrar solo con aceptación registrada.',
    dependsOn: ['aceptacion'],
    type: 'TASK',
    priority: 'HIGH',
  });
  for (const line of lines.filter((l) => l.cadence === 'monthly')) {
    const first = tasks.find((t) => t.key === `${line.code.toLowerCase()}-1`);
    if (first) first.dependsOn = ['aceptacion'];
  }
  const body = { version: 'iqualitys-execution-plan-v1' as const, title, tasks };
  const hash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  return {
    ...body,
    hash,
    summary: {
      phases: new Set(tasks.map((t) => t.phase)).size,
      activities: tasks.filter((t) => t.type === 'TASK').length,
      dependencies: tasks.reduce((n, t) => n + t.dependsOn.length, 0),
      recurringServices: lines.filter((l) => l.cadence === 'monthly').length,
    },
  };
}
