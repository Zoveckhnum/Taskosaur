import { Prisma } from '@prisma/client';

type Row = Record<string, unknown>;
const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
const enums = new Map(
  Prisma.dmmf.datamodel.enums.map((item) => [item.name, item.values.map((v) => v.name)]),
);
const record = (value: unknown): value is Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

/** Translate the application's JSON/list contract to SQL Server NVARCHAR(MAX). */
export function sqlServerInput(
  model: string,
  value: unknown,
  context: 'args' | 'data' | 'filter' | 'selection' | 'order' = 'args',
): unknown {
  if (Array.isArray(value)) return value.map((item) => sqlServerInput(model, item, context));
  if (!record(value)) return value;
  const fields = models.get(model)?.fields ?? [];
  const result: Row = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'mode' && item === 'insensitive') continue; // Database uses a CI collation.
    const field = fields.find((candidate) => candidate.name === key);
    if (field?.kind === 'object') {
      result[key] = sqlServerInput(field.type, item, context);
    } else if (
      field &&
      (field.type === 'Json' || field.isList) &&
      ['data', 'filter'].includes(context)
    ) {
      const encode = (input: unknown): string | null | undefined => {
        if (input === undefined) return undefined;
        if (input === null || input === Prisma.DbNull) return null;
        if (input === Prisma.JsonNull) return 'null';
        return JSON.stringify(input);
      };
      if (context === 'filter' && record(item)) {
        if (Object.keys(item).some((k) => !['equals', 'not'].includes(k)))
          throw new Error(`Unsupported SQL Server JSON filter: ${model}.${key}`);
        result[key] = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, encode(v)]));
      } else if (record(item) && field.isList && 'set' in item) result[key] = encode(item.set);
      else result[key] = encode(item);
    } else {
      if (field?.kind === 'enum' && context === 'data') {
        const enumValue = record(item) && 'set' in item ? item.set : item;
        if (
          enumValue != null &&
          (typeof enumValue !== 'string' || !enums.get(field.type)?.includes(enumValue))
        )
          throw new Error(`Invalid ${field.type}`);
      }
      const next = ['select', 'include'].includes(key)
        ? 'selection'
        : key === 'orderBy'
          ? 'order'
          : ['where', 'cursor', 'connect', 'disconnect', 'delete', 'deleteMany'].includes(key)
            ? 'filter'
            : ['data', 'create', 'update', 'updateMany'].includes(key)
              ? 'data'
              : context;
      result[key] = sqlServerInput(model, item, next);
    }
  }
  return result;
}

export function sqlServerOutput(model: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sqlServerOutput(model, item));
  if (!record(value)) return value;
  const result = { ...value };
  for (const field of models.get(model)?.fields ?? []) {
    const item = result[field.name];
    if (field.kind === 'object') result[field.name] = sqlServerOutput(field.type, item);
    else if ((field.type === 'Json' || field.isList) && typeof item === 'string')
      result[field.name] = JSON.parse(item) as unknown;
  }
  return result;
}

export function sqlServerSql(text: string): string {
  return text
    .replace(/([\w.]+)->>'([\w]+)'/g, "JSON_VALUE($1, '$.$2')")
    .replace(/::(?:uuid|text|bigint|integer|int|"[A-Za-z]+")/g, '')
    .replace(/COUNT\(\*\)/gi, 'COUNT_BIG(*)')
    .replace(/\bDATE\(([^)]+)\)/gi, 'CAST($1 AS date)')
    .replace(/([\w.]+) (ASC|DESC) NULLS LAST/gi, 'CASE WHEN $1 IS NULL THEN 1 ELSE 0 END, $1 $2')
    .replace(
      /FROM projects WHERE ([^\n]+) FOR UPDATE/gi,
      'FROM projects WITH (UPDLOCK, HOLDLOCK) WHERE $1',
    )
    .replace(/DATE_TRUNC\('day',\s*([^)]*)\)/gi, 'CAST($1 AS date)')
    .replace(/\bLIMIT\s+([^\s]+)\s+OFFSET\s+([^\s;]+)/gi, 'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
}

export function createSqlServerExtension() {
  return Prisma.defineExtension({
    name: 'sqlserver-contract',
    query: {
      async $allOperations({ model, operation, args, query }) {
        if (!model) {
          // Sql carries its parameter values separately: never interpolate them.
          if (
            operation === '$queryRaw' &&
            record(args) &&
            Array.isArray(args.strings) &&
            Array.isArray(args.values)
          ) {
            // Translate the complete SQL so LIMIT/OFFSET placeholders can swap positions.
            const sql = args as unknown as Prisma.Sql;
            const markers = sql.strings
              .map((part, i) => part + (i < sql.values.length ? `__PARAM_${i}__` : ''))
              .join('');
            const translated = sqlServerSql(markers);
            const values: unknown[] = [];
            const strings = translated.split(/__PARAM_\d+__/);
            for (const match of translated.matchAll(/__PARAM_(\d+)__/g))
              values.push(sql.values[Number(match[1])]);
            const result: unknown = await query(
              Prisma.sql(
                strings as unknown as TemplateStringsArray,
                ...values,
              ) as unknown as typeof args,
            );
            if (Array.isArray(result))
              return result.map((row: unknown) => {
                if (!record(row)) return row;
                const decoded = { ...row };
                for (const column of ['old_value', 'new_value'])
                  if (typeof decoded[column] === 'string')
                    decoded[column] = JSON.parse(decoded[column]) as unknown;
                return decoded;
              });
            return result;
          }
          return query(args) as Promise<unknown>;
        }
        const input = sqlServerInput(model, args) as typeof args;
        if (operation === 'createMany' && record(input) && input.skipDuplicates) {
          delete input.skipDuplicates;
          const rows = Array.isArray(input.data) ? input.data : [input.data];
          let count = 0;
          for (const data of rows) {
            try {
              const result = (await query({ ...input, data } as typeof args)) as { count: number };
              count += result.count;
            } catch (error: unknown) {
              if (!record(error) || error.code !== 'P2002') throw error;
            }
          }
          return { count };
        }
        return sqlServerOutput(model, await query(input));
      },
    },
  });
}
