export function generateIcsContent(params: {
  summary: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
  organizerEmail: string;
}): string {
  const formatDate = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SlotLive Reservation System//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:booking-${Date.now()}@slotlive.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(params.startAt)}`,
    `DTEND:${formatDate(params.endAt)}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${params.description}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN=SlotLive:mailto:${params.organizerEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
