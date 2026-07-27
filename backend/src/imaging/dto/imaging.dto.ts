import { IsBase64, IsIn, IsString, Length } from "class-validator";

export class UploadImagingDto {
  @IsBase64()
  imageBase64: string;

  @IsIn(["report_text", "scan_image"])
  kind: "report_text" | "scan_image";

  @IsString()
  @Length(1, 80)
  scanType: string;
}
