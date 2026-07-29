import { IsBase64, IsOptional, IsString, Length, MaxLength } from "class-validator";

export class UploadSymptomMediaDto {
  @IsOptional()
  @IsBase64()
  @MaxLength(7_500_000)
  imageBase64: string;

  @IsString()
  @Length(1, 80)
  bodyLocation: string;
}
