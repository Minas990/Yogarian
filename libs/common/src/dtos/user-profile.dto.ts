import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsDate, IsEmail, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UserLocationDto } from './user-location.dto';

export class UserProfileDto {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;
  
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsOptional()
  @ValidateNested()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        try {
          const jsonStr = value.replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');
          value = JSON.parse(jsonStr);
        } catch {
          return value;
        }
      }
    }
    if (value && typeof value === 'object') {
      return plainToInstance(UserLocationDto, value);
    }
    return value;
  })
  location?: UserLocationDto;
}
