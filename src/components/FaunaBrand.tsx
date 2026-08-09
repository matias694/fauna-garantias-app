import React from 'react';

interface FaunaBrandProps {
  className?: string;
  variant?: 'logo' | 'isotipo' | 'full';
  theme?: 'dark' | 'light' | 'color';
}

/**
 * Fauna Propiedades Isotipo (Letter A with Panther Silhouette)
 */
export const FaunaIsotipo: React.FC<{ className?: string; color?: string }> = ({
  className = "w-8 h-8",
  color = "currentColor"
}) => {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Letter A with Panther Head and Body Cutout */}
      <g fill={color}>
        {/* Main "A" geometry */}
        <path
          d="M 250 40 
             L 390 410 
             L 320 410 
             L 282 310 
             L 218 310 
             L 180 410 
             L 110 410 
             Z"
        />
      </g>

      {/* Panther Cutout (White or Background subtraction) */}
      {/* Head and back curve of panther cutout */}
      <path
        d="M 120 410 
           C 180 340 230 300 300 300
           C 340 300 345 280 340 260
           C 335 240 320 220 295 210
           C 270 200 250 200 220 215
           C 200 225 180 240 160 270
           C 140 300 120 350 120 410 Z"
        fill="#FFFFFF"
      />
      {/* Panther Nose / Mouth Detail */}
      <path
        d="M 335 255
           C 342 258 345 264 340 270
           C 335 275 325 272 320 268
           Z"
        fill={color}
      />
      {/* Eye dot */}
      <circle cx="310" cy="235" r="4" fill={color} />
    </svg>
  );
};

/**
 * Fauna Propiedades Full Logo (Wordmark with Panther 'A' + PROPIEDADES subtitle)
 */
export const FaunaLogo: React.FC<{ className?: string; theme?: 'light' | 'dark' | 'color' }> = ({
  className = "h-9",
  theme = "color"
}) => {
  const textColor = theme === 'dark' ? '#FFFFFF' : theme === 'light' ? '#F8FAFC' : '#1E293B';
  const brandGreen = theme === 'dark' ? '#34D399' : '#1E382B';

  return (
    <div className={`flex flex-col justify-center select-none ${className}`}>
      <div className="flex items-baseline tracking-tight font-black leading-none text-2xl" style={{ color: textColor }}>
        <span>F</span>
        <span>A</span>
        <span>U</span>
        <span>N</span>
        {/* Panther A */}
        <span className="relative inline-block mx-[1px]" style={{ color: brandGreen }}>
          A
          <span 
            className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-contain bg-no-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M10,90 Q40,40 90,60 Q70,90 10,90 Z' fill='%231E382B'/%3E%3C/svg%3E")`
            }}
          />
        </span>
      </div>
      <div 
        className="text-[9px] font-medium uppercase tracking-[0.28em] mt-0.5 leading-none opacity-90"
        style={{ color: textColor }}
      >
        PROPIEDADES
      </div>
    </div>
  );
};

/**
 * Modern Brand Badge (Isotipo + Text Pill)
 */
export const FaunaBrandBadge: React.FC<FaunaBrandProps> = ({
  className = "",
  theme = "color"
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-10 h-10 rounded-2xl bg-[#1E382B] text-white flex items-center justify-center p-1.5 shadow-md shadow-[#1E382B]/20 shrink-0 border border-[#2D5A42]/30">
        <FaunaIsotipo className="w-full h-full text-white" color="#FFFFFF" />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">FAUNA</span>
          <span className="bg-[#1E382B] text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
            GARANTÍAS
          </span>
        </div>
        <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1">
          Fauna Propiedades SpA
        </p>
      </div>
    </div>
  );
};
