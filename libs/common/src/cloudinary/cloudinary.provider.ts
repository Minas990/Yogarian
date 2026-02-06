import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';



export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (cs : ConfigService) => {
    cloudinary.config({
      cloud_name: cs.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: cs.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: cs.getOrThrow('CLOUDINARY_API_SECRET'),
    });

    return cloudinary;
  },
};
