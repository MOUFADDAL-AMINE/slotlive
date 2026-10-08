'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/components/Providers';
import {
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeHold, setActiveHold] = useState<{ bookingId: string; endAt: Date; resourceId: string } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [conflictError, setConflictError] = useState<{ message: string; nearbySlots: any[] } | null>(null);

  // Calculate start and end of week for query
  const baseDate = addDays(new Date(), weekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const fromIso = weekStart.toISOString();
  const toIso = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

  // Fetch venue & resources
  const { data: venue, isLoading: isLoadingVenue } = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => fetchApi(`/venues/${slug}`),
  });

  // Set default resource once loaded
  useEffect(() => {
    if (venue?.resources?.length && !selectedResourceId) {
      setSelectedResourceId(venue.resources[0].id);
    }
  }, [venue, selectedResourceId]);

  // Fetch slots for selected resource
  const { data: slots, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['availability', selectedResourceId, fromIso, toIso],
    queryFn: () =>
      fetchApi(`/resources/${selectedResourceId}/availability?from=${fromIso}&to=${toIso}`, { token: token || undefined }),
    enabled: !!selectedResourceId,
  });

  // Subscribe to real-time WebSockets
  useEffect(() => {
    if (!selectedResourceId) return;

    const socket = getSocket(token || undefined);
    const room = `resource:${selectedResourceId}`;

    socket.emit('subscribe:resource', selectedResourceId);

    const handleSlotEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['availability', selectedResourceId] });
    };

    socket.on('slot.held', handleSlotEvent);
    socket.on('slot.released', handleSlotEvent);
    socket.on('slot.confirmed', handleSlotEvent);
    socket.on('slot.cancelled', handleSlotEvent);

    return () => {
      socket.emit('unsubscribe:resource', selectedResourceId);
      socket.off('slot.held', handleSlotEvent);
      socket.off('slot.released', handleSlotEvent);
      socket.off('slot.confirmed', handleSlotEvent);
      socket.off('slot.cancelled', handleSlotEvent);
    };
  }, [selectedResourceId, queryClient, token]);

  // Countdown timer for active hold
  useEffect(() => {
    if (!activeHold) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeHold.endAt.getTime() - Date.now()) / 1000));
      setCountdownSeconds(remaining);

      if (remaining <= 0) {
        setActiveHold(null);
        queryClient.invalidateQueries({ queryKey: ['availability'] });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold, queryClient]);

  // Mutation to hold slot
  const holdMutation = useMutation({
    mutationFn: async (slot: any) => {
      if (!user) {
        router.push('/login');
        throw new Error('Connexion requise');
      }

      setConflictError(null);
      return fetchApi('/bookings', {
        method: 'POST',
        token: token!,
        idempotencyKey: `hold-${slot.startAt}-${user.id}`,
        body: JSON.stringify({
          resourceId: selectedResourceId,
          startAt: slot.startAt,
          endAt: slot.endAt,
        }),
      });
    },
    onSuccess: (booking) => {
      setActiveHold({
        bookingId: booking.id,
        endAt: new Date(Date.now() + 10 * 60 * 1000),
        resourceId: booking.resourceId,
      });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (err: any) => {
      if (err.status === 409 || err.code === 'SLOT_UNAVAILABLE') {
        setConflictError({
          message: err.message || "Ce créneau vient d'être pris.",
          nearbySlots: err.details?.nearbySlots || [],
        });
      }
    },
  });

  // Mutation to initiate Stripe checkout
  const checkoutMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return fetchApi(`/bookings/${bookingId}/checkout`, {
        method: 'POST',
        token: token!,
      });
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });

  if (isLoadingVenue || !venue) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="glass-card p-12 rounded-2xl animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  const selectedResource = venue.resources.find((r: any) => r.id === selectedResourceId);

  // Group slots by day for calendar display
  const daysMap: Record<string, any[]> = {};
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(weekStart, i);
    const dayKey = format(dayDate, 'yyyy-MM-dd');
    daysMap[dayKey] = [];
  }

  if (slots) {
    slots.forEach((s: any) => {
      const key = s.startAt.split('T')[0];
      if (daysMap[key]) {
        daysMap[key].push(s);
      }
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl space-y-4 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>{venue.address}, {venue.city} • Fuseau : {venue.timezone}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{venue.name}</h1>
            <p className="text-sm text-slate-400 max-w-2xl">{venue.description}</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {venue.resources.map((res: any) => (
              <button
                key={res.id}
                onClick={() => {
                  setSelectedResourceId(res.id);
                  setConflictError(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedResourceId === res.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {res.name} ({res.slotDurationMinutes} min • {res.priceCents / 100} €)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Hold Countdown Banner */}
      {activeHold && (
        <div className="glass-card p-6 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-amber-500/10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Créneau retenu pour vous !</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">10 min</span>
              </h3>
              <p className="text-xs text-slate-300">
                Temps restant pour valider le paiement :{' '}
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {Math.floor(countdownSeconds / 60)}:{String(countdownSeconds % 60).padStart(2, '0')}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => checkoutMutation.mutate(activeHold.bookingId)}
            disabled={checkoutMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Payer par Carte Stripe ({selectedResource?.priceCents / 100} €)</span>
          </button>
        </div>
      )}

      {/* 409 Conflict Error Banner with Recommendations */}
      {conflictError && (
        <div className="glass-card p-6 rounded-2xl border-2 border-rose-500/50 bg-rose-950/30 space-y-4">
          <div className="flex items-start space-x-3 text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-white">{conflictError.message}</h4>
              <p className="text-xs text-rose-200/80">Un autre utilisateur a réservé ce créneau une fraction de seconde avant vous.</p>
            </div>
          </div>

          {conflictError.nearbySlots?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-rose-500/20">
              <span className="text-xs font-semibold text-slate-300">Créneaux proches disponibles :</span>
              <div className="flex flex-wrap gap-2">
                {conflictError.nearbySlots.map((s: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setConflictError(null);
                      holdMutation.mutate(s);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>{s.localStart} - {s.localEnd}</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Controls */}
      <div className="flex items-center justify-between glass-card p-4 rounded-2xl">
        <button
          onClick={() => setWeekOffset((w) => w - 1)}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Semaine précédente</span>
        </button>

        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <CalendarIcon className="w-4 h-4 text-indigo-400" />
          <span>
            Du {format(weekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
          </span>
        </div>

        <button
          onClick={() => setWeekOffset((w) => w + 1)}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-medium"
        >
          <span className="hidden sm:inline">Semaine suivante</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
        <div className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" /><span className="text-slate-300">Libre</span></div>
        <div className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-amber-500 border border-amber-400" /><span className="text-slate-300">Retenu par vous</span></div>
        <div className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-slate-700/60 border border-slate-600" /><span className="text-slate-300">Retenu par un autre</span></div>
        <div className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500" /><span className="text-slate-300">Réservé</span></div>
        <div className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" /><span className="text-slate-500">Passé</span></div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(daysMap).map(([dayKey, daySlots]) => {
          const dayDate = new Date(dayKey);
          const dayName = format(dayDate, 'EEEE d MMM', { locale: fr });

          return (
            <div key={dayKey} className="glass-card rounded-2xl p-3 space-y-2 flex flex-col">
              <div className="text-center pb-2 border-b border-slate-800/80">
                <span className="block text-xs font-bold text-slate-200 capitalize">{dayName}</span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-96 pr-1">
                {daySlots.length === 0 ? (
                  <span className="block text-[11px] text-center text-slate-500 py-4">Fermé</span>
                ) : (
                  daySlots.map((slot: any, idx: number) => {
                    const isFree = slot.status === 'FREE';
                    const isHeldByMe = slot.status === 'HELD_BY_ME';
                    const isHeldByOther = slot.status === 'HELD_BY_OTHER';
                    const isReserved = slot.status === 'RESERVED';
                    const isPast = slot.status === 'PAST';

                    return (
                      <button
                        key={idx}
                        disabled={!isFree || holdMutation.isPending}
                        onClick={() => holdMutation.mutate(slot)}
                        className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                          isFree
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 hover:scale-[1.02] shadow-sm'
                            : isHeldByMe
                            ? 'bg-amber-500 border border-amber-400 text-slate-950 font-bold animate-pulse'
                            : isHeldByOther
                            ? 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
                            : isReserved
                            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 cursor-not-allowed'
                            : 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <span>{slot.localStart}</span>
                        {isFree && <span className="text-[10px] opacity-80">{slot.priceCents / 100}€</span>}
                        {isHeldByMe && <Clock className="w-3.5 h-3.5" />}
                        {isHeldByOther && <Lock className="w-3.5 h-3.5 text-slate-500" />}
                        {isReserved && <span className="text-[10px] font-bold uppercase">Pris</span>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
