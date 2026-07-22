import prisma from '@/core/db/prisma';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected abstract modelName: string;

  /**
   * Retrieves the Prisma delegate dynamically.
   * This allows us to use standard Prisma generic typing patterns.
   */
  protected get delegate(): any {
    return (prisma as any)[this.modelName];
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({
      where: { id, deletedAt: null },
    });
  }

  async create(data: CreateInput): Promise<T> {
    return this.delegate.create({
      data,
    });
  }

  async update(id: string, data: UpdateInput, expectedVersion?: number): Promise<T> {
    const where: any = { id, deletedAt: null };
    
    // Support optimistic locking
    if (expectedVersion !== undefined) {
      where.version = expectedVersion;
    }

    try {
      const updateData: any = { ...data };
      if (expectedVersion !== undefined) {
        updateData.version = { increment: 1 };
      }

      return await this.delegate.update({
        where,
        data: updateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025' && expectedVersion !== undefined) {
        throw new Error('OptimisticLockingFailed'); // Caught by Service layer
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
