import { Module } from "@nestjs/common";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { LoggerModule } from "nestjs-pino";
import { auth } from "./auth";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
