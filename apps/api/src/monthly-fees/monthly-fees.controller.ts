import { Controller, Get, HttpCode, Inject, Param, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId, ActorId } from "../academy-request";
import { ZodBody } from "../zod-body.decorator";
import { FeeGenerationService } from "./fee-generation.service";
import {
  AdjustMonthlyFeeDto,
  ConfirmReceiptDto,
  CreateMonthlyFeeDto,
  GenerateMissingMonthlyFeesResponseDto,
  ListMonthlyFeesResponseDto,
  ManualPaymentDto,
  MonthlyFeeDetailDto,
  ReceiptViewUrlResponseDto,
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
    @AcademyId() academyId: string,
    @Query("status") status?: string,
    @Query("studentId") studentId?: string,
    @Query("referenceYear") referenceYear?: string,
    @Query("referenceMonth") referenceMonth?: string,
  ): Promise<ListMonthlyFeesResponseDto> {
    await this.feeGenerationService.catchUp(academyId);
    return this.monthlyFeesService.list(academyId, {
      status,
      studentId,
      referenceYear: referenceYear ? Number(referenceYear) : undefined,
      referenceMonth: referenceMonth ? Number(referenceMonth) : undefined,
    });
  }

  @Post("generate-missing")
  @HttpCode(200)
  @ApiOkResponse({ type: GenerateMissingMonthlyFeesResponseDto })
  async generateMissing(
    @AcademyId() academyId: string,
  ): Promise<GenerateMissingMonthlyFeesResponseDto> {
    const created = await this.feeGenerationService.catchUp(academyId);
    return { created };
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  create(
    @AcademyId() academyId: string,
    @ZodBody(CreateMonthlyFeeDto) body: CreateMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.create(academyId, body);
  }

  @Get(":id")
  @ApiParam({ name: "id" })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  get(@AcademyId() academyId: string, @Param("id") id: string): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.get(academyId, id);
  }

  @Post(":id/upload-url")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiQuery({ name: "contentType", required: true })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  uploadUrl(
    @AcademyId() academyId: string,
    @Param("id") id: string,
    @Query("contentType") contentType: string,
  ): Promise<UploadUrlResponseDto> {
    return this.monthlyFeesService.generateUploadUrl(academyId, id, contentType);
  }

  @Post(":id/receipts")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ConfirmReceiptDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  confirmReceipt(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(ConfirmReceiptDto) body: ConfirmReceiptDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.confirmReceipt(academyId, id, actorId, body);
  }

  @Post(":id/adjust")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: AdjustMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  adjust(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(AdjustMonthlyFeeDto) body: AdjustMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.adjust(academyId, id, actorId, body);
  }

  @Post(":id/waive")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: WaiveMonthlyFeeDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  waive(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(WaiveMonthlyFeeDto) body: WaiveMonthlyFeeDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.waive(academyId, id, actorId, body);
  }

  @Post(":id/manual-payment")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiBody({ type: ManualPaymentDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  manualPayment(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @ZodBody(ManualPaymentDto) body: ManualPaymentDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.manualPayment(academyId, id, actorId, body);
  }

  @Get(":id/receipts")
  @ApiParam({ name: "id" })
  listReceipts(@AcademyId() academyId: string, @Param("id") id: string) {
    return this.monthlyFeesService.listReceipts(academyId, id);
  }

  @Get(":id/receipts/:receiptId/view-url")
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiOkResponse({ type: ReceiptViewUrlResponseDto })
  receiptViewUrl(
    @AcademyId() academyId: string,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
  ): Promise<ReceiptViewUrlResponseDto> {
    return this.monthlyFeesService.receiptViewUrl(academyId, id, receiptId);
  }

  @Post(":id/receipts/:receiptId/approve")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  approveReceipt(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.approveReceipt(academyId, id, receiptId, actorId);
  }

  @Post(":id/receipts/:receiptId/reject")
  @HttpCode(200)
  @ApiParam({ name: "id" })
  @ApiParam({ name: "receiptId" })
  @ApiBody({ type: RejectReceiptDto })
  @ApiOkResponse({ type: MonthlyFeeDetailDto })
  rejectReceipt(
    @AcademyId() academyId: string,
    @ActorId() actorId: string,
    @Param("id") id: string,
    @Param("receiptId") receiptId: string,
    @ZodBody(RejectReceiptDto) body: RejectReceiptDto,
  ): Promise<MonthlyFeeDetailDto> {
    return this.monthlyFeesService.rejectReceipt(academyId, id, receiptId, actorId, body);
  }
}
