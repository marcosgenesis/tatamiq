import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc, ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "./app.module";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());

  app.enableCors({
    origin: process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
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
  const port = Number(process.env.PORT ?? 3100);
  await app.listen(port, "0.0.0.0");
}

if (require.main === module) {
  void bootstrap();
}
