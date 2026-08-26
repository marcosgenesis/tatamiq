import { Module } from "@nestjs/common";
import { ClassesModule } from "../classes/classes.module";
import { DatabaseModule } from "../database/database.module";
import { ScheduleModule } from "../schedule/schedule.module";
import { TotemAdminController, TotemController } from "./totem.controller";
import { TotemService } from "./totem.service";

@Module({
  imports: [DatabaseModule, ClassesModule, ScheduleModule],
  controllers: [TotemController, TotemAdminController],
  providers: [TotemService],
})
export class TotemModule {}
