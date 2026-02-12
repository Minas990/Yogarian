import { SetMetadata } from "@nestjs/common";

export const ROLE_KEY = 'role';
export const RolesDecorator = (...args: string[]) => SetMetadata(ROLE_KEY, args);