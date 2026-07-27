import { NestFactory } from "@nestjs/core";
import * as Sentry from "@sentry/node";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { ProductionExceptionFilter } from "./common/production-exception.filter";
import { corsOptions, securityHeadersMiddleware } from "./common/security-config";

async function bootstrap() {
  if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.startsWith("your-")) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
  }

  const app = await NestFactory.create(AppModule);
  app.use(securityHeadersMiddleware());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProductionExceptionFilter());
  app.enableCors(corsOptions());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
