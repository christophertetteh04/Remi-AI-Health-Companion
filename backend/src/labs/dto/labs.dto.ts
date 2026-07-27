import { IsBase64, IsIn, IsOptional } from "class-validator";

export class UploadLabDto {
  @IsBase64()
  imageBase64: string;

  @IsOptional()
  @IsIn(["image/jpeg", "image/png", "image/webp"])
  mediaType?: string;
}
