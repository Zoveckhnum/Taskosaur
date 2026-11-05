const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
require('./generate-sqlserver.cjs');
const cli = require.resolve('prisma/build/index.js');
const sql = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'backend/prisma/sqlserver/schema.prisma', '--script'], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
const { Prisma } = require('@prisma/client');
const models = Prisma.dmmf.datamodel.models;
const enums = new Map(Prisma.dmmf.datamodel.enums.map(e => [e.name, e.values.map(v => v.name)]));
let output = sql;
let constraints = '';
// SQL Server's unfiltered unique indexes allow only one NULL. Match the
// application contract with filtered unique indexes for optional columns.
for (const model of models) {
  const table = model.dbName || model.name;
  const column = name => model.fields.find(f => f.name === name)?.dbName || name;
  const uniquePattern = /,\s*CONSTRAINT \[([^\]]+)\] UNIQUE NONCLUSTERED \(([^)]+)\)/g;
  output = output.replace(uniquePattern, (whole, index, cols) => {
    if (!index.startsWith(table + '_')) return whole;
    const nullable = model.fields.filter(f => !f.isRequired && cols.includes('[' + column(f.name) + ']'));
    if (!nullable.length) return whole;
    constraints += `\nCREATE UNIQUE INDEX [${index}] ON [dbo].[${table}] (${cols}) WHERE ${nullable.map(f => '[' + column(f.name) + '] IS NOT NULL').join(' AND ')};\n`;
    return '';
  });
  output = output.replace(new RegExp('CREATE UNIQUE (?:NONCLUSTERED )?INDEX \\[([^\\]]+)\\] ON \\[dbo\\]\\.\\[' + table + '\\]\\(([^;]+)\\);', 'g'), (whole, index, cols) => {
    const nullable = model.fields.filter(f => !f.isRequired && cols.includes('[' + column(f.name) + ']'));
    return nullable.length ? whole.slice(0, -1) + ' WHERE ' + nullable.map(f => '[' + column(f.name) + '] IS NOT NULL').join(' AND ') + ';' : whole;
  });
  for (const field of model.fields) {
    const col = column(field.name);
    if (field.type === 'Json' || field.kind !== 'object' && field.isList) constraints += `\nALTER TABLE [dbo].[${table}] ADD CONSTRAINT [CK_${table}_${col}_json] CHECK ([${col}] IS NULL OR ISJSON([${col}], VALUE)=1);\n`;
    if (field.kind === 'enum') constraints += `\nALTER TABLE [dbo].[${table}] ADD CONSTRAINT [CK_${table}_${col}_enum] CHECK ([${col}] IN (${enums.get(field.type).map(v => "N'" + v + "'").join(',')}));\n`;
    // Restrictive physical FKs protect raw/external writes. Prisma emulates
    // ownership cascades, avoiding SQL Server's multiple cascade path restriction.
    if (field.relationFromFields?.length) {
      const target = models.find(m => m.name === field.type);
      const columns = field.relationFromFields.map(n => '[' + column(n) + ']').join(',');
      const refs = field.relationToFields.map(n => '[' + (target.fields.find(f => f.name === n)?.dbName || n) + ']').join(',');
      constraints += `\nALTER TABLE [dbo].[${table}] ADD CONSTRAINT [FK_${table}_${field.name}] FOREIGN KEY (${columns}) REFERENCES [dbo].[${target.dbName || target.name}] (${refs}) ON DELETE NO ACTION ON UPDATE NO ACTION;\n`;
    }
  }
}
output = output.replace('COMMIT TRAN;', constraints + '\nCOMMIT TRAN;');
const dir = path.join(root, 'backend/prisma/sqlserver/migrations/202611050001_initial');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'migration.sql'), output);
fs.writeFileSync(path.join(root, 'backend/prisma/sqlserver/migrations/migration_lock.toml'), 'provider = "mssql"\n');
// Rollback intentionally refuses populated tables. Production recovery uses backups.
fs.writeFileSync(path.join(dir, 'down.sql'), '-- Destructive rollback is allowed only for an empty installation.\n' + models.map(m => `IF EXISTS (SELECT 1 FROM [dbo].[${m.dbName || m.name}]) THROW 51000, 'Taskosaur is not empty; restore a verified backup instead', 1;`).join('\n') + '\n' + models.flatMap(m => m.fields.filter(f => f.relationFromFields?.length).map(f => `ALTER TABLE [dbo].[${m.dbName || m.name}] DROP CONSTRAINT [FK_${m.dbName || m.name}_${f.name}];`)).join('\n') + '\n' + [...models].reverse().map(m => `DROP TABLE [dbo].[${m.dbName || m.name}];`).join('\n'));
console.log('SQL Server baseline and guarded rollback generated.');
