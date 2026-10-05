import { PrismaClient, PlaceType, PromotionType, AppointmentStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const salonDefs = [
  { name: 'Royal Hair Studio', city: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Style Hub Salon', city: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Urban Cuts', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: "Gentlemen's Grooming", city: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Classic Looks', city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'The Barber Point', city: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Glow & Go', city: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
  { name: 'Fresh Look Salon', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
  { name: 'Elite Style Studio', city: 'Hyderabad', lat: 17.4483, lng: 78.3915 },
  { name: 'City Hair & Beauty', city: 'Mumbai', lat: 19.1136, lng: 72.8697 },
];

const serviceTemplates = [
  { name: 'Haircut', durationMin: 30, priceInr: 150, category: 'Haircut' },
  { name: 'Beard Trim', durationMin: 20, priceInr: 100, category: 'Beard' },
  { name: 'Haircut + Beard', durationMin: 45, priceInr: 220, category: 'Haircut' },
  { name: 'Facial', durationMin: 45, priceInr: 500, category: 'Facial' },
  { name: 'Hair Spa', durationMin: 60, priceInr: 799, category: 'Hair Spa' },
  { name: 'Kids Haircut', durationMin: 25, priceInr: 120, category: 'Kids Haircut' },
];

const categories = [
  'Haircut', 'Hair Styling', 'Beard', 'Shaving', 'Facial', 'Hair Spa',
  'Manicure', 'Pedicure', 'Bridal', 'Makeup', 'Kids Haircut', 'Other',
];

const photos = [
  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
  'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
  'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800',
];

function istDate(dateStr: string, hm: string) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - 330 * 60_000);
}

async function main() {
  await prisma.promotionRedemption.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.blockedSlot.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.service.deleteMany();
  await prisma.salonStaff.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.place.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const catMap: Record<string, string> = {};
  for (const name of categories) {
    const c = await prisma.category.create({ data: { name } });
    catMap[name] = c.id;
  }

  const demo = await prisma.user.create({
    data: {
      phone: '9876543210',
      name: 'Demo Customer',
      email: 'demo@salonslot.app',
      phoneVerified: true,
      emailVerified: true,
      city: 'Bengaluru',
      lat: 12.9716,
      lng: 77.5946,
      firebaseUid: 'mock-phone-9876543210',
    },
  });

  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

  for (let i = 0; i < salonDefs.length; i++) {
    const def = salonDefs[i];
    const place = await prisma.place.create({
      data: {
        type: PlaceType.SALON,
        name: def.name,
        description: `${def.name} — premium grooming in ${def.city}`,
        address: `${100 + i}, MG Road, ${def.city}`,
        city: def.city,
        lat: def.lat,
        lng: def.lng,
        phone: `98${String(10000000 + i).slice(0, 8)}`,
        imageUrl: photos[i % photos.length],
        rating: 4.2 + (i % 7) * 0.1,
        reviewCount: 12 + i * 3,
        isOpen: true,
        startingPrice: 150,
      },
    });
    const salon = await prisma.salon.create({
      data: {
        placeId: place.id,
        coverImages: photos,
        isFeatured: i < 3,
        isNew: i >= 8,
        slotIntervalMin: 15,
        cancelCutoffHours: 2,
      },
    });

    for (let d = 0; d < 7; d++) {
      await prisma.workingHours.create({
        data: {
          salonId: salon.id,
          dayOfWeek: d,
          openTime: '10:00',
          closeTime: '21:00',
          isClosed: d === 0,
        },
      });
    }

    await prisma.holiday.create({
      data: { salonId: salon.id, date: new Date('2026-01-26'), name: 'Republic Day' },
    });

    const staff = [];
    for (let s = 0; s < 2 + (i % 3); s++) {
      const st = await prisma.salonStaff.create({
        data: {
          salonId: salon.id,
          name: ['Arjun', 'Priya', 'Rahul', 'Sneha', 'Vikram'][s],
          title: s === 0 ? 'Senior Stylist' : 'Stylist',
          avatarUrl: photos[s % photos.length],
        },
      });
      for (let d = 1; d <= 6; d++) {
        await prisma.staffAvailability.create({
          data: {
            staffId: st.id,
            dayOfWeek: d,
            startTime: '10:00',
            endTime: '21:00',
            breakStart: '13:00',
            breakEnd: '14:00',
          },
        });
      }
      staff.push(st);
    }

    const services = [];
    for (const tmpl of serviceTemplates) {
      const svc = await prisma.service.create({
        data: {
          salonId: salon.id,
          categoryId: catMap[tmpl.category],
          name: tmpl.name,
          durationMin: tmpl.durationMin,
          priceInr: tmpl.priceInr + i * 10,
          imageUrl: photos[0],
        },
      });
      for (const st of staff) {
        await prisma.staffService.create({ data: { staffId: st.id, serviceId: svc.id } });
      }
      services.push(svc);
    }

    if (i === 0) {
      const start = istDate(today, '17:00');
      const end = istDate(today, '17:30');
      await prisma.appointment.create({
        data: {
          bookingCode: 'SS10000001',
          customerId: demo.id,
          salonId: salon.id,
          staffId: staff[0].id,
          date: new Date(today),
          startTime: start,
          endTime: end,
          status: AppointmentStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAY_AT_SALON,
          totalAmount: services[0].priceInr,
          services: {
            create: [{ serviceId: services[0].id, priceInr: services[0].priceInr, durationMin: 30 }],
          },
        },
      });
    }
  }

  // Non-salon places for map filters
  await prisma.place.createMany({
    data: [
      { type: PlaceType.PHARMACY, name: 'MediQuick Pharmacy', address: '12 Health St', city: 'Bengaluru', lat: 12.975, lng: 77.6, comingSoon: true, imageUrl: photos[0], rating: 4.1, reviewCount: 8 },
      { type: PlaceType.GROCERY, name: 'FreshMart', address: '5 Market Rd', city: 'Bengaluru', lat: 12.968, lng: 77.59, comingSoon: true, imageUrl: photos[1], rating: 4.0, reviewCount: 20 },
      { type: PlaceType.FOOD, name: 'Spice Bowl', address: '9 Food Lane', city: 'Bengaluru', lat: 12.98, lng: 77.61, comingSoon: true, imageUrl: photos[2], rating: 4.5, reviewCount: 40 },
    ],
  });

  await prisma.promotion.createMany({
    data: [
      {
        code: 'FIRST20',
        title: '20% off first booking',
        description: 'New customers only',
        type: PromotionType.PERCENT,
        value: 20,
        maxDiscount: 200,
        minAmount: 150,
        firstBookingOnly: true,
        startsAt: new Date('2025-01-01'),
        endsAt: new Date('2027-12-31'),
        bannerUrl: photos[0],
        city: 'Bengaluru',
      },
      {
        code: 'FLAT50',
        title: 'Flat ₹50 off',
        type: PromotionType.FLAT,
        value: 50,
        minAmount: 200,
        startsAt: new Date('2025-01-01'),
        endsAt: new Date('2027-12-31'),
        bannerUrl: photos[1],
      },
      {
        title: 'Festive Glow',
        description: 'Facial packages starting ₹499',
        type: PromotionType.FLAT,
        value: 0,
        startsAt: new Date('2025-01-01'),
        endsAt: new Date('2027-12-31'),
        bannerUrl: photos[2],
      },
    ],
  });

  console.log('Seed complete. Demo customer phone: 9876543210 (OTP 123456 in mock mode)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
