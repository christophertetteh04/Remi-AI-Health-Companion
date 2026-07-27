import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentAnalyticsEnabled = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers["x-remi-analytics-enabled"] !== "false";
});
