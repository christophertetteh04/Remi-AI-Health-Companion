import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class UploadCheckinDto {
  @IsString()
  imageBase64: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  mediaType?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  conversationRef?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  scanType?: string;

  @IsOptional()
  @IsIn(["urine"])
  sampleType?: "urine";

  @IsOptional()
  @IsString()
  @Length(0, 80)
  bodyLocation?: string;

  @IsOptional()
  @IsIn(["lab_report", "prescription", "scan_report", "scan_image", "symptom_photo", "sample_photo", "general_medical_document"])
  confirmedCategory?: string;
}
