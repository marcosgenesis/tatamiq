import {
  adjustMonthlyFeeSchema,
  createMonthlyFeeSchema,
  listMonthlyFeesResponseSchema,
  manualPaymentSchema,
  monthlyFeeDetailSchema,
  monthlyFeeSchema,
  paymentReceiptSchema,
  rejectReceiptSchema,
  waiveMonthlyFeeSchema,
} from "@tatamiq/contracts";
import { createZodDto } from "nestjs-zod";

export class MonthlyFeeDto extends createZodDto(monthlyFeeSchema) {}
export class MonthlyFeeDetailDto extends createZodDto(monthlyFeeDetailSchema) {}
export class ListMonthlyFeesResponseDto extends createZodDto(listMonthlyFeesResponseSchema) {}
export class CreateMonthlyFeeDto extends createZodDto(createMonthlyFeeSchema) {}
export class AdjustMonthlyFeeDto extends createZodDto(adjustMonthlyFeeSchema) {}
export class WaiveMonthlyFeeDto extends createZodDto(waiveMonthlyFeeSchema) {}
export class ManualPaymentDto extends createZodDto(manualPaymentSchema) {}
export class PaymentReceiptDto extends createZodDto(paymentReceiptSchema) {}
export class RejectReceiptDto extends createZodDto(rejectReceiptSchema) {}
