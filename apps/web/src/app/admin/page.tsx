'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/components/Providers';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Shield,
  DollarSign,
  Calendar,
  TrendingUp,
  Download,
  XCircle,
  AlertTriangle,
  Building,
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboardPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  // Fetch Stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => fetchApi('/admin/dashboard', { token: token! }),
    enabled: !!token && user?.role === 'ADMIN',
  });

  // Fetch Bookings
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => fetchApi('/admin/bookings', { token: token! }),
    enabled: !!token && user?.role === 'ADMIN',
  });

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return fetchApi(`/admin/bookings/${bookingId}/cancel`, {
        method: 'POST',
        token: token!,
      });
    },
    onSuccess: () => {
      setMessage('Réservation annulée manuellement par l\'administrateur.');
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const handleExportCsv = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/admin/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reservations-slotlive.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setMessage('Erreur lors du téléchargement du fichier CSV.');
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-8 rounded-2xl space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Accès Refusé</h2>
          <p className="text-sm text-slate-400">Ce panneau est réservé aux administrateurs de la plateforme.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center space-x-2">
            <Shield className="w-8 h-8 text-amber-400" />
            <span>Panneau d'Administration</span>
          </h1>
          <p className="text-sm text-slate-400">Statistiques globales et gestion des réservations en direct.</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center space-x-2 border border-slate-700 transition-colors shadow-lg"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exporter CSV</span>
        </button>
      </div>

      {message && (
        <div className="glass-card p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/40 text-indigo-300 text-sm flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-xs text-slate-400 hover:text-white">Fermer</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Revenu Total</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoadingStats ? '...' : `${(stats?.totalRevenueCents || 0) / 100} €`}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium">Paiements validés Stripe</span>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Réservations Confirmées</span>
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoadingStats ? '...' : stats?.confirmedBookings || 0}
          </div>
          <span className="text-[11px] text-slate-400">sur {stats?.totalBookings || 0} au total</span>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Taux d'Occupation</span>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoadingStats ? '...' : `${stats?.occupancyRatePercent || 0}%`}
          </div>
          <span className="text-[11px] text-purple-400 font-medium">Ratio créneaux confirmés</span>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Établissements Actifs</span>
            <Building className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">3</div>
          <span className="text-[11px] text-slate-400">FitZone, Barber, Urban Football</span>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-panel p-6 rounded-3xl space-y-4 border border-slate-800">
        <h2 className="text-lg font-bold text-white">Réservations & Revenus (7 derniers jours)</h2>
        <div className="h-64 w-full">
          {stats?.dailyStats ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="revenue" name="Revenu (€)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bookings" name="Réservations" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">Chargement du graphique...</div>
          )}
        </div>
      </div>

      {/* Live Bookings Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Toutes les réservations</h2>
          <span className="text-xs text-slate-400">{bookings?.length || 0} résultats</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="p-4">Client</th>
                <th className="p-4">Établissement & Ressource</th>
                <th className="p-4">Créneau (UTC)</th>
                <th className="p-4">Prix</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoadingBookings ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Chargement des réservations...</td>
                </tr>
              ) : bookings && bookings.length > 0 ? (
                bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <span className="block font-semibold text-white">{b.user?.firstName} {b.user?.lastName}</span>
                      <span className="text-slate-500 text-[11px]">{b.user?.email}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-semibold text-indigo-300">{b.resource?.venue?.name}</span>
                      <span className="text-slate-400 text-[11px]">{b.resource?.name}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">
                      {format(new Date(b.startAt), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-4 font-bold text-white">{b.priceCents / 100} €</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        b.status === 'HELD' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        b.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {b.status !== 'CANCELLED' && (
                        <button
                          onClick={() => cancelMutation.mutate(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold text-[11px] flex items-center space-x-1 ml-auto"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Annuler</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Aucune réservation enregistrée.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
