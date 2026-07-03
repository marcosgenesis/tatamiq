import { Module } from "@nestjs/common";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { LoggerModule } from "nestjs-pino";
import { AcademyModule } from "./academy/academy.module";
import { AttendancesModule } from "./attendances/attendances.module";
import { auth } from "./auth";
import { BeltsModule } from "./belts/belts.module";
import { ClassGroupsModule } from "./class-groups/class-groups.module";
import { ClassesModule } from "./classes/classes.module";
import { CsvModule } from "./csv/csv.module";
import { DatabaseModule } from "./database/database.module";
import { GraduationModule } from "./graduation/graduation.module";
import { HealthController } from "./health/health.controller";
import { MonthlyFeesModule } from "./monthly-fees/monthly-fees.module";
import { PlatformModule } from "./platform/platform.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { StudentAccessModule } from "./student-access/student-access.module";
import { StudentNotesModule } from "./student-notes/student-notes.module";
import { StudentsModule } from "./students/students.module";

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: "2mb" },
        urlencoded: { limit: "2mb", extended: true },
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        redact: {
          paths: [
            "req.headers.cookie",
            "req.headers.authorization",
            'req.headers["x-api-key"]',
            'res.headers["set-cookie"]',
          ],
          censor: "[REDACTED]",
        },
      },
    }),
    DatabaseModule,
    // MUST stay first among feature modules: its literal `*/export.csv` and
    // `*/import-csv` routes must register before the `:id` routes of Students
    // and MonthlyFees (Express matches in registration order — otherwise
    // `export.csv` is read as a record id and 404s). AcademyModule pulls in
    // MonthlyFeesModule, so CsvModule has to come before AcademyModule too.
    CsvModule,
    AcademyModule,
    BeltsModule,
    StudentsModule,
    ClassGroupsModule,
    ScheduleModule,
    ClassesModule,
    AttendancesModule,
    StudentAccessModule,
    StudentNotesModule,
    MonthlyFeesModule,
    GraduationModule,
    PlatformModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
