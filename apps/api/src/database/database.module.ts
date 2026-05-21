import { Module } from "@nestjs/common";
import { createDatabase } from "@tatamiq/database";

export const DATABASE = Symbol("DATABASE");

@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => createDatabase(),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
