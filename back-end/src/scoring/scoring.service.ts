import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { recomputeAllBinScores } from './scoring.logic.js';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  // Always whole-warehouse: several factors normalize relative to the batch.
  async recomputeAll() {
    const result = await recomputeAllBinScores(this.db);
    this.logger.log(`Recomputed risk scores for ${result.updatedBins} bin(s)`);
    return result;
  }
}
