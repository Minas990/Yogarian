import { Injectable } from '@nestjs/common';

@Injectable()
export class SessionsServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
