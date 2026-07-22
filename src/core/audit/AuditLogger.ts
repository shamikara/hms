import prisma from '@/core/db/prisma';
import { Logger } from '../logging/Logger';

const logger = new Logger('AuditLogger');

export class AuditLogger {
  /**
   * Logs a mutation to the immutable AuditLog table.
   * This should ideally be called inside the same Prisma transaction as the mutation.
   */
  static async log(
    tx: any, // Prisma.TransactionClient
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null
  ): Promise<void> {
    try {
      await tx.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          oldValues: oldValues ? (oldValues as any) : undefined,
          newValues: newValues ? (newValues as any) : undefined,
        },
      });
    } catch (error) {
      // In enterprise systems, failing to write an audit log should generally fail the transaction.
      logger.error('Failed to write audit log', { error, entityType, entityId });
      throw new Error('AuditLogWriteFailed');
    }
  }
}
