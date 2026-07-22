import { AppError, Result, err, ok } from '../types/Result';
import { Logger } from '../logging/Logger';

export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(loggerName: string) {
    this.logger = new Logger(loggerName);
  }

  /**
   * Wraps service operations to ensure they always return a `Result` 
   * and never throw an unhandled exception into the server action layer.
   */
  protected async execute<T>(
    operation: () => Promise<T>
  ): Promise<Result<T, AppError>> {
    try {
      const value = await operation();
      return ok(value);
    } catch (error: any) {
      this.logger.error(`Service execution failed: ${error.message}`, error);
      
      if (error instanceof AppError) {
        return err(error);
      }
      
      // Map Prisma Optimistic Locking failures
      if (error.message === 'OptimisticLockingFailed') {
        return err(new AppError('CONCURRENCY_ERROR', 'The record was modified by another user. Please refresh and try again.'));
      }

      return err(new AppError('INTERNAL_ERROR', 'An unexpected error occurred.'));
    }
  }
}
