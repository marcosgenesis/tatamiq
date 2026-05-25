import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  adjustMonthlyFeeSchema,
  confirmReceiptSchema,
  createMonthlyFeeSchema,
  manualPaymentSchema,
  rejectReceiptSchema,
  waiveMonthlyFeeSchema,
} from "@tatamiq/contracts";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import type { z } from "zod";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import { FeeGenerationService } from "./fee-generation.service";
import {
  AdjustMonthlyFeeDto,
  ConfirmReceiptDto,
  CreateMonthlyFeeDto,
  ListMonthlyFeesResponseDto,
  ManualPaymentDto,
  MonthlyFeeDetailDto,
  RejectReceiptDto,
  UploadUrlResponseDto,
  WaiveMonthlyFeeDto,
} from "./monthly-fees.dto";
import { MonthlyFeesService } from "./monthly-fees.service";

@ApiTags("monthly-fees")
@OrgRoles(["owner"])
@Controller("monthly-fees")
export class MonthlyFeesController {
  constructor(
    @Inject(MonthlyFeesService) private readonly monthlyFeesService: MonthlyFeesService,
    @Inject(FeeGenerationService) private readonly feeGenerationService: FeeGenerationService,
  ) {}

  @Get()
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["open", "under_review", "paid", "waived", "overdue", "all"],
  })
  @ApiQuery({ name: "studentId", required: false })
  @ApiQuery({ name: "referenceYear", required: false })
  @ApiQuery({ name: "referenceMonth", required: false })
  @ApiOkResponse({ type: ListMonthlyFeesResponseDto })
  async list(
    @Session() session: SessionWithOrganization,
    @Query("status") status?: string,
    @Query("studentId") studentId?: string,
    @Query("referenceYear") referenceYear?: string,
    @Query("referenceMonth") referenceMonth?: string,
  ): Promise<ListMonthlyFeesResponseDto> {
    const orgId = activeOrganizationId(session);
    await this.feeGenerationService.catchUp(orgId);
    return this.monthlyFeesService.list(orgId, {
      status,
      studentId,
      referenceYear: referenceYear ? Number(referenceYear) : undefined,
      referenceMonth: referenceMonth ? Number(referenceMonth) : undefined,
    });
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  create(
    @Session() session: SessionWithOrganization,
    @Body() body: CreateMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.create(
      activeOrganizationId(session),
      parseBody(createMonthlyFeeSchema, body),
    );
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  get(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.get(activeOrganizationId(session), id);
  }

  @Post(":id/upload-url")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiQuery({ name: "contentType", required: true })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  uploadUrl(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Query("contentType") contentType: string,
  ): Promise<UploadUrlResponseDto> {
    return this.monthlyFeesService.generateUploadUrl(
      activeOrganizationId(session),
      id,
      contentType,
    );
  }

  @Post(":id/receipts")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ConfirmReceiptDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  confirmReceipt(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: ConfirmReceiptDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.confirmReceipt(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(confirmReceiptSchema, body),
    );
  }

  @Post(":id/adjust")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: AdjustMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  adjust(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: AdjustMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.adjust(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(adjustMonthlyFeeSchema, body),
    );
  }

  @Post(":id/waive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: WaiveMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  waive(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: WaiveMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.waive(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(waiveMonthlyFeeSchema, body),
    );
  }

  @Post(":id/manual-payment")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ManualPaymentDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  manualPayment(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Body() body: ManualPaymentDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.manualPayment(
      activeOrganizationId(session),
      id,
      session.user.id,
      parseBody(manualPaymentSchema, body),
    );
  }

  @Get(":id/receipts")
  @ApiParam({ name: "id" })
  listReceipts(@Session() session: SessionWithOrganization, @Param("id") id: string) {
    return this.monthlyFeesService.listReceipts(activeOrganizationId(session), id);
  }

  @Post(":id/receipts/:receiptId/approve")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  approveReceipt(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.approveReceipt(
      activeOrganizationId(session),
      id,
      receiptId,
      session.user.id,
    );
  }

  @Post(":id/receipts/:receiptId/reject")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiBody({ type: RejectReceiptDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  rejectReceipt(
    @Session() session: SessionWithOrganization,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
    @Body() body: RejectReceiptDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.rejectReceipt(
      activeOrganizationId(session),
      id,
      receiptId,
      session.user.id,
      parseBody(rejectReceiptSchema, body),
    );
  }
}

function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException("Dados da mensalidade inválidos.");
  }
  return result.data;
}
