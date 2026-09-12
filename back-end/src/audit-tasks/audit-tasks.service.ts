import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { riskBand } from '../common/risk-band.js';
import { requireRelation } from '../common/require-relation.js';
import { CountAuditTaskDto } from './dto/count-audit-task.dto.js';
import { FindAuditTasksDto } from './dto/find-audit-tasks.dto.js';

@Injectable()
export class AuditTasksService {
  private readonly logger = new Logger(AuditTasksService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly scoringService: ScoringService,
  ) {}

  // Simple table view, optionally filtered by status.
  async findAll(query: FindAuditTasksDto) {
    const base = this.db.orm.public.AuditTask.include('bin', (bin) => bin.select('id', 'code'))
      .include('plan', (plan) => plan.select('id', 'name'));
    const filtered = query.status ? base.where({ status: query.status }) : base;
    const tasks = await filtered.orderBy([(t) => t.riskScoreAtCreation.desc()]).all();

    return tasks.map((task) => ({
      id: task.id,
      status: task.status,
      riskScoreAtCreation: task.riskScoreAtCreation,
      band: riskBand(task.riskScoreAtCreation),
      expectedQuantity: task.expectedQuantity,
      countedQuantity: task.countedQuantity,
      result: task.result,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      bin: task.bin,
      plan: task.plan,
    }));
  }

  async findOne(id: number) {
    return this.taskDetail(id);
  }

  // Entry point for "search or scan bin code": reuse the bin's pending
  // task if one exists, otherwise open an ad-hoc audit for it.
  async findOrCreateForBin(binId: number) {
    const existing = await this.db.orm.public.AuditTask.where({ binId, status: 'PENDING' })
      .orderBy([(t) => t.createdAt.desc()])
      .first();
    if (existing) return this.taskDetail(existing.id);

    const bin = await this.db.orm.public.Bin.where({ id: binId }).first();
    if (!bin) throw new NotFoundException(`Bin ${binId} not found`);

    const pallets = await this.db.orm.public.Pallet.where({ binId })
      .include('items', (items) => items.select('quantity'))
      .all();
    const expectedQuantity = pallets.reduce(
      (sum, pallet) => sum + pallet.items.reduce((acc, item) => acc + item.quantity, 0),
      0,
    );

    const task = await this.db.orm.public.AuditTask.create({
      binId,
      planId: null,
      riskScoreAtCreation: bin.riskScore,
      expectedQuantity,
      status: 'PENDING',
    });

    this.logger.log(`Opened ad-hoc audit task ${task.id} for bin ${binId}`);

    return this.taskDetail(task.id);
  }

  // "Enter counted quantity, mark pass/fail, save, trigger a recompute."
  async count(id: number, dto: CountAuditTaskDto) {
    const task = await this.db.orm.public.AuditTask.where({ id }).first();
    if (!task) throw new NotFoundException(`Audit task ${id} not found`);
    if (task.status === 'DONE') {
      throw new BadRequestException(`Audit task ${id} was already counted`);
    }

    const completedAt = new Date().toISOString();

    await this.db.transaction(async (tx) => {
      await tx.orm.public.AuditTask.where({ id }).update({
        status: 'DONE',
        countedQuantity: dto.countedQuantity,
        result: dto.result,
        notes: dto.notes ?? null,
        completedAt,
      });
      await tx.orm.public.Bin.where({ id: task.binId }).update({ lastAuditedAt: completedAt });
    });

    this.logger.log(
      `Audit task ${id} completed for bin ${task.binId}: ${dto.result} (counted ${dto.countedQuantity})`,
    );

    await this.scoringService.recomputeAll();

    return this.taskDetail(id);
  }

  private async taskDetail(id: number) {
    const task = await this.db.orm.public.AuditTask.where({ id })
      .include('plan', (plan) => plan.select('id', 'name'))
      .include('bin', (bin) =>
        bin
          .include('rack', (rack) =>
            rack.select('code').include('aisle', (aisle) => aisle.select('code')),
          )
          .include('pallets', (pallets) =>
            pallets
              .select('id', 'code')
              .include('items', (items) => items.include('product')),
          ),
      )
      .first();

    if (!task) throw new NotFoundException(`Audit task ${id} not found`);

    const bin = requireRelation(task.bin, 'auditTask.bin');
    const rack = requireRelation(bin.rack, 'bin.rack');
    const aisle = requireRelation(rack.aisle, 'rack.aisle');

    return {
      id: task.id,
      status: task.status,
      riskScoreAtCreation: task.riskScoreAtCreation,
      band: riskBand(task.riskScoreAtCreation),
      expectedQuantity: task.expectedQuantity,
      countedQuantity: task.countedQuantity,
      result: task.result,
      notes: task.notes,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      plan: task.plan,
      bin: {
        id: bin.id,
        code: bin.code,
        rack: { code: rack.code },
        aisle: { code: aisle.code },
        pallets: bin.pallets.map((pallet) => ({
          id: pallet.id,
          code: pallet.code,
          items: pallet.items.map((item) => {
            const product = requireRelation(item.product, 'palletItem.product');
            return {
              id: item.id,
              quantity: item.quantity,
              product: { id: product.id, sku: product.sku, name: product.name },
            };
          }),
        })),
      },
    };
  }
}
