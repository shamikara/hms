-- ============================================================================
-- MIGRATION: 12_online_payments.sql
-- PURPOSE: Card payments through Payments.lk for booking advances.
--
--   OnlinePayment       one checkout attempt for a reservation
--   OnlineRefund        refunds issued from admin against a paid attempt
--   PaymentWebhookEvent webhook deliveries already handled (de-duplication)
--
-- Nothing is charged by this migration and nothing changes for existing
-- bookings. Online payment stays off until it is switched on in
-- Admin > Site Settings and the Payments.lk keys are set.
--
-- HOW TO APPLY
--   node scripts/db-check.mjs --apply      (re-runnable)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnlinePaymentStatus') THEN
    CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'ABANDONED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OnlineRefundStatus') THEN
    CREATE TYPE "OnlineRefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "OnlinePayment" (
  "id"              TEXT NOT NULL,
  "propertyId"      TEXT NOT NULL,
  "reservationId"   TEXT NOT NULL,
  "provider"        TEXT NOT NULL DEFAULT 'payments.lk',
  "mode"            TEXT NOT NULL,
  "kind"            TEXT NOT NULL,
  "amountCents"     INTEGER NOT NULL,
  "currency"        TEXT NOT NULL,
  "status"          "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "checkoutId"      TEXT,
  "checkoutUrl"     TEXT,
  "paymentId"       TEXT,
  "cardBrand"       TEXT,
  "cardLast4"       TEXT,
  "refundedCents"   INTEGER NOT NULL DEFAULT 0,
  "folioPaymentId"  TEXT,
  "freeCancelUntil" TIMESTAMP(3),
  "attentionNote"   TEXT,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "paidAt"          TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OnlinePayment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OnlinePayment_amount_positive" CHECK ("amountCents" > 0),
  CONSTRAINT "OnlinePayment_refund_bounds" CHECK ("refundedCents" >= 0 AND "refundedCents" <= "amountCents")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OnlinePayment_checkoutId_key" ON "OnlinePayment" ("checkoutId");
CREATE UNIQUE INDEX IF NOT EXISTS "OnlinePayment_paymentId_key" ON "OnlinePayment" ("paymentId");
CREATE INDEX IF NOT EXISTS "OnlinePayment_reservationId_idx" ON "OnlinePayment" ("reservationId");
CREATE INDEX IF NOT EXISTS "OnlinePayment_status_expiresAt_idx" ON "OnlinePayment" ("status", "expiresAt");

CREATE TABLE IF NOT EXISTS "OnlineRefund" (
  "id"              TEXT NOT NULL,
  "onlinePaymentId" TEXT NOT NULL,
  "refundId"        TEXT,
  "amountCents"     INTEGER NOT NULL,
  "reason"          TEXT,
  "status"          "OnlineRefundStatus" NOT NULL DEFAULT 'PENDING',
  "failureMessage"  TEXT,
  "requestedById"   TEXT,
  "folioPaymentId"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnlineRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OnlineRefund_onlinePaymentId_fkey" FOREIGN KEY ("onlinePaymentId") REFERENCES "OnlinePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OnlineRefund_amount_positive" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS "OnlineRefund_refundId_key" ON "OnlineRefund" ("refundId");
CREATE INDEX IF NOT EXISTS "OnlineRefund_onlinePaymentId_idx" ON "OnlineRefund" ("onlinePaymentId");

CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" (
  "id"         TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
