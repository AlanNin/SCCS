import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { BinsModule } from './bins/bins.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { AuditPlansModule } from './audit-plans/audit-plans.module.js';
import { AuditTasksModule } from './audit-tasks/audit-tasks.module.js';

@Module({
  imports: [PrismaModule, BinsModule, ScoringModule, AuditPlansModule, AuditTasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
