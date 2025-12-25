
import React from 'react';
import { VoiceOption, VoiceProfile } from '../types';

export const PREBUILT_VOICES: VoiceOption[] = [
  // Expanded Male Roster
  { id: 'aarav', name: 'Aarav', gender: 'male', description: 'Professional & Deep', baseVoice: 'Fenrir', accent: 'Indian' },
  { id: 'vikram', name: 'Vikram', gender: 'male', description: 'Authoritative & Resonant', baseVoice: 'Puck', accent: 'Indian' },
  { id: 'kabir', name: 'Kabir', gender: 'male', description: 'Mature & Gruff', baseVoice: 'Fenrir', accent: 'Indian' },
  { id: 'rohan', name: 'Rohan', gender: 'male', description: 'Energetic & Fast', baseVoice: 'Charon', accent: 'Indian' },
  { id: 'ishaan', name: 'Ishaan', gender: 'male', description: 'Friendly & Casual', baseVoice: 'Charon', accent: 'Indian' },
  { id: 'neil', name: 'Neil', gender: 'male', description: 'Smooth & Warm', baseVoice: 'Puck', accent: 'Indian' },
  
  // Expanded Female Roster
  { id: 'ananya', name: 'Ananya', gender: 'female', description: 'Clear & Sophisticated', baseVoice: 'Kore', accent: 'Indian' },
  { id: 'aditi', name: 'Aditi', gender: 'female', description: 'Soft & Ethereal', baseVoice: 'Zephyr', accent: 'Indian' },
  { id: 'ishani', name: 'Ishani', gender: 'female', description: 'Confident & Bold', baseVoice: 'Kore', accent: 'Indian' },
  { id: 'kavita', name: 'Kavita', gender: 'female', description: 'Polished & Formal', baseVoice: 'Zephyr', accent: 'Indian' },
  { id: 'sanya', name: 'Sanya', gender: 'female', description: 'Playful & Bright', baseVoice: 'Kore', accent: 'Indian' },
  { id: 'meera', name: 'Meera', gender: 'female', description: 'Gentle & Maternal', baseVoice: 'Zephyr', accent: 'Indian' },
];

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  customProfile: VoiceProfile | null;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoiceId, onSelectVoice, customProfile }) => {
  return (
    <div className="glass p-6 rounded-3xl flex flex-col gap-5 max-h-[480px] overflow-hidden shadow-2xl border-indigo-500/10">
      <div className="flex items-center justify-between sticky top-0 bg-transparent pb-3 z-10">
        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em]">Neural Presets</h3>
        <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full uppercase border border-indigo-500/20">
          {PREBUILT_VOICES.length + (customProfile ? 1 : 0)} Models
        </span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
        {/* Custom Clone */}
        <button
          onClick={() => onSelectVoice('custom')}
          disabled={!customProfile}
          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
            selectedVoiceId === 'custom'
              ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
              : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40'
          } ${!customProfile ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-white uppercase tracking-tight">Active Clone</p>
              {customProfile?.analysis && <span className="text-[7px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase font-black">Link Active</span>}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase truncate mt-1">Target Biometrics Locked</p>
          </div>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Base DNA Presets</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {PREBUILT_VOICES.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onSelectVoice(voice.id)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
              selectedVoiceId === voice.id
                ? 'bg-indigo-600/10 border-indigo-500/50 shadow-xl'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0 shadow-md transition-transform group-hover:rotate-12 ${voice.gender === 'male' ? 'bg-slate-800 border-2 border-slate-700' : 'bg-indigo-950 border-2 border-indigo-800/40'}`}>
              <span className="text-sm font-black uppercase">{voice.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-200 uppercase tracking-tight transition-colors group-hover:text-white">{voice.name}</p>
                <span className={`text-[7px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter border ${voice.gender === 'male' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-pink-500/10 text-pink-400 border-pink-500/30'}`}>
                  {voice.gender}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-bold italic leading-none">{voice.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
