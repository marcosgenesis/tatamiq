import { createHash } from "node:crypto";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { account, type Database, user, verification } from "@tatamiq/database";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

@Injectable()
export class ReservedAccountService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async createOrReuse(email: string, name: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await this.db
      .select()
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return { user: existing[0], isNew: false, firstAccessLink: null };
    }

    const userId = crypto.randomUUID();
    const now = new Date();

    const [createdUser] = await this.db
      .insert(user)
      .values({
        id: userId,
        name,
        email: normalizedEmail,
        emailVerified: false,
        banned: true,
        banReason: "reserved_account",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const token = crypto.randomUUID();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: `first-access:${userId}`,
      value: tokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return { user: createdUser, isNew: true, firstAccessLink: token };
  }

  async regenerateFirstAccessLink(userId: string) {
    const existing = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (existing.length === 0) {
      throw new NotFoundException("User not found");
    }

    await this.db.delete(verification).where(eq(verification.identifier, `first-access:${userId}`));

    const now = new Date();
    const token = crypto.randomUUID();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier: `first-access:${userId}`,
      value: tokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return token;
  }

  async previewFirstAccess(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const records = await this.db
      .select()
      .from(verification)
      .where(eq(verification.value, tokenHash))
      .limit(1);

    if (records.length === 0) {
      return { status: "invalid", name: null, email: null };
    }

    const record = records[0];
    if (!record.identifier.startsWith("first-access:")) {
      return { status: "invalid", name: null, email: null };
    }

    if (new Date() > record.expiresAt) {
      return { status: "expired", name: null, email: null };
    }

    const userId = record.identifier.replace("first-access:", "");
    const users = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);
    if (users.length === 0) {
      return { status: "invalid", name: null, email: null };
    }

    return { status: "valid", name: users[0].name, email: users[0].email };
  }

  async completeFirstAccess(token: string, password: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const records = await this.db
      .select()
      .from(verification)
      .where(eq(verification.value, tokenHash))
      .limit(1);

    if (records.length === 0) {
      throw new BadRequestException("Invalid or expired first-access token");
    }

    const record = records[0];

    if (!record.identifier.startsWith("first-access:")) {
      throw new BadRequestException("Invalid or expired first-access token");
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException("Invalid or expired first-access token");
    }

    const userId = record.identifier.replace("first-access:", "");

    const users = await this.db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (users.length === 0) {
      throw new BadRequestException("Invalid or expired first-access token");
    }

    const hashedPassword = await hashPassword(password);

    await this.db
      .update(user)
      .set({
        banned: false,
        banReason: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    const existingAccount = await this.db
      .select({ id: account.id })
      .from(account)
      .where(eq(account.userId, userId))
      .limit(1);

    if (existingAccount.length > 0) {
      await this.db
        .update(account)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(account.id, existingAccount[0].id));
    } else {
      await this.db.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await this.db.delete(verification).where(eq(verification.id, record.id));

    return users[0];
  }
}
