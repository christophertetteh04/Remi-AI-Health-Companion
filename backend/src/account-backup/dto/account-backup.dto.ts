import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class SaveAccountBackupDto {
  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  schemaVersion?: string;
}
