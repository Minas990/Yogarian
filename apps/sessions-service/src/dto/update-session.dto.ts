import { CreateSessionDto } from "./create-session.dto";
import { PartialType } from "@nestjs/mapped-types";

export class UpdateSessionDto extends PartialType(CreateSessionDto) {}