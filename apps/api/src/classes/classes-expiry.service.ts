import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ClassesService } from "./classes.service";

@Injectable()
export class ClassesExpiryService {
  constructor(@Inject(ClassesService) private readonly classesService: ClassesService) {}

  @Cron("*/15 * * * * *")
  async expireDueClasses(): Promise<void> {
    await this.classesService.expireDueClasses();
  }
}
