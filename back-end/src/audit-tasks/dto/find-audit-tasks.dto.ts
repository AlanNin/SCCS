import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class FindAuditTasksDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'DONE'] })
  @IsOptional()
  @IsIn(['PENDING', 'DONE'])
  status?: 'PENDING' | 'DONE';
}
