import { IsBase64, IsIn } from "class-validator";

export class AnalyzeSamplePhotoDto {
  @IsBase64()
  imageBase64: string;

  @IsIn(["urine", "stool"])
  sampleType: "urine" | "stool";
}
