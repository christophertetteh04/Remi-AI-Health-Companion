import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Length } from "class-validator";

export class LogCycleEntryDto {
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate: string | null;

  @IsIn(["light", "medium", "heavy", "spotting", "not_sure"])
  flow: string;

  @IsString()
  @Length(0, 500)
  symptoms: string;
}

export class LogMenopauseEntryDto {
  @IsBoolean()
  hotFlashes: boolean;

  @IsString()
  @Length(0, 500)
  moodNote: string;

  @IsBoolean()
  sleepDisruption: boolean;
}
