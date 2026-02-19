import { LocationDto } from '@app/common/dtos/location.dto';


export class CreateLocationDto extends LocationDto 
{
  constructor(partial: Partial<CreateLocationDto>) {
    super();
    Object.assign(this, partial);
  }
}
