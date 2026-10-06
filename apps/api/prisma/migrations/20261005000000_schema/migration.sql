CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SALON_OWNER', 'SALON_STAFF', 'ADMIN');
CREATE TYPE "PlaceType" AS ENUM ('SALON', 'PHARMACY', 'GROCERY', 'FOOD', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PAY_AT_SALON');
CREATE TYPE "PaymentMethod" AS ENUM ('PAY_AT_SALON', 'UPI', 'CARD', 'NETBANKING', 'WALLET');
CREATE TYPE "PromotionType" AS ENUM ('FLAT', 'PERCENT', 'FIRST_BOOKING');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "firebaseUid" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "name" TEXT,
  "avatarUrl" TEXT,
  "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
  "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "city" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "notifyPush" BOOLEAN NOT NULL DEFAULT true,
  "notifySms" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "RefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

CREATE TABLE "Place" (
  "id" TEXT NOT NULL,
  "type" "PlaceType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "phone" TEXT,
  "imageUrl" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "startingPrice" INTEGER,
  "comingSoon" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Place_city_idx" ON "Place"("city");
CREATE INDEX "Place_lat_lng_idx" ON "Place"("lat", "lng");
CREATE INDEX "Place_type_idx" ON "Place"("type");

CREATE TABLE "Salon" (
  "id" TEXT NOT NULL,
  "placeId" TEXT NOT NULL,
  "ownerId" TEXT,
  "slotIntervalMin" INTEGER NOT NULL DEFAULT 15,
  "cancelCutoffHours" INTEGER NOT NULL DEFAULT 2,
  "coverImages" TEXT[] NOT NULL,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isNew" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Salon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Salon_placeId_key" ON "Salon"("placeId");
CREATE INDEX "Salon_isFeatured_idx" ON "Salon"("isFeatured");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "Service" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "categoryId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "durationMin" INTEGER NOT NULL,
  "priceInr" INTEGER NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Service_salonId_idx" ON "Service"("salonId");
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

CREATE TABLE "SalonStaff" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "title" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "SalonStaff_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalonStaff_salonId_idx" ON "SalonStaff"("salonId");

CREATE TABLE "StaffService" (
  "staffId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  CONSTRAINT "StaffService_pkey" PRIMARY KEY ("staffId", "serviceId")
);

CREATE TABLE "WorkingHours" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "openTime" TEXT NOT NULL,
  "closeTime" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkingHours_salonId_dayOfWeek_key" ON "WorkingHours"("salonId", "dayOfWeek");

CREATE TABLE "StaffAvailability" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StaffAvailability_staffId_dayOfWeek_idx" ON "StaffAvailability"("staffId", "dayOfWeek");

CREATE TABLE "BlockedSlot" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "staffId" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BlockedSlot_salonId_startTime_idx" ON "BlockedSlot"("salonId", "startTime");

CREATE TABLE "Holiday" (
  "id" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "name" TEXT,
  CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Holiday_salonId_date_key" ON "Holiday"("salonId", "date");

CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "bookingCode" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAY_AT_SALON',
  "totalAmount" INTEGER NOT NULL,
  "discountAmount" INTEGER NOT NULL DEFAULT 0,
  "qrToken" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Appointment_bookingCode_key" ON "Appointment"("bookingCode");
CREATE UNIQUE INDEX "Appointment_qrToken_key" ON "Appointment"("qrToken");
CREATE INDEX "Appointment_salonId_date_idx" ON "Appointment"("salonId", "date");
CREATE INDEX "Appointment_staffId_startTime_idx" ON "Appointment"("staffId", "startTime");
CREATE INDEX "Appointment_customerId_status_idx" ON "Appointment"("customerId", "status");

CREATE TABLE "AppointmentService" (
  "appointmentId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "priceInr" INTEGER NOT NULL,
  "durationMin" INTEGER NOT NULL,
  CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("appointmentId", "serviceId")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_appointmentId_key" ON "Payment"("appointmentId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_appointmentId_key" ON "Review"("appointmentId");
CREATE INDEX "Review_salonId_idx" ON "Review"("salonId");

CREATE TABLE "Favorite" (
  "userId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "salonId")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

CREATE TABLE "Waitlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "salonId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "preferredStaffId" TEXT,
  "date" DATE NOT NULL,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Waitlist_salonId_date_idx" ON "Waitlist"("salonId", "date");

CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "PromotionType" NOT NULL,
  "value" INTEGER NOT NULL,
  "maxDiscount" INTEGER,
  "minAmount" INTEGER NOT NULL DEFAULT 0,
  "salonId" TEXT,
  "city" TEXT,
  "bannerUrl" TEXT,
  "firstBookingOnly" BOOLEAN NOT NULL DEFAULT false,
  "usageLimit" INTEGER,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX "Promotion_isActive_city_idx" ON "Promotion"("isActive", "city");

CREATE TABLE "PromotionRedemption" (
  "id" TEXT NOT NULL,
  "promotionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "discountAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PromotionRedemption_userId_promotionId_idx" ON "PromotionRedemption"("userId", "promotionId");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Salon" ADD CONSTRAINT "Salon_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalonStaff" ADD CONSTRAINT "SalonStaff_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffService" ADD CONSTRAINT "StaffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedSlot" ADD CONSTRAINT "BlockedSlot_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "SalonStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Waitlist" ADD CONSTRAINT "Waitlist_preferredStaffId_fkey" FOREIGN KEY ("preferredStaffId") REFERENCES "SalonStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD CONSTRAINT appointment_no_overlap
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("startTime", "endTime", '[)') WITH &&
  ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));
