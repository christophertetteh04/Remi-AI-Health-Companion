import { IsBoolean, IsIn } from "class-validator";
import { TRACKABLE_CONDITIONS } from "../conditions.service";

export class ToggleConditionDto {
  @IsIn(TRACKABLE_CONDITIONS)
  condition: string;

  @IsBoolean()
  enabled: boolean;
}
