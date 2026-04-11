'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import SignIn from '@/components/SignIn';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      {/* Background Layers */}
      <div className="fixed inset-0 z-0">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>
      <div className="noise-overlay"></div>

      {/* Back Button (testing) */}
      <button
        onClick={() => router.back()}
        className="fixed top-8 left-8 z-50 flex items-center gap-1 text-white/40 hover:text-white transition-colors text-sm font-body"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back
      </button>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <SignIn />
      </main>

      {/* Visual Polish: Ghost Border */}
      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
