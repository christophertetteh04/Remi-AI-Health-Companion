import { IsBase64, IsString, Length } from "class-validator";

export class UploadSymptomMediaDto {
  @IsBase64()
  imageBase64: string;

  @IsString()
  @Length(1, 80)
  bodyLocation: string;
}
