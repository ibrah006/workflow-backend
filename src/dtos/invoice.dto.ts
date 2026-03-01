// src/dto/invoice.dto.ts
import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
    IsDateString,
    IsNumber,
    IsArray,
    ValidateNested,
    IsPositive,
    Min,
    Max,
    IsUUID,
    IsNotEmpty,
    ArrayMinSize,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { InvoiceStatus } from '../models/Invoice';
  
  // ─── LINE ITEM ────────────────────────────────────────────────────────────────
  
  export class LineItemDto {
    @IsOptional()
    @IsUUID()
    id?: string;
  
    @IsNotEmpty({ message: 'Line item description is required' })
    @IsString()
    description!: string;
  
    @IsOptional()
    @IsString()
    unit?: string;
  
    @IsNumber({}, { message: 'Quantity must be a number' })
    @IsPositive({ message: 'Quantity must be greater than 0' })
    quantity!: number;
  
    @IsNumber({}, { message: 'Unit price must be a number' })
    @Min(0, { message: 'Unit price cannot be negative' })
    unitPrice!: number;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    sortOrder?: number;
  }
  
  // ─── CREATE INVOICE ───────────────────────────────────────────────────────────
  
  export class CreateInvoiceDto {
    // Client
    @IsNotEmpty({ message: 'Client ID is required' })
    @IsString()
    clientId!: string;
  
    @IsNotEmpty({ message: 'Client name is required' })
    @IsString()
    clientName!: string;
  
    @IsOptional()
    @IsEmail({}, { message: 'Invalid client email' })
    clientEmail?: string;
  
    @IsOptional()
    @IsString()
    clientAddress?: string;
  
    @IsOptional()
    @IsString()
    clientTrn?: string;
  
    // Dates
    @IsDateString({}, { message: 'Invalid issue date' })
    issueDate!: string;
  
    @IsDateString({}, { message: 'Invalid due date' })
    dueDate!: string;
  
    // Financials
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number; // defaults to 5 in service
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;
  
    // Notes
    @IsOptional()
    @IsString()
    notes?: string;
  
    @IsOptional()
    @IsString()
    terms?: string;
  
    // Line items
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one line item is required' })
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    lineItems!: LineItemDto[];
  
    // Status — allows creating a draft or sending directly
    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;
  }
  
  // ─── UPDATE INVOICE ───────────────────────────────────────────────────────────
  
  export class UpdateInvoiceDto {
    @IsOptional()
    @IsString()
    clientId?: string;
  
    @IsOptional()
    @IsString()
    clientName?: string;
  
    @IsOptional()
    @IsEmail()
    clientEmail?: string;
  
    @IsOptional()
    @IsString()
    clientAddress?: string;
  
    @IsOptional()
    @IsString()
    clientTrn?: string;
  
    @IsOptional()
    @IsDateString()
    issueDate?: string;
  
    @IsOptional()
    @IsDateString()
    dueDate?: string;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number;
  
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;
  
    @IsOptional()
    @IsString()
    notes?: string;
  
    @IsOptional()
    @IsString()
    terms?: string;
  
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => LineItemDto)
    lineItems?: LineItemDto[];
  
    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;
  }
  
  // ─── QUERY PARAMS ─────────────────────────────────────────────────────────────
  
  export class InvoiceQueryDto {
    @IsOptional()
    @IsEnum(InvoiceStatus)
    status?: InvoiceStatus;
  
    @IsOptional()
    @IsString()
    search?: string;
  
    @IsOptional()
    @IsString()
    clientId?: string;
  
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
  
    @IsOptional()
    @IsString()
    sortBy?: 'createdAt' | 'dueDate' | 'totalAmount' | 'invoiceNumber';
  
    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';
  }