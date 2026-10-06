import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Appointment" ADD CONSTRAINT appointment_no_overlap
      EXCLUDE USING gist (
        "staffId" WITH =,
        tstzrange("startTime", "endTime", '[)') WITH &&
      ) WHERE ("status" IN ('PENDING', 'CONFIRMED'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('Exclusion constraint ensured');
}

main()
  .catch((e) => {
    console.error('Constraint apply failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
