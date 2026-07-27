import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";

@Catch()
export class ProductionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProductionExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const isProduction = process.env.NODE_ENV === "production";
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.error(
      `${request.method} ${request.url} failed with ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );
    if (status >= 500) Sentry.captureException(exception);

    const originalResponse = isHttpException ? exception.getResponse() : null;
    const clientMessage = isProduction
      ? status >= 500
        ? "Something went wrong. Please try again later."
        : genericMessageForStatus(status)
      : originalResponse;

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}

function genericMessageForStatus(status: number) {
  if (status === HttpStatus.BAD_REQUEST) return "Invalid request.";
  if (status === HttpStatus.UNAUTHORIZED) return "Unauthorized.";
  if (status === HttpStatus.FORBIDDEN) return "Forbidden.";
  if (status === HttpStatus.NOT_FOUND) return "Not found.";
  if (status === HttpStatus.TOO_MANY_REQUESTS) return "Too many requests.";
  return "Request failed.";
}
