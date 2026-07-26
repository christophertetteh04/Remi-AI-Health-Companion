import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { SupabaseService } from "./supabase.service";

// Applied to every controller that touches user health data
// (medications, vitals, labs, symptom-media, checkins). Logs who
// accessed what and when — expanding the access-logging decision
// from the admin panel to cover ALL backend access, not just admin
// reads. This runs after the AuthGuard, so request.userId is set.
@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  constructor(private readonly supabase: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const resource = context.getClass().name.replace("Controller", "").toLowerCase();
    const action = `${request.method} ${request.route?.path || request.url}`;

    return next.handle().pipe(
      tap(() => {
        if (request.userId) {
          this.supabase.client
            .from("access_logs")
            .insert({ resource, action, actor: request.userId })
            .then(() => {}, () => {}); // never let logging failures break the actual request
        }
      }),
    );
  }
}
