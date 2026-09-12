import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScoringService } from './scoring.service.js';

@ApiTags('scoring')
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @ApiOperation({ summary: 'Recompute risk scores for every bin' })
  @Post('recompute')
  recompute() {
    return this.scoringService.recomputeAll();
  }
}
