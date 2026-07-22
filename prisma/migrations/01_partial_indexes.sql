-- ============================================================================
-- MIGRATION: 01_partial_indexes.sql
-- PURPOSE: Implement partial unique indexes for entities that utilize soft 
--          deletes (`deletedAt`). Prisma does not natively support Postgres 
--          partial indexes, so we must execute these manually to prevent 
--          unique constraint collisions on active records while allowing 
--          multiple deleted records to share the same unique key.
-- ============================================================================

-- 1. Room Uniqueness
-- A room number must be unique per floor, but only for active rooms.
-- If a room is destroyed/archived (deletedAt IS NOT NULL), the same room number 
-- can be reused in the future.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Room_roomNumber_floorId_active_idx" 
ON "Room" ("roomNumber", "floorId") 
WHERE "deletedAt" IS NULL;

-- 2. Employee Uniqueness
-- An employee ID must be unique per Organization, but only for active employees.
-- If an employee is terminated (deletedAt IS NOT NULL), they can be rehired or 
-- the ID can theoretically be reused if corporate policy demands it, without 
-- crashing the DB constraint.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "Employee_employeeId_organizationId_active_idx" 
ON "Employee" ("employeeId", "organizationId") 
WHERE "deletedAt" IS NULL;

-- Note: We must drop the default Prisma unique constraints that ignore deletedAt,
-- otherwise our partial index is redundant and the strict constraint will still fail.
-- These will be dropped after the initial Prisma migration creates them.
-- ALTER TABLE "Room" DROP CONSTRAINT IF EXISTS "Room_floorId_roomNumber_key";
-- ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_organizationId_employeeId_key";
