import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditTasksService } from './audit-tasks.service.js';
import { CountAuditTaskDto } from './dto/count-audit-task.dto.js';
import { FindAuditTasksDto } from './dto/find-audit-tasks.dto.js';

@ApiTags('audit-tasks')
@Controller('audit-tasks')
export class AuditTasksController {
  constructor(private readonly auditTasksService: AuditTasksService) {}

  @ApiOperation({ summary: 'List audit tasks, optionally filtered by status' })
  @Get()
  findAll(@Query() query: FindAuditTasksDto) {
    return this.auditTasksService.findAll(query);
  }

  @ApiOperation({
    summary: "Get (or open) the pending audit task for a bin - the mobile count flow's entry point",
  })
  @Get('by-bin/:binId')
  findOrCreateForBin(@Param('binId', ParseIntPipe) binId: number) {
    return this.auditTasksService.findOrCreateForBin(binId);
  }

  @ApiOperation({ summary: 'Get an audit task, including expected pallets/products' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditTasksService.findOne(id);
  }

  @ApiOperation({ summary: 'Submit a count result and trigger a score recompute' })
  @Post(':id/count')
  count(@Param('id', ParseIntPipe) id: number, @Body() dto: CountAuditTaskDto) {
    return this.auditTasksService.count(id, dto);
  }
}
