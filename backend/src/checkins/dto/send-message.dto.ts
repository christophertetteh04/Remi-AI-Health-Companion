import { Type } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString, Length, ValidateNested } from "class-validator";

export class HistoryItem {
  @IsIn(["user", "bot"])
  from: "user" | "bot";

  @IsString()
  @Length(1, 2000)
  text: string;
}

export class SendMessageDto {
  @IsString()
  @Length(1, 2000)
  message: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryItem)
  history: HistoryItem[];

  @IsOptional()
  @IsIn(["general", "sexual_health"])
  topic?: "general" | "sexual_health";

  @IsOptional()
  memoryContext?: {
    recentActivities?: { title: string; detail: string; type: string; createdAt: string }[];
    schedules?: { title: string; detail: string; condition?: string }[];
  };
}
