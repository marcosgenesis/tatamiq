import { Body, Controller, Get, Inject, Post, Query, Res } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { OrgRoles } from "@thallesp/nestjs-better-auth";
import { AcademyId } from "../academy-request";
import { CsvService } from "./csv.service";

type CsvResponse = {
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

@ApiTags("csv")
@OrgRoles(["owner"])
@Controller()
export class CsvController {
  constructor(@Inject(CsvService) private readonly csvService: CsvService) {}

  @Get("students/import-csv/template.csv")
  async importTemplate(@Res() res: CsvResponse) {
    const csv = this.csvService.studentImportTemplate();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=modelo-importacao-alunos.csv");
    res.send(csv);
  }

  @Post("students/import-csv")
  async importPreview(@Body() body: { csv: string }, @AcademyId() academyId: string) {
    return this.csvService.previewImport(academyId, body.csv);
  }

  @Post("students/import-csv/confirm")
  async importConfirm(@Body() body: { previewToken: string }, @AcademyId() academyId: string) {
    return this.csvService.confirmImport(academyId, body.previewToken);
  }

  @Get("students/export.csv")
  async exportStudents(@AcademyId() academyId: string, @Res() res: CsvResponse) {
    const csv = await this.csvService.exportStudents(academyId);
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
    @AcademyId() academyId: string,
    @Res() res: CsvResponse,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("classGroupId") classGroupId?: string,
    @Query("studentId") studentId?: string,
  ) {
    const csv = await this.csvService.exportAttendances(academyId, {
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
    @AcademyId() academyId: string,
    @Res() res: CsvResponse,
    @Query("status") status?: string,
    @Query("referenceYear") referenceYear?: string,
    @Query("referenceMonth") referenceMonth?: string,
    @Query("studentId") studentId?: string,
  ) {
    const csv = await this.csvService.exportMonthlyFees(academyId, {
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
