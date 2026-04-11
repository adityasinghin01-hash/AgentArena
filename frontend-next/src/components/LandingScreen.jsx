'use client';

import React from 'react';

const LandingScreen = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="flex max-w-[960px] animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-col items-center text-center">
      {/* Brand Identity */}
      <div className="mb-12 flex flex-col gap-4">
        <h1 className="text-glow font-headline text-7xl font-bold leading-[0.9] tracking-tight text-white md:text-8xl">
          AgentArena
        </h1>
        <p className="font-serif text-3xl italic text-white/90 md:text-4xl">
          The Competitive <span className="text-white">AI Playground</span>
        </p>
      </div>
      
      <p className="font-body mb-16 max-w-xl text-lg font-normal leading-relaxed text-on-surface-variant md:text-xl">
        Describe the outcome. Watch agents compete. <br className="hidden md:block" />
        Deploy the winner in seconds.
      </p>

      {/* CTA Section */}
      <div className="flex w-full flex-col items-center gap-8">
        <button 
          onClick={onGetStarted}
          className="glow-button group h-14 min-w-[260px] transition-transform active:scale-[0.98]"
        >
          <div className="glow-button-track"></div>
          <div className="glow-button-inner px-10">
            <span className="font-headline flex items-center gap-2 text-base font-semibold tracking-wide text-black transition-colors group-hover:text-white">
              Get Started
              <span className="material-symbols-outlined text-sm">north_east</span>
            </span>
          </div>
        </button>
        <button 
          onClick={onSignIn}
          className="glow-button group h-10 min-w-[260px] transition-transform active:scale-[0.98]"
        >
          <div className="glow-button-track"></div>
          <div className="glow-button-inner px-6">
            <span className="font-body text-base font-semibold tracking-wide text-black transition-colors group-hover:text-white">
              Already have an account? Sign in
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default LandingScreen;
