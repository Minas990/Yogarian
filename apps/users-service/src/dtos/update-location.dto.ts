import { UserLocationDto } from "@app/common/dtos/user-location.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateLocationDto extends PartialType(UserLocationDto) {}