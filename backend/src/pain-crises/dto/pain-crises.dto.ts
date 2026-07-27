import { IsInt, IsString, Length, Max, Min } from "class-validator";

export class LogPainCrisisDto {
  @IsInt()
  @Min(0)
  @Max(10)
  severity: number;

  @IsString()
  @Length(0, 500)
  triggerNote: string;

  @IsString()
  @Length(1, 120)
  location: string;
}
