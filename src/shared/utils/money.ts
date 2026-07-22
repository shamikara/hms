import { Prisma } from '@prisma/client';

/**
 * Enterprise standard for dealing with Decimal types in JS.
 * Ensures we never mutate to a native float causing precision loss.
 */
export class MoneyUtils {
  static add(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
    return a.plus(b);
  }

  static subtract(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
    return a.minus(b);
  }

  static multiply(a: Prisma.Decimal, multiplier: number | Prisma.Decimal): Prisma.Decimal {
    return a.times(multiplier);
  }

  static calculateTax(subtotal: Prisma.Decimal, taxRatePercent: number): Prisma.Decimal {
    const rate = new Prisma.Decimal(taxRatePercent).dividedBy(100);
    return subtotal.times(rate).toDecimalPlaces(4);
  }

  static fromNumber(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value);
  }
}
