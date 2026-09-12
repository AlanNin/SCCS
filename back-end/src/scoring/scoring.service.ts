import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { recomputeAllBinScores } from './scoring.logic.js';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Recomputes every bin's risk score from current activity data and
   * persists both the score and its factor breakdown. Recomputing the
   * whole warehouse (rather than one bin) keeps the min-max normalized
   * factors consistent with each other - the dataset is small enough
   * (tens of bins) that this is cheap.
   */
  async recomputeAll() {
    const result = await recomputeAllBinScores(this.db);
    this.logger.log(`Recomputed risk scores for ${result.updatedBins} bin(s)`);
    return result;
  }
}
