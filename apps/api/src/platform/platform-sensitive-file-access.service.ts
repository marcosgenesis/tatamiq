import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PaymentReceipt } from "@tatamiq/database";
import { R2StorageService } from "../monthly-fees/r2-storage.service";
import type { PlatformSensitiveFileUrlDto } from "./platform.dto";
import type { PlatformSession } from "./platform-admin.service";
import { PlatformAcademyService } from "./platform-academy.service";
import { PlatformAuditedActionService } from "./platform-audited-action.service";

const SENSITIVE_FILE_URL_TTL_SECONDS = 5 * 60;

type ReceiptAccessResult = PlatformSensitiveFileUrlDto & {
  receipt: PaymentReceipt;
};

@Injectable()
export class PlatformSensitiveFileAccessService {
  constructor(
    @Inject(PlatformAuditedActionService)
    private readonly auditedAction: PlatformAuditedActionService,
    @Inject(PlatformAcademyService)
    private readonly platformAcademyService: PlatformAcademyService,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
  ) {}

  async receiptViewUrl(
    session: PlatformSession,
    academyId: string,
    receiptId: string,
  ): Promise<PlatformSensitiveFileUrlDto> {
    const result = await this.auditedAction.run(
      session,
      async (): Promise<ReceiptAccessResult> => {
        const receipt = await this.platformAcademyService.getReceipt(academyId, receiptId);
        if (!receipt) throw new NotFoundException("Comprovante não encontrado.");

        const viewUrl = await this.r2.generateReadUrl(
          receipt.fileKey,
          SENSITIVE_FILE_URL_TTL_SECONDS,
        );
        const expiresAt = new Date(
          Date.now() + SENSITIVE_FILE_URL_TTL_SECONDS * 1000,
        ).toISOString();

        return { viewUrl, expiresAt, receipt };
      },
      {
        action: "platform.sensitive_file.accessed",
        targetType: "payment_receipt",
        targetId: (result) => result.receipt.id,
        academyId: (result) => result.receipt.organizationId,
        result: "success",
        metadata: (result) => ({
          fileKey: result.receipt.fileKey,
          fileType: result.receipt.fileType,
          fileSizeBytes: result.receipt.fileSizeBytes,
          monthlyFeeId: result.receipt.monthlyFeeId,
          receiptStatus: result.receipt.status,
          studentId: result.receipt.studentId,
          expiresInSeconds: SENSITIVE_FILE_URL_TTL_SECONDS,
        }),
      },
    );

    return { viewUrl: result.viewUrl, expiresAt: result.expiresAt };
  }
}
