import { Injectable, Inject, Optional } from '@nestjs/common';
import { appendFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface LogErrorOptions {
  functionName: string;
  problem: string;
  userId?: string | number;
  error: Error;
  serviceName?: string;
  additionalData?: Record<string, any>;
}

export interface LogInfoOptions {
  functionName: string;
  message: string;
  userId?: string | number;
  serviceName?: string;
  additionalData?: Record<string, any>;
}

export const SERVICE_NAME_TOKEN = 'SERVICE_NAME';

const ANSI_RESET = '\x1b[0m';
const ANSI_BLUE = '\x1b[34m';
const ANSI_RED = '\x1b[31m';

@Injectable()
export class AppLoggerService {
  private logDir = join(process.cwd(), '..', '..', 'logs');

  private colorize(text: string, color: string): string {
    return `${color}${text}${ANSI_RESET}`;
  }

  constructor(
    @Optional()
    @Inject(SERVICE_NAME_TOKEN)
    private readonly defaultServiceName?: string,
  ) {}

  async logError(options: LogErrorOptions): Promise<void> {
    const serviceName = options.serviceName || this.defaultServiceName || 'unknown-service';
    const { functionName, problem, userId, error, additionalData } = options;

    const consoleMessage = `[${serviceName}] ERROR in ${functionName}: ${problem}${userId ? ` (User ID: ${userId})` : ''}`;
    console.error(this.colorize(consoleMessage, ANSI_RED));
    console.error(this.colorize(error.stack || error.message, ANSI_RED));

    this.writeErrorLog({
      timestamp: new Date().toISOString(),
      serviceName,
      functionName,
      problem,
      userId: userId?.toString() || null,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      additionalData: additionalData || {},
    }).catch((err) => {
      console.error(`Failed to write error log: ${err.message}`);
    });
  }

  async logInfo(options: LogInfoOptions): Promise<void> {
    const serviceName = options.serviceName || this.defaultServiceName || 'unknown-service';
    const { functionName, message, userId, additionalData } = options;

    const consoleMessage = `[${serviceName}] INFO in ${functionName}: ${message}${userId ? ` (User ID: ${userId})` : ''}`;
    console.log(this.colorize(consoleMessage, ANSI_BLUE));
  }

  private async writeErrorLog(logData: Record<string, any>): Promise<void> {
    try {
      const serviceName = logData.serviceName;
      const serviceLogDir = join(this.logDir, serviceName);

      if (!existsSync(serviceLogDir)) {
        await mkdir(serviceLogDir, { recursive: true });
      }

      const now = new Date();
      const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const logFilePath = join(serviceLogDir, `${dateString}.log`);

      const logEntry = JSON.stringify(logData);
      await appendFile(logFilePath, logEntry + '\n', 'utf-8');
    } catch (err) {
      console.error(`Failed to write error log: ${err.message}`);
    }
  }
}
