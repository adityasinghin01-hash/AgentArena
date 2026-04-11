'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LandingScreen from '@/components/LandingScreen';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

export default function Home() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/get-started');
  };

  const handleSignIn = () => {
    router.push('/login');
  };

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

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6">
        <LandingScreen 
          onGetStarted={handleGetStarted}
          onSignIn={handleSignIn}
        />
      </main>

      {/* Visual Polish: Ghost Border */}
      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
