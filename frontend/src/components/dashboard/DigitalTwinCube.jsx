import React from 'react';

const DigitalTwinCube = ({ color = "#6366f1", size = 64 }) => {
  return (
    <div className={`relative flex items-center justify-center`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <filter id="cube-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="cubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Center Group with Isometric Rotation */}
        <g transform="translate(50, 50)">
          
          {/* Outer Rotating Cube */}
          <g className="animate-[spin_10s_linear_infinite]">
            {/* Cube Frame */}
            <path
              d="M -30 -15 L 0 -30 L 30 -15 L 30 15 L 0 30 L -30 15 Z"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
            <path d="M 0 -30 L 0 0 L 0 30" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
            <path d="M -30 -15 L 0 0 L 30 -15" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
            
            {/* Pulsing Nodes at corners */}
            <circle cx="-30" cy="-15" r="1.5" fill="white" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="30" cy="15" r="1.5" fill="white" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
          </g>

          {/* Middle Counter-Rotating Cube */}
          <g className="animate-[spin_15s_linear_infinite_reverse]">
            <path
              d="M -20 -10 L 0 -20 L 20 -10 L 20 10 L 0 20 L -20 10 Z"
              fill="url(#cubeGradient)"
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.8"
              className="animate-pulse"
            />
            <path d="M 0 -20 L 0 0 L 0 20" stroke={color} strokeWidth="0.5" strokeOpacity="0.6" />
            <path d="M -20 -10 L 0 0 L 20 -10" stroke={color} strokeWidth="0.5" strokeOpacity="0.6" />
          </g>

          {/* Inner Core (Stable/Breathing) */}
          <g className="animate-[pulse_4s_ease-in-out_infinite]">
            <path
              d="M -10 -5 L 0 -10 L 10 -5 L 10 5 L 0 10 L -10 5 Z"
              fill={color}
              fillOpacity="0.3"
              stroke="none"
            />
            <circle cx="0" cy="0" r="2" fill="white" filter="url(#cube-glow)" />
          </g>

          {/* Orbiting Particles */}
          <g className="animate-[spin_4s_linear_infinite]">
             <circle cx="0" cy="-40" r="1.5" fill={color} opacity="0.6" />
          </g>
          <g className="animate-[spin_6s_linear_infinite_reverse]">
             <circle cx="35" cy="0" r="1" fill={color} opacity="0.4" />
          </g>

        </g>
      </svg>
    </div>
  );
};

export default DigitalTwinCube;

