import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { Roles } from "../types";

//for auth service
export class CreateUserDto 
{
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @IsNotEmpty()
    @IsString()
    password: string;
    
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsEnum(Roles)
    @IsOptional()
    role?: Roles = Roles.USER;
}

//for user service
export class CreateUserProfileDto 
{
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsUUID()
    @IsNotEmpty()
    userId: string;
}