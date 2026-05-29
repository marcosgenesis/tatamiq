import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const AcademyId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const organizationId = request.session?.session?.activeOrganizationId;
  if (!organizationId) throw new BadRequestException("Nenhuma organização ativa.");
  return organizationId;
});

export const ActorId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const userId = request.session?.user?.id;
  if (!userId) throw new BadRequestException("Usuário não autenticado.");
  return userId;
});
