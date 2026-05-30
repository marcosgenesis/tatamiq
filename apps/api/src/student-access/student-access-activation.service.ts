import { BadRequestException, Injectable } from "@nestjs/common";
import { type Database, studentAcceptances, studentAccess } from "@tatamiq/database";
import { and, eq } from "drizzle-orm";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

@Injectable()
export class StudentAccessActivationService {
  async activate(
    tx: Transaction,
    input: {
      organizationId: string;
      studentId: string;
      authUserId: string;
      termsVersion: string;
    },
  ): Promise<{ accessId: string }> {
    const [studentExistingAccess] = await tx
      .select()
      .from(studentAccess)
      .where(and(eq(studentAccess.studentId, input.studentId), eq(studentAccess.status, "active")))
      .limit(1);
    if (studentExistingAccess) {
      throw new BadRequestException("Este aluno já possui acesso ativo.");
    }

    const [userExistingAccess] = await tx
      .select()
      .from(studentAccess)
      .where(
        and(eq(studentAccess.authUserId, input.authUserId), eq(studentAccess.status, "active")),
      )
      .limit(1);
    if (userExistingAccess) {
      throw new BadRequestException("Esta conta já está vinculada a outro aluno.");
    }

    const now = new Date();
    const accessId = crypto.randomUUID();

    await tx.insert(studentAccess).values({
      id: accessId,
      organizationId: input.organizationId,
      studentId: input.studentId,
      authUserId: input.authUserId,
      status: "active",
      revokedAt: null,
      revokedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(studentAcceptances).values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      studentAccessId: accessId,
      studentId: input.studentId,
      authUserId: input.authUserId,
      termsVersion: input.termsVersion,
      acceptedAt: now,
    });

    return { accessId };
  }
}
