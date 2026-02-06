import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CloudinaryProvider } from "./cloudinary.provider";
import { CloudinaryService } from "./cloudinary.service";


@Module(
    {
        imports: [
            ConfigModule,
            MulterModule.register({
                limits: {
                    fileSize: 5 * 1024 * 1024, 
                },
                storage: memoryStorage(),
            })
        ],
        providers: [CloudinaryProvider, CloudinaryService],
        exports: [CloudinaryService]
    }
)
export class CloudinaryModule {}