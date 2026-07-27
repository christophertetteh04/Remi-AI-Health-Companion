import { IsIn } from "class-validator";

export class DeleteAccountDataDto {
  @IsIn(["DELETE"])
  confirmation: "DELETE";
}
