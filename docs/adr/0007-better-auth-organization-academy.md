# Better Auth Organization as the technical Academy boundary

Tatamiq will implement **Academia** technically with Better Auth's Organization plugin, using the organization member `owner` role for the **Dono/Instrutor Solo** in V0. **Aluno** access will not be represented as an organization member role; students with login will be Better Auth users linked to a **Student** record through Tatamiq-owned **Acesso do Aluno**/**StudentAccess** data, preserving the distinction between academy staff membership and student self-service access.

This keeps tenant isolation aligned with Better Auth's organization/session model while avoiding the misleading model where students become administrative members of the academy organization.
