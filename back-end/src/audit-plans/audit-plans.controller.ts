import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditPlansService } from './audit-plans.service.js';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto.js';

@ApiTags('audit-plans')
@Controller('audit-plans')
export class AuditPlansController {
  constructor(private readonly auditPlansService: AuditPlansService) {}

  @ApiOperation({ summary: 'Create an audit plan for the top N riskiest bins' })
  @Post()
  create(@Body() dto: CreateAuditPlanDto) {
    return this.auditPlansService.create(dto);
  }

  @ApiOperation({ summary: 'List audit plans with task counts' })
  @Get()
  findAll() {
    return this.auditPlansService.findAll();
  }

  @ApiOperation({ summary: 'Get an audit plan with its tasks' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditPlansService.findOne(id);
  }
}
