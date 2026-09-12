import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module.js';
import { AuditTasksController } from './audit-tasks.controller.js';
import { AuditTasksService } from './audit-tasks.service.js';

@Module({
  imports: [ScoringModule],
  controllers: [AuditTasksController],
  providers: [AuditTasksService],
})
export class AuditTasksModule {}
