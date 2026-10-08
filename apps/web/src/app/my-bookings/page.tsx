'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/components/Providers';
import { Calendar, Clock, MapPin, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MyBookingsPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => fetchApi('/me/bookings', { token: token! }),
    enabled: !!token,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return fetchApi(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        token: token!,
        body: JSON.stringify({ reason: 'Annulation demandée par le client' }),
      });
    },
    onSuccess: (data) => {
      setCancelMessage(data.message);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 rounded-2xl space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Connexion requise</h2>
          <p className="text-sm text-slate-400">Veuillez vous connecter pour accéder à vos réservations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Mes Réservations</h1>
        <p className="text-sm text-slate-400">Consultez l'historique et gérez vos réservations.</p>
      </div>

      {cancelMessage && (
        <div className="glass-card p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/40 text-indigo-300 text-sm flex items-center justify-between">
          <span>{cancelMessage}</span>
          <button onClick={() => setCancelMessage(null)} className="text-xs text-slate-400 hover:text-white">Fermer</button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="glass-card h-32 rounded-2xl animate-pulse bg-slate-900/50" />
          ))}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking: any) => {
            const start = new Date(booking.startAt);
            const end = new Date(booking.endAt);
            const isConfirmed = booking.status === 'CONFIRMED';
            const isCancelled = booking.status === 'CANCELLED';
            const isHeld = booking.status === 'HELD';

            return (
              <div key={booking.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                      isConfirmed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isCancelled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : isHeld
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {booking.status}
                    </span>
                    <span className="text-xs text-slate-400">ID: {booking.id.slice(0, 8)}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {booking.resource?.venue?.name} — {booking.resource?.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{format(start, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{booking.resource?.venue?.city}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-800 justify-between md:justify-end">
                  <span className="text-lg font-bold text-white">{booking.priceCents / 100} €</span>

                  {isConfirmed && (
                    <button
                      onClick={() => cancelMutation.mutate(booking.id)}
                      disabled={cancelMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Annuler</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 glass-card rounded-2xl space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-lg font-semibold text-white">Aucune réservation pour le moment</h3>
          <p className="text-sm text-slate-400">Explorez nos établissements et réservez votre premier créneau !</p>
        </div>
      )}
    </div>
  );
}
