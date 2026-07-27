import { IsBase64 } from "class-validator";

export class ScanPrescriptionDto {
  @IsBase64()
  imageBase64: string;
}
