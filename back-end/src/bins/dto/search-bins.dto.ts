import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SearchBinsDto {
  @ApiProperty({ description: 'Bin code substring to search for (case-insensitive)' })
  @IsString()
  @IsNotEmpty()
  q!: string;
}
