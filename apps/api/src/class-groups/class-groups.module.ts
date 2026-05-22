import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ClassGroupsController } from "./class-groups.controller";
import { ClassGroupsService } from "./class-groups.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ClassGroupsController],
  providers: [ClassGroupsService],
})
export class ClassGroupsModule {}
