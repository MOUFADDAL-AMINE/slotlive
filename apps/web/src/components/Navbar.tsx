'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './Providers';
import { getSocket } from '@/lib/socket';
import { Calendar, Shield, User as UserIcon, LogOut, Radio, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Slot<span className="gradient-text">Live</span></span>
              <span className="block text-[10px] font-medium text-slate-400 tracking-wider uppercase">Réservation temps réel</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link href="/" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors">
              Établissements
            </Link>
            {user && (
              <Link href="/my-bookings" className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Mes Réservations</span>
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="px-3 py-2 rounded-lg text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center space-x-1.5 border border-amber-500/20">
                <Shield className="w-4 h-4" />
                <span>Panneau Admin</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Real-time WebSockets indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
              {isConnected ? 'Direct connecté' : 'Reconnexion...'}
            </span>
          </div>

          {user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <UserIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">{user.firstName} {user.lastName}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50">
                Inscription
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
