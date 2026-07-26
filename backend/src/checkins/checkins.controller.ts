import { Body, Controller, Post } from "@nestjs/common";
import { CheckinsService } from "./checkins.service";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("checkins")
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Post("message")
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.checkinsService.handleMessage(dto.message, dto.history, dto.topic);
  }
}
