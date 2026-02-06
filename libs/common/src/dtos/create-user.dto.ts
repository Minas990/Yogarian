import { IsEmail, IsNotEmpty, IsString, IsUUID } from "class-validator";

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