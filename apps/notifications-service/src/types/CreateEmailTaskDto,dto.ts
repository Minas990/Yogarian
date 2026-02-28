export interface CreateEmailTaskDto {
  email: string;
  subject: string;
  templateName: string;
  payload: Record<string, any>;
  userId: string;
  priority?: number;
}