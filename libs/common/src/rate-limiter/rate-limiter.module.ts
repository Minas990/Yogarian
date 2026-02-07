import { Module, DynamicModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { RealIpThrottlerGuard } from './guards';

export interface RateLimiterOptions {
  throttlers?: Array<{
    name: string;
    ttl: number;
    limit: number;
  }>;
}

@Module({})
export class RateLimiterModule {
  static register(options: RateLimiterOptions): DynamicModule {
    if (!options.throttlers?.length) {
      throw new Error('RateLimiterModule.register requires throttlers');
    }
    return {
      module: RateLimiterModule,
      imports: [
        ThrottlerModule.forRoot({
          throttlers: options.throttlers,
        }),
      ],
      providers: [RealIpThrottlerGuard],
      exports: [RealIpThrottlerGuard],
    };
  }

  static registerAsync(options: {
    inject: any[];
    useFactory: (...args: any[]) => RateLimiterOptions | Promise<RateLimiterOptions>;
  }): DynamicModule {
    if (!options?.inject?.length) {
      throw new Error('RateLimiterModule.registerAsync requires inject');
    }
    if (!options?.useFactory) {
      throw new Error('RateLimiterModule.registerAsync requires useFactory');
    }
    return {
      module: RateLimiterModule,
      imports: [
        ThrottlerModule.forRootAsync({
          inject: options.inject,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            if (!config?.throttlers?.length) {
              throw new Error('RateLimiterModule.registerAsync requires throttlers');
            }
            return {
              throttlers: config.throttlers,
            };
          },
        }),
      ],
      providers: [RealIpThrottlerGuard],
      exports: [RealIpThrottlerGuard],
    };
  }
}
