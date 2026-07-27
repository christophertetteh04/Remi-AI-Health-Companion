import { IsDateString, IsOptional, IsString, Length } from "class-validator";

export class DoctorPrepDto {
  @IsOptional()
  @IsDateString()
  visitDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  concern?: string;
}
