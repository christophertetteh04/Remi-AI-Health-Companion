import { IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class LogSleepDto {
  @IsNumber()
  @Min(0)
  @Max(24)
  hours: number;

  @IsIn(["poor", "fair", "good"])
  quality: string;
}

export class LogActivityDto {
  @IsString()
  @Length(1, 80)
  activityType: string;

  @IsNumber()
  @Min(0)
  @Max(1440)
  minutes: number;
}

export class LogWeightDto {
  @IsNumber()
  @Min(1)
  @Max(700)
  weightKg: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(260)
  heightCm?: number;
}

export class LogSubstanceUseDto {
  @IsString()
  @Length(1, 80)
  substance: string;

  @IsString()
  @Length(0, 500)
  note: string;
}
