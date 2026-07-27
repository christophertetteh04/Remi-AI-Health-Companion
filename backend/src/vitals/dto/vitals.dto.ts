import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class SubmitVitalsDto {
  @IsNumber()
  @Min(40)
  @Max(260)
  systolic: number;

  @IsNumber()
  @Min(30)
  @Max(180)
  diastolic: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(800)
  glucose?: number;
}
