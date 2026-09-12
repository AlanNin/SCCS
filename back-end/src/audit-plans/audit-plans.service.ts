import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { riskBand } from '../common/risk-band.js';
import { CreateAuditPlanDto } from './dto/create-audit-plan.dto.js';

@Injectable()
export class AuditPlansService {
  private readonly logger = new Logger(AuditPlansService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  // "Create Plan -> Top N risky bins", saved as tasks with status PENDING.
  async create(dto: CreateAuditPlanDto) {
    const topBins = await this.db.orm.public.Bin.select('id', 'riskScore')
      .orderBy([(b) => b.riskScore.desc()])
      .limit(dto.topN)
      .all();

    if (topBins.length === 0) {
      throw new NotFoundException('No bins exist yet - seed the warehouse first.');
    }

    const expectedQuantityByBin = await this.expectedQuantitiesFor(topBins.map((b) => b.id));
    const name = dto.name ?? `Top ${topBins.length} risk audit - ${new Date().toISOString().slice(0, 10)}`;

    return this.db.transaction(async (tx) => {
      const plan = await tx.orm.public.AuditPlan.create({ name, topN: dto.topN });

      for (const bin of topBins) {
        await tx.orm.public.AuditTask.create({
          planId: plan.id,
          binId: bin.id,
          riskScoreAtCreation: bin.riskScore,
          expectedQuantity: expectedQuantityByBin.get(bin.id) ?? 0,
          status: 'PENDING',
        });
      }

      const created = await this.findOne(plan.id, tx);
      this.logger.log(
        `Created audit plan ${plan.id} "${name}" with ${topBins.length} task(s)`,
      );
      return created;
    });
  }

  async findAll() {
    const plans = await this.db.orm.public.AuditPlan.include('tasks', (tasks) =>
      tasks.select('status'),
    )
      .orderBy([(p) => p.createdAt.desc()])
      .all();

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      topN: plan.topN,
      createdAt: plan.createdAt,
      taskCount: plan.tasks.length,
      pendingCount: plan.tasks.filter((t) => t.status === 'PENDING').length,
      doneCount: plan.tasks.filter((t) => t.status === 'DONE').length,
    }));
  }

  // Optional tx handle lets `create()` read back the plan in the same transaction.
  async findOne(id: number, dbHandle: Pick<Db, 'orm'> = this.db) {
    const plan = await dbHandle.orm.public.AuditPlan.where({ id })
      .include('tasks', (tasks) =>
        tasks
          .orderBy((t) => t.riskScoreAtCreation.desc())
          .include('bin', (bin) => bin.select('id', 'code')),
      )
      .first();

    if (!plan) throw new NotFoundException(`Audit plan ${id} not found`);

    return {
      id: plan.id,
      name: plan.name,
      topN: plan.topN,
      createdAt: plan.createdAt,
      tasks: plan.tasks.map((task) => ({
        id: task.id,
        status: task.status,
        riskScoreAtCreation: task.riskScoreAtCreation,
        band: riskBand(task.riskScoreAtCreation),
        expectedQuantity: task.expectedQuantity,
        countedQuantity: task.countedQuantity,
        result: task.result,
        completedAt: task.completedAt,
        bin: task.bin,
      })),
    };
  }

  private async expectedQuantitiesFor(binIds: number[]): Promise<Map<number, number>> {
    const pallets = await this.db.orm.public.Pallet.select('binId')
      .where((p) => p.binId.in(binIds))
      .include('items', (items) => items.select('quantity'))
      .all();

    const totals = new Map<number, number>();
    for (const pallet of pallets) {
      if (pallet.binId === null) continue;
      const sum = pallet.items.reduce((acc, item) => acc + item.quantity, 0);
      totals.set(pallet.binId, (totals.get(pallet.binId) ?? 0) + sum);
    }
    return totals;
  }
}
