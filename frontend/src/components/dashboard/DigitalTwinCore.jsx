import React from 'react';

const DigitalTwinCore = ({ size = 80, color = "#6366f1" }) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Dynamic Ambient Glow */}
      <div className="absolute inset-0 bg-indigo-500/15 rounded-full blur-2xl animate-pulse"></div>
      
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]"
      >
        <defs>
          <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* 
          3D Rotating Cube Construction 
          Using an Isometric projection logic within SVG groups
        */}
        <g transform="translate(60, 60)">
          {/* Main Rotation Animation */}
          <g className="animate-[spin_10s_linear_infinite]">
            
            {/* Outer Wireframe Cube */}
            <g className="animate-[bounce_4s_ease-in-out_infinite]">
              {/* Back edges (dimmer) */}
              <path d="M -30 -10 L 0 -25 L 30 -10" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />
              <line x1="0" y1="-25" x2="0" y2="5" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" strokeDasharray="2 2" />

              {/* Front Faces */}
              {/* Top Face */}
              <path d="M -30 -10 L 0 5 L 30 -10 L 0 -25 Z" fill={color} fillOpacity="0.05" stroke={color} strokeWidth="1.5" />
              
              {/* Left Face */}
              <path d="M -30 -10 L -30 20 L 0 35 L 0 5 Z" fill="url(#cubeGradient)" fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
              
              {/* Right Face */}
              <path d="M 0 5 L 0 35 L 30 20 L 30 -10 Z" fill="url(#cubeGradient)" fillOpacity="0.1" stroke={color} strokeWidth="1.5" />
              
              {/* Corner Vertices (Glow points) */}
              <circle cx="-30" cy="-10" r="1.5" fill={color} />
              <circle cx="30" cy="-10" r="1.5" fill={color} />
              <circle cx="0" cy="35" r="1.5" fill={color} />
              <circle cx="0" cy="-25" r="1.5" fill={color} opacity="0.5" />
            </g>

            {/* Inner Nested Core Cube (Opposite Spin) */}
            <g transform="scale(0.5)" className="animate-[spin_6s_linear_infinite_reverse]">
               {/* Core Solid-ish Cube */}
               <path d="M -30 -10 L 0 5 L 30 -10 L 0 -25 Z" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
               <path d="M -30 -10 L -30 20 L 0 35 L 0 5 Z" fill={color} fillOpacity="0.4" stroke={color} strokeWidth="2" />
               <path d="M 0 5 L 0 35 L 30 20 L 30 -10 Z" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
               
               {/* Internal "Energy" Pulse */}
               <circle r="8" fill="white" fillOpacity="0.2">
                  <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.1;0.4;0.1" dur="2s" repeatCount="indefinite" />
               </circle>
            </g>
          </g>

          {/* Orbital Data Ring */}
          <ellipse rx="45" ry="18" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.4" strokeDasharray="4 4" transform="rotate(-15)">
             <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="15s" repeatCount="indefinite" />
          </ellipse>
          
          {/* Traveling Data Bit */}
          <circle r="2" fill={color}>
            <animateMotion 
              path="M -45 0 A 45 18 -15 1 1 45 0 A 45 18 -15 1 1 -45 0" 
              dur="3s" 
              repeatCount="indefinite" 
            />
          </circle>
        </g>
      </svg>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DigitalTwinCore;
