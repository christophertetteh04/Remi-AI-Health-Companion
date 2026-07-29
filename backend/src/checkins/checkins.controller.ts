import { Body, Controller, Delete, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { CheckinsMemoryService } from "./checkins-memory.service";
import { CheckinsService } from "./checkins.service";
import { SaveChatMemoryDto, SaveRecentActivitiesDto } from "./dto/chat-memory.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { UploadCheckinDto } from "./dto/upload-checkin.dto";

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

  @Post("upload")
  @UseInterceptors(AccessLogInterceptor)
  async upload(
    @CurrentUserId() userId: string,
    @CurrentAnalyticsEnabled() analyticsEnabled: boolean,
    @Body() dto: UploadCheckinDto,
  ) {
    return this.checkinsService.handleUpload(userId, dto, analyticsEnabled);
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
