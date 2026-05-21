import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { createDatabase } from "./client";
import { account, member, organization, user } from "./schema";

const db = createDatabase();

const email = "dev@tatamiq.local";
const password = "tatamiq123";
const academyName = "Academia de Teste";
const academySlug = "academia-de-teste-dev";

const [existingUser] = await db
  .select({ id: user.id })
  .from(user)
  .where(eq(user.email, email))
  .limit(1);

const userId = existingUser?.id ?? randomUUID();

if (!existingUser) {
  await db.insert(user).values({
    id: userId,
    name: "Instrutor Dev",
    email,
    emailVerified: true,
  });

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password),
  });
}

const [existingOrganization] = await db
  .select({ id: organization.id })
  .from(organization)
  .where(eq(organization.slug, academySlug))
  .limit(1);

const organizationId = existingOrganization?.id ?? randomUUID();

if (!existingOrganization) {
  await db.insert(organization).values({
    id: organizationId,
    name: academyName,
    slug: academySlug,
  });
}

const [existingMember] = await db
  .select({ id: member.id })
  .from(member)
  .where(eq(member.userId, userId))
  .limit(1);

if (!existingMember) {
  await db.insert(member).values({
    id: randomUUID(),
    organizationId,
    userId,
    role: "owner",
  });
}

console.log(`Seeded local auth user ${email} / ${password} for ${academyName}`);

process.exit(0);
