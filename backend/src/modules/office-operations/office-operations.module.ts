import { CustomerIntakeController, CustomerIntakeGuard } from './customer-intake.controller';
import { CustomerIntakeService } from './customer-intake.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectsModule } from '../projects/projects.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TasksModule } from '../tasks/tasks.module';
import { OfficeOperationsController, OfficeOperationsGuard } from './office-operations.controller';
import { OfficeOperationsService } from './office-operations.service';
import { OfficeRequestsController } from './office-requests.controller';
@Module({
  imports: [ConfigModule, PrismaModule, TasksModule, WorkspacesModule, ProjectsModule],
  controllers: [CustomerIntakeController, OfficeOperationsController, OfficeRequestsController],
  providers: [
    CustomerIntakeService,
    CustomerIntakeGuard,
    OfficeOperationsService,
    OfficeOperationsGuard,
  ],
})
export class OfficeOperationsModule {}
