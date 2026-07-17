import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  attendances,
  classGroups,
  classSessions,
  type Database,
  member,
  monthlyFees,
  organization,
  paymentReceipts,
  preRegistrationRequests,
  session,
  studentAccess,
  students,
} from "@tatamiq/database";
import { count, eq, inArray } from "drizzle-orm";
import { DATABASE } from "../database/database.module";
import { R2StorageService } from "../monthly-fees/r2-storage.service";
import {
  type PlatformAcademyDetail,
  type PlatformAcademyResponsible,
  PlatformAcademyService,
} from "./platform-academy.service";

export type PlatformAcademyDeletionImpact = {
  students: number;
  classGroups: number;
  classSessions: number;
  attendances: number;
  monthlyFees: number;
  paymentReceipts: number;
  preRegistrationRequests: number;
  files: number;
};

export type PlatformAcademyDeletionPreview = {
  academy: PlatformAcademyDetail;
  affectedResponsibles: PlatformAcademyResponsible[];
  impact: PlatformAcademyDeletionImpact;
  irreversibleWarning: string;
};

export type DeleteAcademyInput = {
  confirmationSlug: string;
  irreversibleAccepted: boolean;
  reason?: string;
};

export type DeleteAcademyResult = {
  success: true;
  deletedAcademyId: string;
  deletedAcademyName: string;
  deletedAcademySlug: string;
  impact: PlatformAcademyDeletionImpact;
  deletedFiles: number;
  affectedResponsibles: PlatformAcademyResponsible[];
};

@Injectable()
export class PlatformAcademyDeletionService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(R2StorageService) private readonly r2: R2StorageService,
    @Inject(PlatformAcademyService) private readonly academies: PlatformAcademyService,
  ) {}

  async preview(id: string): Promise<PlatformAcademyDeletionPreview> {
    const academy = await this.academies.getAcademy(id);
    const fileKeys = await this.collectAcademyFileKeys(id, academy);
    return {
      academy,
      affectedResponsibles: academy.responsibles,
      impact: await this.buildDeletionImpact(id, fileKeys.length),
      irreversibleWarning:
        "Esta ação remove definitivamente a academia, dados operacionais, vínculos de acesso e arquivos associados.",
    };
  }

  async delete(id: string, input: DeleteAcademyInput): Promise<DeleteAcademyResult> {
    const academy = await this.academies.getAcademy(id);
    this.assertDeletionConfirmed(academy, input);

    const [fileKeys, affectedUserIds] = await Promise.all([
      this.collectAcademyFileKeys(id, academy),
      this.collectAffectedUserIds(id),
    ]);
    const impact = await this.buildDeletionImpact(id, fileKeys.length);

    await this.r2.deleteObjects(fileKeys);

    await this.db.transaction(async (tx) => {
      if (affectedUserIds.length > 0) {
        await tx.delete(session).where(inArray(session.userId, affectedUserIds));
      }
      await tx.delete(organization).where(eq(organization.id, id));
    });

    return {
      success: true,
      deletedAcademyId: academy.id,
      deletedAcademyName: academy.name,
      deletedAcademySlug: academy.slug,
      impact,
      deletedFiles: fileKeys.length,
      affectedResponsibles: academy.responsibles,
    };
  }

  private assertDeletionConfirmed(academy: PlatformAcademyDetail, input: DeleteAcademyInput) {
    if (input.confirmationSlug.trim() !== academy.slug) {
      throw new BadRequestException("Digite o slug exato da academia para confirmar a exclusão.");
    }
    if (!input.irreversibleAccepted) {
      throw new BadRequestException("Confirme que a exclusão definitiva é irreversível.");
    }
  }

  private async collectAffectedUserIds(organizationId: string): Promise<string[]> {
    const [memberRows, accessRows] = await Promise.all([
      this.db
        .select({ userId: member.userId })
        .from(member)
        .where(eq(member.organizationId, organizationId)),
      this.db
        .select({ userId: studentAccess.authUserId })
        .from(studentAccess)
        .where(eq(studentAccess.organizationId, organizationId)),
    ]);

    return [...new Set([...memberRows, ...accessRows].map((row) => row.userId))];
  }

  private async collectAcademyFileKeys(
    organizationId: string,
    academy: PlatformAcademyDetail,
  ): Promise<string[]> {
    const receiptRows = await this.db
      .select({ fileKey: paymentReceipts.fileKey })
      .from(paymentReceipts)
      .where(eq(paymentReceipts.organizationId, organizationId));

    return [
      ...new Set(
        [this.r2.extractFileKey(academy.logo), ...receiptRows.map((row) => row.fileKey)].filter(
          (key): key is string => !!key,
        ),
      ),
    ];
  }

  private async buildDeletionImpact(
    organizationId: string,
    fileCount: number,
  ): Promise<PlatformAcademyDeletionImpact> {
    const [
      [studentTotal],
      [classGroupTotal],
      [classSessionTotal],
      [attendanceTotal],
      [monthlyFeeTotal],
      [receiptTotal],
      [preRegistrationTotal],
    ] = await Promise.all([
      this.countStudents(organizationId),
      this.countClassGroups(organizationId),
      this.countClassSessions(organizationId),
      this.countAttendances(organizationId),
      this.countMonthlyFees(organizationId),
      this.countPaymentReceipts(organizationId),
      this.countPreRegistrationRequests(organizationId),
    ]);

    return {
      students: studentTotal?.total ?? 0,
      classGroups: classGroupTotal?.total ?? 0,
      classSessions: classSessionTotal?.total ?? 0,
      attendances: attendanceTotal?.total ?? 0,
      monthlyFees: monthlyFeeTotal?.total ?? 0,
      paymentReceipts: receiptTotal?.total ?? 0,
      preRegistrationRequests: preRegistrationTotal?.total ?? 0,
      files: fileCount,
    };
  }

  private countStudents(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(students)
      .where(eq(students.organizationId, organizationId));
  }

  private countClassGroups(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(classGroups)
      .where(eq(classGroups.organizationId, organizationId));
  }

  private countClassSessions(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(classSessions)
      .where(eq(classSessions.organizationId, organizationId));
  }

  private countAttendances(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(attendances)
      .where(eq(attendances.organizationId, organizationId));
  }

  private countMonthlyFees(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(monthlyFees)
      .where(eq(monthlyFees.organizationId, organizationId));
  }

  private countPaymentReceipts(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(paymentReceipts)
      .where(eq(paymentReceipts.organizationId, organizationId));
  }

  private countPreRegistrationRequests(organizationId: string) {
    return this.db
      .select({ total: count() })
      .from(preRegistrationRequests)
      .where(eq(preRegistrationRequests.organizationId, organizationId));
  }
}
