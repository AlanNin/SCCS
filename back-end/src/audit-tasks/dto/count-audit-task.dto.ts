import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CountAuditTaskDto {
  @ApiProperty({ description: 'Quantity physically counted at the bin', minimum: 0 })
  @IsInt()
  @Min(0)
  countedQuantity!: number;

  @ApiProperty({ enum: ['PASS', 'FAIL'] })
  @IsIn(['PASS', 'FAIL'])
  result!: 'PASS' | 'FAIL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
