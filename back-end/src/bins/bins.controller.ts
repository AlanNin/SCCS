import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BinsService } from './bins.service.js';
import { SearchBinsDto } from './dto/search-bins.dto.js';

@ApiTags('bins')
@Controller('bins')
export class BinsController {
  constructor(private readonly binsService: BinsService) {}

  // Heatmap data source.
  @ApiOperation({ summary: 'List every bin with its risk score and color band, for the heatmap' })
  @Get()
  findAll() {
    return this.binsService.findAllForHeatmap();
  }

  // "Search or scan bin code" - must be declared before ':id' so it isn't
  // shadowed by the numeric-id route.
  @ApiOperation({ summary: 'Search bins by code' })
  @Get('search')
  search(@Query() { q }: SearchBinsDto) {
    return this.binsService.search(q);
  }

  // Score, "why", last audit date, current pallets.
  @ApiOperation({ summary: 'Bin detail: score breakdown, last audit date, current pallets' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.binsService.findOne(id);
  }
}
