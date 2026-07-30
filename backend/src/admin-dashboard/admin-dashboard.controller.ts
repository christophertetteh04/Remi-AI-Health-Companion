import { Controller, Get, Header, HttpCode, Redirect, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";

@SkipThrottle()
@Controller()
export class AdminDashboardRootController {
  @Get()
  @Redirect("/admin-dashboard", 302)
  root() {
    return;
  }

  @Get("favicon.ico")
  @HttpCode(204)
  favicon() {
    return;
  }
}

@SkipThrottle()
@Controller("admin-dashboard")
export class AdminDashboardController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  dashboard(@Res({ passthrough: true }) response: Response) {
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "img-src 'self' data:",
        "font-src 'self' https: data:",
        "style-src 'self' https: 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        "script-src-attr 'unsafe-inline'",
        "connect-src 'self' http: https:",
      ].join("; "),
    );
    return readFileSync(join(process.cwd(), "..", "admin", "index.html"), "utf8");
  }
}
