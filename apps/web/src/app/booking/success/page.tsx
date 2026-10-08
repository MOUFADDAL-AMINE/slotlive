'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="glass-panel p-8 sm:p-12 rounded-3xl space-y-6 border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950 shadow-2xl">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Réservation Confirmée !</h1>
        <p className="text-sm text-slate-300">
          Votre paiement a été validé avec succès. Un email de confirmation contenant votre fichier calendrier{' '}
          <span className="font-semibold text-emerald-400">.ics</span> vient de vous être envoyé.
        </p>
      </div>

      {sessionId && (
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400 inline-block">
          Session Stripe : {sessionId}
        </div>
      )}

      <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/my-bookings"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all"
        >
          <Calendar className="w-4 h-4" />
          <span>Voir mes réservations</span>
        </Link>
        <Link
          href="/"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm flex items-center justify-center space-x-2 transition-colors"
        >
          <span>Retour à l&apos;accueil</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
      <Suspense fallback={<div className="text-slate-400 text-sm">Chargement...</div>}>
        <BookingSuccessContent />
      </Suspense>
    </div>
  );
}
