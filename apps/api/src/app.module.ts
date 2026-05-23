import { Module } from "@nestjs/common";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { LoggerModule } from "nestjs-pino";
import { AttendancesModule } from "./attendances/attendances.module";
import { auth } from "./auth";
import { ClassGroupsModule } from "./class-groups/class-groups.module";
import { ClassesModule } from "./classes/classes.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { ScheduleModule } from "./schedule/schedule.module";
import { StudentAccessModule } from "./student-access/student-access.module";
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
      },
    }),
    DatabaseModule,
    StudentsModule,
    ClassGroupsModule,
    ScheduleModule,
    ClassesModule,
    AttendancesModule,
    StudentAccessModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
