import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { AcademiesController } from "./academies/academies.controller";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
      },
    }),
    DatabaseModule,
  ],
  controllers: [HealthController, AcademiesController],
})
export class AppModule {}
