import { Type } from "class-transformer";
import { IsArray, IsDateString, IsIn, IsOptional, IsString, Length, ValidateNested } from "class-validator";

export class ChatMemoryItemDto {
  @IsIn(["user", "bot"])
  from: "user" | "bot";

  @IsString()
  @Length(0, 10000)
  text: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  imageUri?: string;

  @IsOptional()
  @IsIn(["normal", "monitor", "urgent"])
  urgency?: "normal" | "monitor" | "urgent";

  @IsDateString()
  createdAt: string;
}

export class SaveChatMemoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMemoryItemDto)
  messages: ChatMemoryItemDto[];
}

export class RecentActivityItemDto {
  @IsString()
  @Length(1, 120)
  id: string;

  @IsIn(["chat", "lab", "vitals", "medication", "lifestyle", "safety"])
  type: "chat" | "lab" | "vitals" | "medication" | "lifestyle" | "safety";

  @IsString()
  @Length(1, 1000)
  title: string;

  @IsString()
  @Length(0, 4000)
  detail: string;

  @IsDateString()
  createdAt: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  route?: string;
}

export class SaveRecentActivitiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecentActivityItemDto)
  activities: RecentActivityItemDto[];
}
