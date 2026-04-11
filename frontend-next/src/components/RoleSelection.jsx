'use client';

import { useState } from 'react';
import ChromaGrid from './ChromaGrid';

const RoleSelection = ({ onContinue }) => {
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'user',
      icon: 'computer',
      title: 'Agent User',
      subtitle: 'Discover and compare AI agents for your goals.',
      borderColor: '#f472b6',
      gradient: 'linear-gradient(145deg, rgba(244,114,182,0.1), rgba(0,0,0,0))',
    },
    {
      id: 'deployer',
      icon: 'terminal',
      title: 'Agent Deployer',
      subtitle: 'Publish your AI agents and reach new users.',
      borderColor: '#38bdf8',
      gradient: 'linear-gradient(145deg, rgba(56,189,248,0.1), rgba(0,0,0,0))',
    },
  ];

  return (
    <div className="flex w-full max-w-[960px] animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center">
      <h2 className="text-glow mb-16 font-headline text-5xl font-bold tracking-tight text-white md:text-6xl text-center">
        Who are you here as?
      </h2>

      <div className="mb-20 w-full">
        <ChromaGrid
          items={roles}
          selectedId={selectedRole}
          onSelect={setSelectedRole}
          columns={2}
          radius={300}
        />
      </div>

      <button
        disabled={!selectedRole}
        onClick={() => onContinue(selectedRole)}
        className={`glow-button group h-14 min-w-[280px] transition-all duration-300 ${
          !selectedRole ? 'opacity-50 cursor-not-allowed scale-95' : 'active:scale-95'
        }`}
      >
        <div className="glow-button-track"></div>
        <div className="glow-button-inner px-12">
          <span className="font-headline flex items-center gap-3 text-base font-semibold tracking-wide text-black transition-colors group-hover:text-white">
            Continue
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </div>
      </button>
    </div>
  );
};

export default RoleSelection;
