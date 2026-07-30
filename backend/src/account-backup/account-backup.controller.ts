import { Body, Controller, Get, Put, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { AccountBackupService } from "./account-backup.service";
import { SaveAccountBackupDto } from "./dto/account-backup.dto";

@Controller("account-backup")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class AccountBackupController {
  constructor(private readonly backupService: AccountBackupService) {}

  @Get()
  async get(@CurrentUserId() userId: string) {
    return this.backupService.get(userId);
  }

  @Put()
  async save(@CurrentUserId() userId: string, @Body() body: SaveAccountBackupDto) {
    return this.backupService.save(userId, body.data, body.schemaVersion || "1");
  }
}
