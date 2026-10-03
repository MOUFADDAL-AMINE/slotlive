import { describe, it, expect } from 'vitest';
import { generateIcsContent } from './ics.generator';

describe('generateIcsContent', () => {
  it('should generate valid iCalendar format with correct summary and dates', () => {
    const startAt = new Date('2026-10-10T10:00:00.000Z');
    const endAt = new Date('2026-10-10T11:00:00.000Z');

    const ics = generateIcsContent({
      summary: 'Réservation FitZone',
      description: 'Séance de coaching',
      location: 'Paris',
      startAt,
      endAt,
      organizerEmail: 'no-reply@slotlive.com',
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('SUMMARY:Réservation FitZone');
    expect(ics).toContain('DTSTART:20261010T100000Z');
    expect(ics).toContain('DTEND:20261010T110000Z');
  });
});
