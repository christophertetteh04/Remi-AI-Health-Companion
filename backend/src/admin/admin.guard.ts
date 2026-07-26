import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

// Deliberately simple: one shared admin key, checked against an env
// var. This matches the earlier decision that a solo developer
// doesn't need full role-based access control yet — see flow doc
// section 26. Upgrade this to real per-person accounts + roles once
// more than one person needs admin access.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers["x-admin-key"];
    if (!key || key !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException("Invalid admin key");
    }
    return true;
  }
}
