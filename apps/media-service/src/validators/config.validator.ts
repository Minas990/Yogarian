import { z } from "zod";

export const envSchema = z.object({
    // Cloudinary
    CLOUDINARY_USER_PHOTO_FOLDER: z
        .string()
        .min(1, "CLOUDINARY_USER_PHOTO_FOLDER is required")
        .regex(/^[a-zA-Z0-9/_-]+$/, "Invalid folder format"),

    CLOUDINARY_SESSION_PHOTO_FOLDER: z
        .string()
        .min(1, "CLOUDINARY_SESSION_PHOTO_FOLDER is required")
        .regex(/^[a-zA-Z0-9/_-]+$/, "Invalid folder format"),

    CLOUDINARY_CLOUD_NAME: z
        .string()
        .min(1, "CLOUDINARY_CLOUD_NAME is required"),

    CLOUDINARY_API_KEY: z
        .string()
        .min(1, "CLOUDINARY_API_KEY is required")
        .regex(/^\d+$/, "CLOUDINARY_API_KEY should be numeric"),

    CLOUDINARY_API_SECRET: z
        .string()
        .min(1, "CLOUDINARY_API_SECRET is required"),

    // Kafka
    KAFKA_CLIENT_ID: z
        .string()
        .min(1, "KAFKA_CLIENT_ID is required"),

    KAFKA_CONSUMER_GROUP_ID: z
        .string()
        .min(1, "KAFKA_CONSUMER_GROUP_ID is required"),

    KAFKA_BROKERS: z
        .string()
        .min(1, "KAFKA_BROKERS is required"),

    // Database
    DATABASE_URL: z
        .string()
        .url("Invalid DATABASE_URL format")
        .min(1, "DATABASE_URL is required"),

    // JWT
    JWT_SECRET: z
        .string()
        .min(1, "JWT_SECRET is required"),

    JWT_EXPIRES_IN: z
        .string()
        .min(1, "JWT_EXPIRES_IN is required"),

    // Service
    MEDIA_PORT: z
        .string()
        .regex(/^\d+$/, "MEDIA_PORT must be a number")
        .transform(Number),

    // Rate Limiting
    RATE_LIMIT_UPLOAD_TTL: z
        .string()
        .regex(/^\d+$/, "RATE_LIMIT_UPLOAD_TTL must be a number")
        .transform(Number),

    RATE_LIMIT_UPLOAD_LIMIT: z
        .string()
        .regex(/^\d+$/, "RATE_LIMIT_UPLOAD_LIMIT must be a number")
        .transform(Number),

    RATE_LIMIT_DELETE_TTL: z
        .string()
        .regex(/^\d+$/, "RATE_LIMIT_DELETE_TTL must be a number")
        .transform(Number),

    RATE_LIMIT_DELETE_LIMIT: z
        .string()
        .regex(/^\d+$/, "RATE_LIMIT_DELETE_LIMIT must be a number")
        .transform(Number),
});
