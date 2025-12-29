import React, { useEffect, useState } from 'react';
import { PublicUserProfile } from '../types';
import { LogoIcon } from './icons/LogoIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import * as QRCodeLib from 'qrcode';

const QRCode = (QRCodeLib as any).default || QRCodeLib;

interface MemberCardProps {
  user: PublicUserProfile;
}

const SecurityGrid = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 100 100">
    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
    </pattern>
    <rect width="100" height="100" fill="url(#grid)" />
  </svg>
);

export const MemberCard: React.FC<MemberCardProps> = ({ user }) => {
  const [qrUrl, setQrUrl] = useState('');
  
  const dob = user.dob || '04-05-1988'; 
  const expiry = '12-2030'; 

  useEffect(() => {
    if (user.publicKey) {
      const payload = JSON.stringify({
          id: user.id,
          name: user.name,
          key: user.publicKey
      });
      
      // High-resolution QR with comfortable margin to prevent clipping
      QRCode.toDataURL(payload, { 
          width: 800,
          margin: 4,
          errorCorrectionLevel: 'H',
          color: { dark: '#020617', light: '#D4AF37' }
      }).then(setQrUrl).catch(console.error);
    }
  }, [user]);

  return (
    <div className="relative aspect-[1/1.58] w-full max-w-[320px] mx-auto bg-[#020617] rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] border border-[#1e293b] flex flex-col font-sans overflow-hidden group select-none transition-all duration-500 hover:border-gold/30">
        
        {/* Physical Texture - Brushed Metal / Matte Plastic */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-transparent to-white/[0.05] pointer-events-none"></div>
        
        <SecurityGrid />

        {/* Top Branding Section */}
        <div className="relative z-10 px-8 pt-10 pb-6 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
            <div className="space-y-1">
                <h2 className="text-xl font-black text-[#D4AF37] tracking-tighter uppercase gold-text-sim leading-none">Ubuntium</h2>
                <p className="text-[8px] font-black text-white/40 tracking-[0.4em] uppercase">Network State ID</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFD76A] to-[#8C6C1E] p-[1.5px] rounded-xl shadow-glow-gold rotate-3 group-hover:rotate-0 transition-transform duration-700">
                <div className="w-full h-full bg-[#020617] rounded-xl flex items-center justify-center">
                    <LogoIcon className="h-6 w-6 text-[#D4AF37]" />
                </div>
            </div>
        </div>

        {/* Main User Data Section */}
        <div className="relative z-10 p-8 flex-1 flex flex-col gap-8">
            <div className="space-y-1">
                <p className="text-[7px] font-black text-[#D4AF37]/50 uppercase tracking-[0.5em] mb-1">Citizen Holder</p>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none group-hover:gold-text-sim transition-all duration-700 truncate">
                    {user.name}
                </h1>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-2">{user.profession || "Sovereign Node"}</p>
            </div>

            {/* Public Key - Recessed Plate Look */}
            <div className="bg-black/50 border border-white/5 p-4 rounded-2xl shadow-inner relative group-hover:border-gold/20 transition-colors">
                <p className="text-[6px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2">Identification Anchor</p>
                <p className="text-[9px] font-bold text-white font-mono uppercase tracking-tight break-all leading-tight opacity-70">
                    {user.publicKey || 'HANDSHAKE_PENDING...'}
                </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="space-y-1">
                    <p className="text-[6px] font-black text-[#D4AF37]/40 uppercase tracking-[0.4em]">Circle Origin</p>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{user.circle || 'Global'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[6px] font-black text-[#D4AF37]/40 uppercase tracking-[0.4em]">Node Status</p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Verified</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[6px] font-black text-[#D4AF37]/40 uppercase tracking-[0.4em]">Birth Cycle</p>
                    <p className="text-[10px] font-bold text-white/80 font-mono">{dob}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[6px] font-black text-[#D4AF37]/40 uppercase tracking-[0.4em]">Temporal Expiry</p>
                    <p className="text-[10px] font-bold text-white/80 font-mono">{expiry}</p>
                </div>
            </div>
        </div>

        {/* Dedicated QR Payment Zone - Fits perfectly in the bottom half */}
        <div className="relative z-10 px-8 pb-10 mt-auto">
            <div className="flex items-end justify-between gap-6">
                <div className="flex-1 pb-2">
                    <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.2em] italic opacity-90 leading-relaxed">
                        "The Commons protect<br/>those who protect<br/>the Commons"
                    </p>
                </div>
                
                {/* The QR Code Container - Absolute fit control */}
                <div className="relative group/qr">
                    <div className="w-28 h-28 p-1 bg-gradient-to-br from-[#FFD76A] via-[#D4AF37] to-[#8C6C1E] rounded-2xl shadow-2xl transition-transform duration-500 group-hover/qr:scale-105">
                        <div className="w-full h-full bg-[#020617] rounded-xl flex items-center justify-center overflow-hidden p-1.5">
                            {qrUrl ? (
                                <img 
                                    src={qrUrl} 
                                    alt="Payment Node" 
                                    className="w-full h-full object-contain" 
                                />
                            ) : (
                                <LoaderIcon className="h-6 w-6 animate-spin text-[#D4AF37] opacity-20" />
                            )}
                        </div>
                    </div>
                    <p className="absolute -bottom-5 right-0 text-[6px] font-black text-gray-600 uppercase tracking-widest whitespace-nowrap">Authorized Settlement Node</p>
                </div>
            </div>
        </div>

        {/* Global Reflective Overlays */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent pointer-events-none"></div>
        <div className="absolute top-0 left-[-150%] w-[120%] h-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-all duration-[2500ms] ease-in-out pointer-events-none"></div>
        
        <style>{`
            .gold-text-sim {
                background: linear-gradient(135deg, #FFF1B0 0%, #FFD76A 25%, #D4AF37 50%, #8C6C1E 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
        `}</style>
    </div>
  );
};