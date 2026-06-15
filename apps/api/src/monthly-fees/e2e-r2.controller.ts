import { Controller, Get, HttpCode, Put, Query, Res } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";

@AllowAnonymous()
@Controller("__e2e/r2")
export class E2eR2Controller {
  @Put("upload")
  @HttpCode(200)
  upload(@Res() res: Response) {
    res.setHeader("etag", "e2e-fake-r2");
    res.status(200).send("ok");
  }

  @Get("read")
  read(@Query("fileKey") fileKey: string, @Res() res: Response) {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.status(200).send(`fake-r2:${fileKey}`);
  }

  @Get("public")
  publicUrl(@Query("fileKey") fileKey: string, @Res() res: Response) {
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.status(200).send(`fake-r2-public:${fileKey}`);
  }
}
