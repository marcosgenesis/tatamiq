import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Tatamiq API")
    .setDescription("Tatamiq V0 API")
    .setVersion("0.0.0")
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("docs", app, document);

  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000);
}

if (require.main === module) {
  void bootstrap();
}
