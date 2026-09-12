import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { riskBand } from '../common/risk-band.js';
import { requireRelation } from '../common/require-relation.js';

@Injectable()
export class BinsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // Flat list with grouping info, so the front-end can lay bins out per aisle/rack.
  async findAllForHeatmap() {
    const bins = await this.db.orm.public.Bin.select(
      'id',
      'code',
      'riskScore',
      'lastAuditedAt',
      'lastScoredAt',
    )
      .include('rack', (rack) =>
        rack.select('id', 'code').include('aisle', (aisle) =>
          aisle.select('id', 'code').include('warehouse', (wh) => wh.select('id', 'code', 'name')),
        ),
      )
      .orderBy([(b) => b.code.asc()])
      .all();

    return bins.map((bin) => {
      const rack = requireRelation(bin.rack, 'bin.rack');
      const aisle = requireRelation(rack.aisle, 'rack.aisle');
      const warehouse = requireRelation(aisle.warehouse, 'aisle.warehouse');
      return {
        id: bin.id,
        code: bin.code,
        riskScore: bin.riskScore,
        band: riskBand(bin.riskScore),
        lastAuditedAt: bin.lastAuditedAt,
        lastScoredAt: bin.lastScoredAt,
        rack: { id: rack.id, code: rack.code },
        aisle: { id: aisle.id, code: aisle.code },
        warehouse,
      };
    });
  }

  async findOne(id: number) {
    const bin = await this.db.orm.public.Bin.where({ id })
      .include('rack', (rack) =>
        rack.select('id', 'code').include('aisle', (aisle) =>
          aisle.select('id', 'code').include('warehouse', (wh) => wh.select('id', 'code', 'name')),
        ),
      )
      .include('pallets', (pallets) =>
        pallets
          .select('id', 'code')
          .include('items', (items) => items.include('product')),
      )
      .first();

    if (!bin) throw new NotFoundException(`Bin ${id} not found`);

    const rack = requireRelation(bin.rack, 'bin.rack');
    const aisle = requireRelation(rack.aisle, 'rack.aisle');
    const warehouse = requireRelation(aisle.warehouse, 'aisle.warehouse');

    return {
      id: bin.id,
      code: bin.code,
      riskScore: bin.riskScore,
      band: riskBand(bin.riskScore),
      scoreFactors: bin.scoreFactors,
      lastAuditedAt: bin.lastAuditedAt,
      lastScoredAt: bin.lastScoredAt,
      rack: { id: rack.id, code: rack.code },
      aisle: { id: aisle.id, code: aisle.code },
      warehouse,
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
    };
  }

  // Powers "search or scan bin code" on the mobile count flow.
  async search(query: string) {
    const bins = await this.db.orm.public.Bin.select('id', 'code', 'riskScore', 'lastAuditedAt')
      .where((b) => b.code.ilike(`%${query}%`))
      .include('rack', (rack) =>
        rack.select('code').include('aisle', (aisle) => aisle.select('code')),
      )
      .orderBy([(b) => b.code.asc()])
      .limit(20)
      .all();

    return bins.map((bin) => {
      const rack = requireRelation(bin.rack, 'bin.rack');
      const aisle = requireRelation(rack.aisle, 'rack.aisle');
      return {
        id: bin.id,
        code: bin.code,
        riskScore: bin.riskScore,
        band: riskBand(bin.riskScore),
        lastAuditedAt: bin.lastAuditedAt,
        rack: { code: rack.code },
        aisle: { code: aisle.code },
      };
    });
  }
}
