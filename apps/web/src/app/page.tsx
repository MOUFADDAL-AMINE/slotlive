'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { Search, MapPin, Sparkles, Dumbbell, Scissors, Trophy, Heart, ArrowRight } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Tous', icon: Sparkles },
  { id: 'SPORTS', label: 'Sport & Fitness', icon: Dumbbell },
  { id: 'HAIRDRESSER', label: 'Coiffure & Barbier', icon: Scissors },
  { id: 'FOOTBALL', label: 'Football & Indoor', icon: Trophy },
  { id: 'WELLNESS', label: 'Bien-être', icon: Heart },
];

export default function HomePage() {
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const { data: venues, isLoading } = useQuery({
    queryKey: ['venues', selectedType, searchQuery, cityFilter],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (selectedType !== 'ALL') queryParams.set('type', selectedType);
      if (searchQuery) queryParams.set('query', searchQuery);
      if (cityFilter) queryParams.set('city', cityFilter);

      return fetchApi(`/venues?${queryParams.toString()}`);
    },
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/60 bg-gradient-to-b from-indigo-950/30 via-slate-950 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Disponibilités en direct sans rechargement</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Réservez vos créneaux <br />
            <span className="gradient-text">en temps réel & instantané</span>
          </h1>

          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Une plateforme de réservation haute performance avec gestion stricte de la concurrence,
            synchronisation WebSocket en direct et paiement sécurisé.
          </p>

          {/* Search bar */}
          <div className="glass-panel p-2.5 rounded-2xl shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher un établissement, un sport, une ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="relative w-full sm:w-48 flex items-center">
              <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Ville (ex: Paris)"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs & List */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">Établissements partenaires</h2>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = selectedType === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Venues Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card rounded-2xl h-80 animate-pulse bg-slate-900/50" />
            ))}
          </div>
        ) : venues && venues.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue: any) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug}`}
                className="glass-card rounded-2xl overflow-hidden group hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col"
              >
                <div className="relative h-48 bg-slate-800 overflow-hidden">
                  {venue.imageUrl ? (
                    <img
                      src={venue.imageUrl}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-slate-900">
                      <Sparkles className="w-10 h-10 text-indigo-400/50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/50 text-[11px] font-semibold text-indigo-300">
                    {venue.type}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center text-xs text-slate-400 space-x-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{venue.address}, {venue.city}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {venue.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {venue.resources?.length || 0} ressource(s) disponible(s)
                    </span>
                    <span className="font-semibold text-indigo-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                      <span>Voir créneaux</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass-card rounded-2xl space-y-3">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-lg font-semibold text-white">Aucun établissement trouvé</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Essayez de modifier votre recherche ou vos filtres de type et de ville.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
