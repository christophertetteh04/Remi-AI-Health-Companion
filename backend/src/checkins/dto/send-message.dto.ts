import { IsArray, IsIn, IsOptional, IsString } from "class-validator";

export class HistoryItem {
  from: "user" | "bot";
  text: string;
}

export class SendMessageDto {
  @IsString()
  message: string;

  @IsArray()
  history: HistoryItem[];

  @IsOptional()
  @IsIn(["general", "sexual_health"])
  topic?: "general" | "sexual_health";
}
