// src/dto/payment.dto.ts
import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsNumber,
    IsPositive,
    IsUUID,
  } from 'class-validator';
  import { PaymentMethod } from '../models/Payment';
  
  // ─── RECORD PAYMENT ───────────────────────────────────────────────────────────
  
  export class RecordPaymentDto {
    @IsUUID()
    invoiceId!: string;
  
    @IsNumber({}, { message: 'Amount must be a number' })
    @IsPositive({ message: 'Amount must be greater than 0' })
    amount!: number;
  
    @IsEnum(PaymentMethod, { message: 'Invalid payment method' })
    method!: PaymentMethod;
  
    @IsOptional()
    @IsString()
    reference?: string; // bank transfer ref, cheque number, etc.
  
    @IsOptional()
    @IsString()
    notes?: string;
  
    @IsDateString({}, { message: 'Invalid payment date' })
    paidAt!: string;
  }
  
  // ─── QUERY PARAMS ─────────────────────────────────────────────────────────────
  
  export class PaymentQueryDto {
    @IsOptional()
    @IsUUID()
    invoiceId?: string;
  
    @IsOptional()
    @IsEnum(PaymentMethod)
    method?: PaymentMethod;
  
    @IsOptional()
    @IsDateString()
    fromDate?: string;
  
    @IsOptional()
    @IsDateString()
    toDate?: string;
  
    @IsOptional()
    page?: number;
  
    @IsOptional()
    limit?: number;
  }