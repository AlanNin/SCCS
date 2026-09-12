import { Module } from '@nestjs/common';
import { AuditPlansController } from './audit-plans.controller.js';
import { AuditPlansService } from './audit-plans.service.js';

@Module({
  controllers: [AuditPlansController],
  providers: [AuditPlansService],
})
export class AuditPlansModule {}
