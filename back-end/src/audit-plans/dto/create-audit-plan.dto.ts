import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAuditPlanDto {
  @ApiPropertyOptional({ description: 'Defaults to "Top N risk audit - <date>"' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Number of highest-risk bins to include', minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  topN!: number;
}
