import React, { useEffect, useState } from 'react';

const DigitalTwinHouse = ({ progress = 0, color = "#6366f1" }) => {
  const [demoProgress, setDemoProgress] = useState(0); 

  const isDemo = progress === 0;
  const activeProgress = isDemo ? demoProgress : progress;

  // Demo Loop
  useEffect(() => {
    if (!isDemo) return;
    const intervalTime = 100;
    const increment = 0.5; 
    const timer = setInterval(() => {
      setDemoProgress(prev => {
        if (prev >= 130) return 0; 
        return prev + increment;
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isDemo]);

  const p = Math.min(100, Math.max(0, activeProgress));
  
  // Stages
  const stage0 = Math.min(1, p / 10); // Site/Ground
  const stage1 = p < 10 ? 0 : Math.min(1, (p - 10) / 20); // Inner
  const stage2 = p < 30 ? 0 : Math.min(1, (p - 30) / 25); // Middle
  const stage3 = p < 55 ? 0 : Math.min(1, (p - 55) / 30); // Outer
  const stage4 = p < 85 ? 0 : Math.min(1, (p - 85) / 15); // Garden/Trees

  // Dynamic Opacity for Fading Inner Layers
  const innerShellOpacity = stage3 > 0.5 ? 0.3 : (stage2 > 0.5 ? 0.6 : 1);
  const middleShellOpacity = stage3 > 0.5 ? 0.5 : 1;
  const innerShellDash = stage2 > 0.2 ? "2 2" : "0";
  const middleShellDash = stage3 > 0.2 ? "2 2" : "0";

  return (
    <div className="relative w-32 h-32 md:w-56 md:h-56 flex items-center justify-center">
      <div className="w-full h-full animate-[float_8s_ease-in-out_infinite] drop-shadow-xl">
        <svg
          viewBox="0 0 380 380"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="wallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
               <stop offset="0%" stopColor={color} stopOpacity={0.05} />
               <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Center and Scale */}
          <g transform="translate(190, 190) scale(1.1)">
            
            {/* --- STAGE 0: THE SITE & PERIMETER WALL --- */}
            <g style={{ opacity: stage0, transition: 'opacity 0.8s' }}>
               {/* Site Ground */}
               <path 
                 d="M -150 75 L 0 150 L 150 75 L 0 0 Z" 
                 fill="url(#groundGradient)" 
                 stroke="none"
               />
               {/* Perimeter Wall (Low) */}
               <path 
                 d="M -150 75 L 0 150 L 150 75" 
                 fill="none" 
                 stroke={color} 
                 strokeWidth="1" 
                 strokeOpacity="0.6"
               />
               <path 
                 d="M -150 75 L -150 65 L 0 140 L 150 65 L 150 75" 
                 fill="none" 
                 stroke={color} 
                 strokeWidth="1" 
                 strokeOpacity="0.6"
               />
               
               {/* Paving / Entrance Path */}
               <path 
                 d="M -20 130 L 20 130 L 20 110 L -20 90 Z" 
                 fill={color} 
                 fillOpacity="0.1" 
                 stroke="none" 
               />
            </g>

            {/* --- STAGE 1: INNER SHELL (Core) --- */}
            <g style={{ opacity: stage1 * innerShellOpacity, transition: 'opacity 0.8s' }}>
              {/* Floor */}
              <path d="M -30 15 L 0 30 L 30 15 L 0 0 Z" fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1" strokeDasharray={innerShellDash} />
              
              {/* Box Faces */}
              <path 
                d="M -30 15 L -30 -35 L 0 -20 L 0 30 Z  M -25 -5 L -5 5 L -5 20 L -25 10 Z" 
                fillRule="evenodd" fill={stage2 > 0.5 ? "none" : "url(#wallGradient)"} stroke={color} strokeWidth="1.2" strokeDasharray={innerShellDash}
              />
              <path 
                d="M 0 30 L 0 -20 L 30 -35 L 30 15 Z M 5 5 L 25 -5 L 25 10 L 5 20 Z" 
                fillRule="evenodd" fill={stage2 > 0.5 ? "none" : "url(#wallGradient)"} stroke={color} strokeWidth="1.2" strokeDasharray={innerShellDash}
              />
              <path 
                d="M -30 -35 L 0 -50 L 30 -35 L 0 -20 Z" 
                fill="none" stroke={color} strokeWidth="1.2" strokeDasharray={innerShellDash}
              />
            </g>

            {/* --- STAGE 2: MIDDLE SHELL --- */}
            <g style={{ opacity: stage2 * middleShellOpacity, transition: 'opacity 0.8s' }}>
               {/* Floor Outline */}
               <path d="M -65 32 L 0 65 L 65 32 L 0 0" fill="none" stroke={color} strokeWidth="1" strokeDasharray={middleShellDash || "3 3"} opacity="0.5" />
               
               {/* Walls */}
               <path 
                d="M -65 32 L -65 -55 L 0 -22 L 0 65 Z 
                   M -55 20 L -10 42 L -10 10 L -55 -12 Z
                   M -55 -25 L -35 -15 L -35 -40 L -55 -50 Z" 
                fillRule="evenodd" fill={stage3 > 0.5 ? "none" : "url(#wallGradient)"} fillOpacity={0.05} stroke={color} strokeWidth="1.2" strokeDasharray={middleShellDash}
              />
              <path 
                d="M 0 65 L 0 -22 L 65 -55 L 65 32 Z 
                   M 10 42 L 55 20 L 55 -12 L 10 10 Z
                   M 35 -15 L 55 -25 L 55 -50 L 35 -40 Z" 
                fillRule="evenodd" fill={stage3 > 0.5 ? "none" : "url(#wallGradient)"} fillOpacity={0.05} stroke={color} strokeWidth="1.2" strokeDasharray={middleShellDash}
              />
              {/* Roof Frame */}
              <path d="M -65 -55 L 0 -88 L 65 -55 L 0 -22 Z" fill="none" stroke={color} strokeWidth="1.2" strokeDasharray={middleShellDash} />
            </g>

            {/* --- STAGE 3: OUTER SHELL (Envelope) --- */}
            <g style={{ opacity: stage3, transition: 'opacity 0.8s' }}>
              {/* Outer Floor */}
              <path d="M -110 55 L 0 110 L 110 55 L 0 0" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" />

              {/* Asymmetric Outer Left Wall */}
              {/* Hole 1: Top Left Small */}
              {/* Hole 2: Bottom Right Large */}
              <path 
                d="M -110 55 L -110 -80 L 0 -25 L 0 110 Z 
                   M -100 -60 L -70 -45 L -70 -20 L -100 -35 Z
                   M -60 -10 L -10 15 L -10 90 L -60 65 Z" 
                fillRule="evenodd" fill="url(#wallGradient)" fillOpacity={0.2} stroke={color} strokeWidth="1.5" 
              />
              
              {/* Asymmetric Outer Right Wall */}
              {/* Hole 3: Top Wide Strip */}
              {/* Hole 4: Bottom Left Vertical */}
              <path 
                d="M 0 110 L 0 -25 L 110 -80 L 110 55 Z 
                   M 20 -20 L 100 -60 L 100 -10 L 20 30 Z
                   M 15 50 L 35 40 L 35 85 L 15 95 Z" 
                fillRule="evenodd" fill="url(#wallGradient)" fillOpacity={0.2} stroke={color} strokeWidth="1.5" 
              />
              
              {/* Outer Roof */}
              <path 
                d="M -110 -80 L 0 -135 L 110 -80 L 0 -25 Z 
                   M -80 -90 L 0 -130 L 80 -90 L 0 -50 Z" 
                fillRule="evenodd" fill="none" stroke={color} strokeWidth="1.5" 
              />
            </g>

            {/* --- STAGE 4: LANDSCAPE & TREES --- */}
            <g style={{ opacity: stage4, transition: 'opacity 1s' }}>
              
              {/* Internal Tree (Poking Out from big window) */}
              <g transform="translate(-40, 40)">
                 <line x1="0" y1="10" x2="0" y2="40" stroke={color} strokeWidth="1" />
                 <path d="M -15 -10 Q 0 -30 15 -10 Q 30 5 15 20 Q 0 30 -15 20 Q -30 5 -15 -10 Z" fill="white" stroke={color} strokeWidth="1" />
              </g>

              {/* External Tree 1 (Left Outside) */}
              <g transform="translate(-130, 50)">
                 <line x1="0" y1="10" x2="0" y2="35" stroke={color} strokeWidth="0.8" />
                 <path d="M -10 -5 Q 0 -20 10 -5 Q 18 5 10 15 Q 0 22 -10 15 Q -18 5 -10 -5 Z" fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
              </g>

              {/* External Tree 2 (Right Outside) */}
              <g transform="translate(130, 40)">
                 <line x1="0" y1="10" x2="0" y2="35" stroke={color} strokeWidth="0.8" />
                 <path d="M -10 -5 Q 0 -20 10 -5 Q 18 5 10 15 Q 0 22 -10 15 Q -18 5 -10 -5 Z" fill="none" stroke={color} strokeWidth="0.8" strokeDasharray="2 1" />
              </g>

               {/* Shrubbery */}
               <circle cx="-110" cy="55" r="2" fill={color} />
               <circle cx="110" cy="55" r="2" fill={color} />
            </g>

          </g>
        </svg>
        
        {/* Label */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-xl px-4 py-1.5 rounded-full border border-indigo-50 shadow-xl shadow-indigo-500/5 whitespace-nowrap z-20">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 flex items-center gap-2">
             {isDemo ? (
               <>
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                  </span>
                 <span className="text-indigo-600">Vision</span>
               </>
             ) : 'FinTwin'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwinHouse;
