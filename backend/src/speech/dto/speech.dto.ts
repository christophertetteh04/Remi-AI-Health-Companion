import { IsBase64, IsIn, IsOptional } from "class-validator";

export class TranscribeAudioDto {
  @IsBase64()
  audioBase64: string;

  @IsOptional()
  @IsIn(["audio/m4a", "audio/mp4", "audio/aac", "audio/wav", "audio/webm", "audio/3gpp"])
  mimeType?: string;
}
