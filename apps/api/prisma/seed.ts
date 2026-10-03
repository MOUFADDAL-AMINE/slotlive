import { PrismaClient, Role, VenueType, BookingStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.emailLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.closureException.deleteMany();
  await prisma.openingRule.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const passwordHash = await argon2.hash('Password123!');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@slotlive.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'SlotLive',
      role: Role.ADMIN,
      isEmailVerified: true,
    },
  });

  const client = await prisma.user.create({
    data: {
      email: 'client@slotlive.com',
      passwordHash,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: Role.CLIENT,
      isEmailVerified: true,
    },
  });

  console.log(`✅ Created Admin (${admin.email}) and Client (${client.email})`);

  // 2. Create Venues
  const venueSports = await prisma.venue.create({
    data: {
      name: 'FitZone Club',
      slug: 'fitzone-club',
      type: VenueType.SPORTS,
      description: 'Centre de remise en forme haut de gamme avec coachs et terrains de squash.',
      address: '12 Rue de la Paix',
      city: 'Paris',
      timezone: 'Europe/Paris',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800',
    },
  });

  const venueBarber = await prisma.venue.create({
    data: {
      name: 'Barber Studio 9',
      slug: 'barber-studio-9',
      type: VenueType.HAIRDRESSER,
      description: 'Salon de coiffure et barbier traditionnel au cœur de Lyon.',
      address: '45 Place Bellecour',
      city: 'Lyon',
      timezone: 'Europe/Paris',
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800',
    },
  });

  const venueFootball = await prisma.venue.create({
    data: {
      name: 'Urban Football Arena',
      slug: 'urban-football-arena',
      type: VenueType.FOOTBALL,
      description: 'Terrains de foot à 5 synthétiques dernière génération indoor et outdoor.',
      address: 'Boulevard Anfa',
      city: 'Casablanca',
      timezone: 'Africa/Casablanca',
      imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800',
    },
  });

  console.log(`✅ Created 3 Venues`);

  // 3. Create Resources
  const resourcesData = [
    // FitZone Club
    { venueId: venueSports.id, name: 'Coach Personnel - Alex', slotDurationMinutes: 60, priceCents: 5000, description: 'Séance individuelle de coaching personnalisé.' },
    { venueId: venueSports.id, name: 'Court Squash #1', slotDurationMinutes: 45, priceCents: 3000, description: 'Terrain de squash professionnel climatise.' },
    { venueId: venueSports.id, name: 'Court Squash #2', slotDurationMinutes: 45, priceCents: 3000, description: 'Terrain de squash professionnel climatise.' },
    
    // Barber Studio 9
    { venueId: venueBarber.id, name: 'Fauteuil Barbier - Marc', slotDurationMinutes: 30, priceCents: 2500, description: 'Taille de barbe et coupe classique.' },
    { venueId: venueBarber.id, name: 'Fauteuil Barbier - Sam', slotDurationMinutes: 30, priceCents: 2500, description: 'Soin complet visage et barbe.' },
    
    // Urban Football Arena
    { venueId: venueFootball.id, name: 'Terrain Synthétique #1 (Indoor)', slotDurationMinutes: 60, priceCents: 8000, description: 'Terrain couvert 5v5 avec vestiaires VIP.' },
    { venueId: venueFootball.id, name: 'Terrain Synthétique #2 (Indoor)', slotDurationMinutes: 60, priceCents: 8000, description: 'Terrain couvert 5v5 avec tableau d\'affichage.' },
    { venueId: venueFootball.id, name: 'Terrain Outdoor #3', slotDurationMinutes: 60, priceCents: 6000, description: 'Terrain extérieur éclairé.' },
    { venueId: venueFootball.id, name: 'Terrain Outdoor #4', slotDurationMinutes: 60, priceCents: 6000, description: 'Terrain extérieur éclairé.' },
    { venueId: venueFootball.id, name: 'Salle de Récupération & Cryo', slotDurationMinutes: 30, priceCents: 4000, description: 'Séance de récupération musculaire post-match.' },
  ];

  const resources = [];
  for (const res of resourcesData) {
    const created = await prisma.resource.create({ data: res });
    resources.push(created);

    // Create opening rules (Monday to Saturday 08:00 - 20:00)
    for (let day = 1; day <= 6; day++) {
      await prisma.openingRule.create({
        data: {
          resourceId: created.id,
          dayOfWeek: day,
          openTime: '08:00',
          closeTime: '20:00',
        },
      });
    }
  }

  console.log(`✅ Created ${resources.length} Resources with opening rules`);

  // 4. Sample Demo Bookings
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startDemo = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 10, 0, 0));
  const endDemo = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 11, 0, 0));

  const demoBooking = await prisma.booking.create({
    data: {
      userId: client.id,
      resourceId: resources[0].id,
      startAt: startDemo,
      endAt: endDemo,
      status: BookingStatus.CONFIRMED,
      priceCents: resources[0].priceCents,
      currency: resources[0].currency,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: demoBooking.id,
      stripeCheckoutSessionId: 'cs_test_demo_session_123',
      stripePaymentIntentId: 'pi_test_demo_intent_123',
      amountCents: resources[0].priceCents,
      currency: resources[0].currency,
      status: 'SUCCEEDED',
    },
  });

  console.log(`✅ Created demo booking for tomorrow 10:00-11:00 UTC`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
