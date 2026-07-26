import { IsArray, IsString } from "class-validator";

export class HistoryItem {
  from: "user" | "bot";
  text: string;
}

export class SendMessageDto {
  @IsString()
  message: string;

  @IsArray()
  history: HistoryItem[];
}
