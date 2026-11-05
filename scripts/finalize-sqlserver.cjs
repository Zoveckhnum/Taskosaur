// Both generated clients must share Prisma's enum/null sentinels. Their schemas
// differ only at the persistence boundary, not at the application API boundary.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../backend/generated/sqlserver/index.js');
const source = fs.readFileSync(file, 'utf8');
if (!source.includes("require('./runtime/library.js')")) throw new Error('Unexpected Prisma generator output; review SQL Server runtime compatibility');
fs.writeFileSync(file, source.replace("require('./runtime/library.js')", "require('@prisma/client/runtime/library.js')"));
