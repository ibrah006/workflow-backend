import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { PrinterStatus } from '../models/Printer';

export class UpdatePrinterDto {
  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @IsOptional()
  @IsNumber()
  printSpeed?: number;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
