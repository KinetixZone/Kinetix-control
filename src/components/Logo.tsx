import React from 'react';
import { Activity } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo = ({ size = 24, className = "" }: LogoProps) => {
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!imgError ? (
        <img 
          src="/logo.png" 
          alt="Kinetix Logo" 
          className="object-contain"
          style={{ height: size * 2.2, minWidth: size * 2 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <>
          <div className="relative">
            <div className="absolute -inset-1 bg-indigo-600 rounded-lg blur-sm opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-indigo-600 to-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Activity size={size} strokeWidth={3} />
            </div>
          </div>
          <div className="flex flex-col -space-y-1 text-left">
            <span className="text-xl font-black italic tracking-tighter text-slate-900 leading-none">KINETIX</span>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none pl-0.5">Functional Zone</span>
          </div>
        </>
      )}
    </div>
  );
};
