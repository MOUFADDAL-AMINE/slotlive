import { PrismaClient, Role, BookingStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';

async function runLoadTest() {
  console.log('🚀 Starting SlotLive Concurrency Load Test...');

  const prisma = new PrismaClient();
  await prisma.$connect();

  // Ensure test client exists
  let user = await prisma.user.findUnique({ where: { email: 'loadtest@slotlive.com' } });
  if (!user) {
    const passwordHash = await argon2.hash('Password123!');
    user = await prisma.user.create({
      data: {
        email: 'loadtest@slotlive.com',
        passwordHash,
        firstName: 'Load',
        lastName: 'Tester',
        role: Role.CLIENT,
        isEmailVerified: true,
      },
    });
  }

  // Get a target resource
  const resource = await prisma.resource.findFirst({ where: { isActive: true } });
  if (!resource) {
    console.error('❌ No active resource found. Please run seed first.');
    process.exit(1);
  }

  const targetStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const targetEnd = new Date(new Date(targetStart).getTime() + 60 * 60 * 1000).toISOString();

  // Clean any previous booking for this test slot
  await prisma.booking.deleteMany({
    where: {
      resourceId: resource.id,
      startAt: new Date(targetStart),
    },
  });

  // Log in to get token
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'loadtest@slotlive.com', password: 'Password123!' }),
  });

  const loginData = await loginRes.json();
  const token = loginData.accessToken;

  console.log(`🎯 Target Resource: ${resource.name} (${resource.id})`);
  console.log(`⏰ Target Slot: ${targetStart} -> ${targetEnd}`);
  console.log('⚡ Launching 100 concurrent requests...');

  const CONCURRENT_REQUESTS = 100;
  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': `load-test-${i}-${Date.now()}`,
      },
      body: JSON.stringify({
        resourceId: resource.id,
        startAt: targetStart,
        endAt: targetEnd,
      }),
    }),
  );

  const responses = await Promise.all(requests);

  let successCount = 0;
  let conflictCount = 0;
  let otherCount = 0;

  for (const res of responses) {
    if (res.status === 201) {
      successCount++;
    } else if (res.status === 409) {
      conflictCount++;
    } else {
      otherCount++;
    }
  }

  console.log('\n================ LOAD TEST RESULTS ================');
  console.log(`✅ Total Requests Sent: ${CONCURRENT_REQUESTS}`);
  console.log(`🎉 201 HELD Successes:  ${successCount} (EXACTLY 1 REQUIRED)`);
  console.log(`🔒 409 Conflicts:      ${conflictCount} (409 SLOT_UNAVAILABLE)`);
  console.log(`⚠️  Other Responses:   ${otherCount}`);
  console.log('===================================================\n');

  await prisma.$disconnect();

  if (successCount === 1 && conflictCount === CONCURRENT_REQUESTS - 1) {
    console.log('🏆 CONCURRENCY TEST PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error('❌ CONCURRENCY TEST FAILED!');
    process.exit(1);
  }
}

runLoadTest().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
