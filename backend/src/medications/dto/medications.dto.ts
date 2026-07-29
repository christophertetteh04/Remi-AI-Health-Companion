import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateMedicationDto {
  @IsString()
  @Length(1, 120)
  name: string;

  @IsString()
  @Length(1, 80)
  dose: string;

  @IsString()
  @Length(1, 120)
  frequency: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @IsOptional()
  @IsIn(["manual", "ocr", "chat"])
  source?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  conversationRef?: string;
}

export class LogMedicationTakenDto {
  @IsDateString()
  takenAt: string;
}

export class UpdateMedicationDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  dose?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  frequency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;
}
