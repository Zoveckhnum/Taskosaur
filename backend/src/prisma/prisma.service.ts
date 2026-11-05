import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createAuditExtension } from './audit.middleware';
import { createSqlServerExtension } from './sqlserver.extension';
import { PrismaClient as SqlServerClient } from '../../generated/sqlserver';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    if (process.env.DATABASE_URL?.startsWith('sqlserver://')) {
      // One explicit boundary preserves the public model types and enum API while
      // using the native SQL Server engine. All JSON conversion lives in the extension.
      const client = new SqlServerClient();
      return client
        .$extends(createSqlServerExtension())
        .$extends(createAuditExtension())
        .$extends({
          client: {
            async onModuleInit() {
              await client.$connect();
            },
            async onModuleDestroy() {
              await client.$disconnect();
            },
          },
        }) as unknown as this;
    }
    return this.$extends(createAuditExtension()) as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
