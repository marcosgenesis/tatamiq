import { Body, Controller, Get, Header, Inject, Post, Query, Res } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles, Session } from "@thallesp/nestjs-better-auth";
import { activeOrganizationId, type SessionWithOrganization } from "../active-organization";
import { CsvService } from "./csv.service";

@ApiTags("csv")
@OrgRoles(["owner"])
@Controller()
export class CsvController {
  constructor(@Inject(CsvService) private readonly csvService: CsvService) {}

  @Post("students/import-csv")
  async importPreview(@Body() body: { csv: string }, @Session() session: SessionWithOrganization) {
    return this.csvService.previewImport(activeOrganizationId(session), body.csv);
  }

  @Post("students/import-csv/confirm")
  async importConfirm(
    @Body() body: { previewToken: string },
    @Session() session: SessionWithOrganization,
  ) {
    return this.csvService.confirmImport(activeOrganizationId(session), body.previewToken);
  }

  @Get("students/export.csv")
  async exportStudents(@Session() session: SessionWithOrganization, @Res() res: any) {
    const csv = await this.csvService.exportStudents(activeOrganizationId(session));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=alunos.csv");
    res.send(csv);
  }

  @Get("attendances/export.csv")
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "classGroupId", required: false })
  @ApiQuery({ name: "studentId", required: false })
  async exportAttendances(
    @Session() session: SessionWithOrganization,
    @Res() res: any,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("classGroupId") classGroupId?: string,
    @Query("studentId") studentId?: string,
  ) {
    const csv = await this.csvService.exportAttendances(activeOrganizationId(session), {
      dateFrom,
      dateTo,
      classGroupId,
      studentId,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=presencas.csv");
    res.send(csv);
  }

  @Get("monthly-fees/export.csv")
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "referenceYear", required: false })
  @ApiQuery({ name: "referenceMonth", required: false })
  @ApiQuery({ name: "studentId", required: false })
  async exportMonthlyFees(
    @Session() session: SessionWithOrganization,
    @Res() res: any,
    @Query("status") status?: string,
    @Query("referenceYear") referenceYear?: string,
    @Query("referenceMonth") referenceMonth?: string,
    @Query("studentId") studentId?: string,
  ) {
    const csv = await this.csvService.exportMonthlyFees(activeOrganizationId(session), {
      status,
      referenceYear: referenceYear ? Number.parseInt(referenceYear, 10) : undefined,
      referenceMonth: referenceMonth ? Number.parseInt(referenceMonth, 10) : undefined,
      studentId,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=mensalidades.csv");
    res.send(csv);
  }
}
