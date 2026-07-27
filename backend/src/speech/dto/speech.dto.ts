import { IsBase64 } from "class-validator";

export class TranscribeAudioDto {
  @IsBase64()
  audioBase64: string;
}
