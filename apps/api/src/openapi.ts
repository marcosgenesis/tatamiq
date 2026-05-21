import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { createApp } from "./main";

async function generateOpenApi() {
  const app = await createApp();

  const config = new DocumentBuilder()
    .setTitle("Tatamiq API")
    .setDescription("Tatamiq V0 API")
    .setVersion("0.0.0")
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));

  await writeFile(
    resolve(process.cwd(), "../../packages/contracts/openapi.json"),
    `${JSON.stringify(document, null, 2)}\n`,
  );

  await app.close();
}

void generateOpenApi();
