import { BadRequestException, HttpStatus, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { AuthGuard } from "../src/auth/auth.guard";
import { SubmitVitalsDto } from "../src/vitals/dto/vitals.dto";
import { ProductionExceptionFilter } from "../src/common/production-exception.filter";
import { AUTH_ADJACENT_THROTTLE } from "../src/auth/auth-rate-limit.decorator";
import { isCorsOriginAllowed, securityHeadersMiddleware } from "../src/common/security-config";

function httpContext(headers: Record<string, string> = {}) {
  const request: any = { headers, method: "POST", url: "/test" };
  const response: any = {
    status: jest.fn(() => response),
    json: jest.fn(),
  };
  return {
    request,
    response,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any,
  };
}

describe("OWASP hardening", () => {
  it("rejects malformed payloads and unexpected fields through the global validation policy", async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

    await expect(
      pipe.transform(
        { systolic: 120, diastolic: 80, glucose: 90, unexpectedAdmin: true },
        { type: "body", metatype: SubmitVitalsDto } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      pipe.transform(
        { systolic: "not-a-number", diastolic: 80 },
        { type: "body", metatype: SubmitVitalsDto } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects malformed or expired bearer tokens with 401", async () => {
    const guard = new AuthGuard({
      client: {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: new Error("expired") }) },
      },
    } as any);
    const { context } = httpContext({ authorization: "Bearer expired.token" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("masks detailed exception messages in production responses", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const { context, response } = httpContext();

    new ProductionExceptionFilter().catch(new Error("database password leaked in stack"), context);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json.mock.calls[0][0].message).toBe("Something went wrong. Please try again later.");
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain("database password");
    process.env.NODE_ENV = previous;
  });

  it("allows only configured browser origins while still allowing origin-less mobile requests", () => {
    const previous = process.env.REMI_CORS_ORIGINS;
    process.env.REMI_CORS_ORIGINS = "https://admin.remi.example,remi://mobile";

    expect(isCorsOriginAllowed("https://admin.remi.example")).toBe(true);
    expect(isCorsOriginAllowed("https://attacker.example")).toBe(false);
    expect(isCorsOriginAllowed(undefined)).toBe(true);
    if (previous === undefined) delete process.env.REMI_CORS_ORIGINS;
    else process.env.REMI_CORS_ORIGINS = previous;
  });

  it("applies standard Helmet security headers", async () => {
    const middleware = securityHeadersMiddleware();
    const res: any = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      removeHeader: jest.fn(),
    };

    await new Promise<void>((resolve, reject) => middleware({ headers: {}, socket: {} } as any, res, (error?: any) => (error ? reject(error) : resolve())));

    expect(res.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(res.setHeader).toHaveBeenCalledWith("X-Frame-Options", "SAMEORIGIN");
  });

  it("defines a tighter throttle profile for future auth-adjacent endpoints", () => {
    expect(AUTH_ADJACENT_THROTTLE.default).toEqual({ limit: 5, ttl: 60000 });
  });
});
