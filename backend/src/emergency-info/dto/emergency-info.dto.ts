import { IsString, Length } from "class-validator";

export class SaveEmergencyInfoDto {
  @IsString()
  @Length(0, 10)
  bloodType: string;

  @IsString()
  @Length(0, 1000)
  allergies: string;

  @IsString()
  @Length(0, 1000)
  medications: string;

  @IsString()
  @Length(0, 120)
  contactName: string;

  @IsString()
  @Length(0, 40)
  contactPhone: string;
}
