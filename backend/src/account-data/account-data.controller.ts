import { Body, Controller, Delete, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentAuthUserId } from "../auth/current-auth-user.decorator";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccountDataService } from "./account-data.service";
import { DeleteAccountDataDto } from "./dto/delete-account-data.dto";

@Controller("account-data")
@UseGuards(AuthGuard)
export class AccountDataController {
  constructor(private readonly service: AccountDataService) {}

  @Delete()
  async deleteAccountData(
    @CurrentUserId() userId: string,
    @CurrentAuthUserId() authUserId: string,
    @Body() body: DeleteAccountDataDto,
  ) {
    return this.service.deleteForUser(userId, authUserId, body.confirmation);
  }
}
