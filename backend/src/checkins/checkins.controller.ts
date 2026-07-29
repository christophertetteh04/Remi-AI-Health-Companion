import { Body, Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CheckinsMemoryService } from "./checkins-memory.service";
import { CheckinsService } from "./checkins.service";
import { SaveChatMemoryDto, SaveRecentActivitiesDto } from "./dto/chat-memory.dto";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("checkins")
@UseGuards(AuthGuard)
export class CheckinsController {
  constructor(
    private readonly checkinsService: CheckinsService,
    private readonly memoryService: CheckinsMemoryService,
  ) {}

  @Post("message")
  async sendMessage(@Body() dto: SendMessageDto) {
    return this.checkinsService.handleMessage(dto.message, dto.history, dto.topic, dto.memoryContext);
  }

  @Get("memory")
  async getMemory(@CurrentUserId() userId: string) {
    return { messages: await this.memoryService.listMessages(userId) };
  }

  @Post("memory")
  async saveMemory(@CurrentUserId() userId: string, @Body() dto: SaveChatMemoryDto) {
    return this.memoryService.replaceMessages(userId, dto.messages);
  }

  @Delete("memory")
  async deleteMemory(@CurrentUserId() userId: string) {
    return this.memoryService.deleteMessages(userId);
  }

  @Get("recent-activities")
  async getRecentActivities(@CurrentUserId() userId: string) {
    return { activities: await this.memoryService.listRecentActivities(userId) };
  }

  @Post("recent-activities")
  async saveRecentActivities(@CurrentUserId() userId: string, @Body() dto: SaveRecentActivitiesDto) {
    return this.memoryService.replaceRecentActivities(userId, dto.activities);
  }
}
