import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { PrinterStatus } from '../models/Printer';

export class CreatePrinterDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @IsOptional()
  @IsNumber()
  maxWidth?: number;

  @IsOptional()
  @IsNumber()
  printSpeed?: number;
}
