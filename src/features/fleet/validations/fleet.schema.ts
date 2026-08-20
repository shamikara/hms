import { z } from "zod";
import {
  DriverEmploymentStatus,
  FuelType,
  MaintenanceStatus,
  MaintenanceType,
  OwnershipType,
  SafariTripStatus,
  SafariTripType,
  VehicleDocumentType,
  VehicleStatus,
  VehicleType,
} from "@prisma/client";
import { RATING_MAX, RATING_MIN } from "../lib/rating";

/**
 * Zod schemas for every Safari Fleet input. Server actions parse with these
 * before anything reaches a repository — server actions are a public POST
 * surface, so "the form already validated it" is not a defence.
 */

const id = (label: string) => z.string().cuid(`Valid ${label} is required`);
const optionalId = (label: string) =>
  z
    .string()
    .cuid(`Valid ${label} is required`)
    .optional()
    .or(z.literal("").transform(() => undefined));

/** Trims and converts an empty string to undefined, so blank form fields clear. */
const optionalText = (max = 2000) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim())
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional();

const star = z
  .number()
  .int("Ratings must be whole stars")
  .min(RATING_MIN, `Rating must be at least ${RATING_MIN}`)
  .max(RATING_MAX, `Rating must be at most ${RATING_MAX}`);

const money = z
  .number()
  .min(0, "Amount cannot be negative")
  .max(99_999_999, "Amount is implausibly large");

const currencyCode = z
  .string()
  .length(3, "Currency must be a 3-letter ISO code")
  .transform((v) => v.toUpperCase());

const mileage = z
  .number()
  .int("Mileage must be a whole number of kilometres")
  .min(0, "Mileage cannot be negative")
  .max(9_999_999, "Mileage is implausibly large");

const fuelLevel = z
  .number()
  .int("Fuel level must be a whole percentage")
  .min(0)
  .max(100);

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export const VehicleCreateSchema = z
  .object({
    propertyId: id("property"),
    plateNumber: z
      .string()
      .min(3, "Registration number is required")
      .max(20)
      .transform((v) => v.trim().toUpperCase()),
    displayName: optionalText(80),
    make: optionalText(60),
    model: optionalText(60),
    vehicleType: z.nativeEnum(VehicleType).default(VehicleType.SAFARI_JEEP),
    capacity: z.number().int().min(1, "Seating capacity must be at least 1").max(80),
    safariCapacity: z.number().int().min(1).max(80).optional(),
    fuelType: z.nativeEnum(FuelType).default(FuelType.DIESEL),
    ownershipType: z.nativeEnum(OwnershipType).default(OwnershipType.OWNED),
    purchaseYear: z
      .number()
      .int()
      .min(1950, "Purchase year looks wrong")
      .max(new Date().getUTCFullYear() + 1)
      .optional(),
    currentMileage: mileage.default(0),
    status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
    isActive: z.boolean().default(true),
    notes: optionalText(),
    imageUrls: z.array(z.string().url("Image must be a valid URL")).max(10).default([]),
  })
  .refine(
    (data) => data.safariCapacity === undefined || data.safariCapacity <= data.capacity,
    { message: "Safari capacity cannot exceed seating capacity", path: ["safariCapacity"] }
  );

/** Update omits propertyId: a vehicle does not move between properties here. */
export const VehicleUpdateSchema = z
  .object({
    id: id("vehicle"),
    plateNumber: z
      .string()
      .min(3, "Registration number is required")
      .max(20)
      .transform((v) => v.trim().toUpperCase())
      .optional(),
    displayName: optionalText(80),
    make: optionalText(60),
    model: optionalText(60),
    vehicleType: z.nativeEnum(VehicleType).optional(),
    capacity: z.number().int().min(1).max(80).optional(),
    safariCapacity: z.number().int().min(1).max(80).nullable().optional(),
    fuelType: z.nativeEnum(FuelType).optional(),
    ownershipType: z.nativeEnum(OwnershipType).optional(),
    purchaseYear: z
      .number()
      .int()
      .min(1950)
      .max(new Date().getUTCFullYear() + 1)
      .nullable()
      .optional(),
    currentMileage: mileage.optional(),
    isActive: z.boolean().optional(),
    notes: optionalText(),
    imageUrls: z.array(z.string().url()).max(10).optional(),
  })
  .strict();

export const VehicleStatusChangeSchema = z.object({
  id: id("vehicle"),
  status: z.nativeEnum(VehicleStatus),
  reason: optionalText(300),
});

export const VehicleArchiveSchema = z.object({
  id: id("vehicle"),
  /** false reactivates a previously archived vehicle. */
  archive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export const DriverCreateSchema = z.object({
  employeeId: id("employee"),
  licenseNumber: z
    .string()
    .min(4, "Licence number is required")
    .max(40)
    .transform((v) => v.trim().toUpperCase()),
  licenseExpiry: z.coerce.date(),
  safariExperienceYears: z.number().int().min(0).max(60).default(0),
  employmentStatus: z
    .nativeEnum(DriverEmploymentStatus)
    .default(DriverEmploymentStatus.ACTIVE),
  isAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  imageUrl: z.string().url("Profile image must be a valid URL").optional(),
  notes: optionalText(),
});

export const DriverUpdateSchema = z
  .object({
    id: id("driver"),
    licenseNumber: z
      .string()
      .min(4)
      .max(40)
      .transform((v) => v.trim().toUpperCase())
      .optional(),
    licenseExpiry: z.coerce.date().optional(),
    safariExperienceYears: z.number().int().min(0).max(60).optional(),
    employmentStatus: z.nativeEnum(DriverEmploymentStatus).optional(),
    isAvailable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    imageUrl: z.string().url().nullable().optional(),
    notes: optionalText(),
  })
  .strict();

export const DriverArchiveSchema = z.object({
  id: id("driver"),
  archive: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Availability / assignment
// ---------------------------------------------------------------------------

export const AvailabilityQuerySchema = z
  .object({
    propertyId: id("property"),
    start: z.coerce.date(),
    end: z.coerce.date(),
    guestCount: z.number().int().min(1).max(80).default(1),
    /** Exclude a trip from conflict checks — used when editing that trip. */
    excludeTripId: optionalId("trip"),
  })
  .refine((data) => data.end > data.start, {
    message: "End time must be after start time",
    path: ["end"],
  });

export const TripCreateSchema = z
  .object({
    propertyId: id("property"),
    vehicleId: id("vehicle"),
    driverId: id("driver"),
    guideId: optionalId("guide"),
    routeId: optionalId("route"),
    scheduleId: optionalId("safari schedule"),
    bookingId: optionalId("safari booking"),
    guestId: optionalId("guest"),
    destination: z.string().min(2, "Destination is required").max(120),
    tripType: z.nativeEnum(SafariTripType).default(SafariTripType.MORNING_GAME_DRIVE),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    guestCount: z.number().int().min(1, "At least one guest is required").max(80),
    status: z
      .enum([SafariTripStatus.SCHEDULED, SafariTripStatus.CONFIRMED])
      .default(SafariTripStatus.SCHEDULED),
    operationalNotes: optionalText(),
  })
  .refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: "Return time must be after departure time",
    path: ["scheduledEnd"],
  });

export const TripUpdateSchema = z
  .object({
    id: id("trip"),
    /** Optimistic-lock token from the row the user was looking at. */
    version: z.number().int().min(1),
    vehicleId: optionalId("vehicle"),
    driverId: optionalId("driver"),
    guideId: optionalId("guide").nullable(),
    routeId: optionalId("route").nullable(),
    destination: z.string().min(2).max(120).optional(),
    tripType: z.nativeEnum(SafariTripType).optional(),
    scheduledStart: z.coerce.date().optional(),
    scheduledEnd: z.coerce.date().optional(),
    guestCount: z.number().int().min(1).max(80).optional(),
    status: z
      .enum([
        SafariTripStatus.SCHEDULED,
        SafariTripStatus.CONFIRMED,
        SafariTripStatus.CANCELLED,
      ])
      .optional(),
    operationalNotes: optionalText(),
  })
  .refine(
    (data) =>
      data.scheduledStart === undefined ||
      data.scheduledEnd === undefined ||
      data.scheduledEnd > data.scheduledStart,
    { message: "Return time must be after departure time", path: ["scheduledEnd"] }
  );

export const TripStartSchema = z.object({
  id: id("trip"),
  startMileage: mileage,
  startFuelLevel: fuelLevel.optional(),
  actualDeparture: z.coerce.date().optional(),
  operationalNotes: optionalText(),
});

export const TripCompleteSchema = z.object({
  id: id("trip"),
  endMileage: mileage,
  endFuelLevel: fuelLevel.optional(),
  actualReturn: z.coerce.date().optional(),
  operationalNotes: optionalText(),
  incidentNotes: optionalText(),
  /** Send the vehicle straight to maintenance instead of back to AVAILABLE. */
  sendToMaintenance: z.boolean().default(false),
});

export const TripCancelSchema = z.object({
  id: id("trip"),
  reason: z.string().min(3, "A cancellation reason is required").max(300),
});

export const TripListFilterSchema = z.object({
  propertyId: optionalId("property"),
  status: z.nativeEnum(SafariTripStatus).optional(),
  vehicleId: optionalId("vehicle"),
  driverId: optionalId("driver"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  take: z.number().int().min(1).max(200).default(50),
});

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export const MaintenanceCreateSchema = z
  .object({
    vehicleId: id("vehicle"),
    type: z.nativeEnum(MaintenanceType),
    status: z.nativeEnum(MaintenanceStatus).default(MaintenanceStatus.SCHEDULED),
    description: z.string().min(3, "Description is required").max(500),
    serviceProvider: optionalText(120),
    serviceDate: z.coerce.date(),
    mileageAtService: mileage.optional(),
    cost: money.default(0),
    currencyCode: currencyCode.default("USD"),
    partsReplaced: z.array(z.string().min(1).max(80)).max(30).default([]),
    nextServiceDate: z.coerce.date().optional(),
    nextServiceMileage: mileage.optional(),
    notes: optionalText(),
    documentUrl: optionalText(500),
  })
  .refine(
    (data) => data.nextServiceDate === undefined || data.nextServiceDate > data.serviceDate,
    { message: "Next service date must be after the service date", path: ["nextServiceDate"] }
  );

export const MaintenanceUpdateSchema = z
  .object({
    id: id("maintenance record"),
    type: z.nativeEnum(MaintenanceType).optional(),
    status: z.nativeEnum(MaintenanceStatus).optional(),
    description: z.string().min(3).max(500).optional(),
    serviceProvider: optionalText(120),
    serviceDate: z.coerce.date().optional(),
    mileageAtService: mileage.nullable().optional(),
    cost: money.optional(),
    currencyCode: currencyCode.optional(),
    partsReplaced: z.array(z.string().min(1).max(80)).max(30).optional(),
    nextServiceDate: z.coerce.date().nullable().optional(),
    nextServiceMileage: mileage.nullable().optional(),
    notes: optionalText(),
    documentUrl: optionalText(500),
  })
  .strict();

// ---------------------------------------------------------------------------
// Fuel
// ---------------------------------------------------------------------------

export const FuelLogCreateSchema = z.object({
  vehicleId: id("vehicle"),
  loggedAt: z.coerce.date(),
  mileage,
  litres: z
    .number()
    .positive("Fuel quantity must be greater than zero")
    .max(2000, "Fuel quantity is implausibly large"),
  totalCost: money,
  currencyCode: currencyCode.default("USD"),
  station: optionalText(120),
  receiptRef: optionalText(80),
  notes: optionalText(),
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const VehicleDocumentCreateSchema = z
  .object({
    vehicleId: id("vehicle"),
    type: z.nativeEnum(VehicleDocumentType),
    documentNumber: z
      .string()
      .min(2, "Document number is required")
      .max(60)
      .transform((v) => v.trim()),
    issueDate: z.coerce.date(),
    expiryDate: z.coerce.date(),
    fileUrl: optionalText(500),
    notes: optionalText(),
  })
  .refine((data) => data.expiryDate > data.issueDate, {
    message: "Expiry date must be after the issue date",
    path: ["expiryDate"],
  });

export const VehicleDocumentUpdateSchema = z
  .object({
    id: id("document"),
    documentNumber: z.string().min(2).max(60).optional(),
    issueDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    fileUrl: optionalText(500),
    notes: optionalText(),
  })
  .strict();

export const VehicleDocumentArchiveSchema = z.object({ id: id("document") });

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const SafariReviewSubmitSchema = z.object({
  tripId: id("trip"),
  overallRating: star,
  comment: optionalText(2000),

  driverOverall: star,
  driverSafety: star,
  driverPunctuality: star,
  driverProfessionalism: star,
  driverCommunication: star,
  /** Only asked when the driver also acted as guide/tracker. */
  driverKnowledge: star.optional(),

  vehicleOverall: star,
  vehicleCleanliness: star,
  vehicleComfort: star,
  vehicleCondition: star,
  vehicleRideQuality: star,
  vehicleSuitability: star,
});

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export const AlertAcknowledgeSchema = z.object({
  id: id("alert"),
  /** ACKNOWLEDGED silences it; RESOLVED closes it. */
  resolve: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Inferred form types
// ---------------------------------------------------------------------------

export type VehicleCreateValues = z.infer<typeof VehicleCreateSchema>;
export type VehicleUpdateValues = z.infer<typeof VehicleUpdateSchema>;
export type VehicleStatusChangeValues = z.infer<typeof VehicleStatusChangeSchema>;
export type VehicleArchiveValues = z.infer<typeof VehicleArchiveSchema>;
export type DriverCreateValues = z.infer<typeof DriverCreateSchema>;
export type DriverUpdateValues = z.infer<typeof DriverUpdateSchema>;
export type DriverArchiveValues = z.infer<typeof DriverArchiveSchema>;
export type AvailabilityQueryValues = z.infer<typeof AvailabilityQuerySchema>;
export type TripCreateValues = z.infer<typeof TripCreateSchema>;
export type TripUpdateValues = z.infer<typeof TripUpdateSchema>;
export type TripStartValues = z.infer<typeof TripStartSchema>;
export type TripCompleteValues = z.infer<typeof TripCompleteSchema>;
export type TripCancelValues = z.infer<typeof TripCancelSchema>;
export type TripListFilterValues = z.infer<typeof TripListFilterSchema>;
export type MaintenanceCreateValues = z.infer<typeof MaintenanceCreateSchema>;
export type MaintenanceUpdateValues = z.infer<typeof MaintenanceUpdateSchema>;
export type FuelLogCreateValues = z.infer<typeof FuelLogCreateSchema>;
export type VehicleDocumentCreateValues = z.infer<typeof VehicleDocumentCreateSchema>;
export type VehicleDocumentUpdateValues = z.infer<typeof VehicleDocumentUpdateSchema>;
export type SafariReviewSubmitValues = z.infer<typeof SafariReviewSubmitSchema>;
export type AlertAcknowledgeValues = z.infer<typeof AlertAcknowledgeSchema>;
