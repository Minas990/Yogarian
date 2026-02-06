import { IsString } from "class-validator";

export class PhotoMetadataDto {
    @IsString()
    url: string;

    @IsString()
    public_id: string;

    @IsString()
    filename: string;

    @IsString()
    mimetype: string;
}
