
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AppMode, VoiceProfile, ConnectionStatus, VoiceStyle, Language } from './types';
import { 
  decode, 
  decodeAudioData, 
  createPcmBlob, 
  encode 
} from './services/audioUtils';
import VoiceProfileCard from './components/VoiceProfileCard';
import VoiceSelector, { PREBUILT_VOICES } from './components/VoiceSelector';
import AudioVisualizer from './components/AudioVisualizer';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.VOICEOVER);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('ananya');
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  
  // Advanced Neural Parameters
  const [temperature, setTemperature] = useState<number>(0.5); // Default to lower for stability
  const [pitch, setPitch] = useState<number>(1.0);
  const [tone, setTone] = useState<number>(1.0);
  const [speed, setSpeed] = useState<string>('normal');
  const [activeStyles, setActiveStyles] = useState<VoiceStyle[]>([VoiceStyle.NEUTRAL]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.ENGLISH);
  const [vocalSeed, setVocalSeed] = useState<number>(888);
  const [isSeedLocked, setIsSeedLocked] = useState<boolean>(true);
  
  // Audio references
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);

  const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

  const getActiveVoiceConfig = () => {
    if (selectedVoiceId === 'custom' && voiceProfile) {
      return {
        name: 'Neural Clone',
        baseVoice: 'Kore' as const,
        instruction: `STRICT NEURAL RECONSTRUCTION. BIOMETRIC DNA: ${voiceProfile.analysis}. REPLICATE EXACT TIMBRE, RESONANCE, AND PITCH OFFSET AT ${pitch}x AND TONE BRIGHTNESS AT ${tone}x. PREVENT ANY PHONETIC DRIFT.`
      };
    }
    const prebuilt = PREBUILT_VOICES.find(v => v.id === selectedVoiceId) || PREBUILT_VOICES[0];
    return {
      name: prebuilt.name,
      baseVoice: prebuilt.baseVoice as any,
      instruction: `Persona: ${prebuilt.name}. Identity: ${prebuilt.gender}, ${prebuilt.accent} accent. Adjust base pitch to ${pitch}x and tone to ${tone}x.`
    };
  };

  const getStyleInstruction = () => {
    return activeStyles.map(style => {
      switch(style) {
        case VoiceStyle.ADVERTISING: 
          return "STYLE: HYPER-ADVERTISING. Use a complex blend of EXCITING energy, COMMANDING HARSHNESS for authority, DEEP EMOTIONAL WARMTH for trust, and a MAGNETIC ATTRACTION to pull the audience in. This is a high-conversion, charismatic vocal fusion.";
        case VoiceStyle.HORROR: return "STYLE: CINEMATIC HORROR. Shaky breath, eerie pauses, haunting whispers.";
        case VoiceStyle.EMOTIONAL: return "STYLE: VULNERABLE. Breathy, quivering intonation, heavy emotional weight.";
        case VoiceStyle.HAPPY: return "STYLE: JUBILANT. Bright smile-tone, high pitch, rapid positive inflections.";
        case VoiceStyle.WHISPER: return "STYLE: INTIMATE ASMR WHISPER.";
        case VoiceStyle.NARRATIVE: return "STYLE: MASTER STORYTELLER. Wide dynamic range and character modulation.";
        default: return "STYLE: NATURAL CONVERSATION.";
      }
    }).join(" fused with ");
  };

  const toggleStyle = (style: VoiceStyle) => {
    if (style === VoiceStyle.NEUTRAL) {
      setActiveStyles([VoiceStyle.NEUTRAL]);
      return;
    }
    setActiveStyles(prev => {
      const filtered = prev.filter(s => s !== VoiceStyle.NEUTRAL);
      if (filtered.includes(style)) {
        const next = filtered.filter(s => s !== style);
        return next.length === 0 ? [VoiceStyle.NEUTRAL] : next;
      }
      return [...filtered, style];
    });
  };

  const stopLiveSession = () => {
    if (liveSessionRef.current) { liveSessionRef.current.close(); liveSessionRef.current = null; }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setStatus(ConnectionStatus.DISCONNECTED);
  };

  const startLiveSession = async (isSwitching = false) => {
    if (!isSwitching) setStatus(ConnectionStatus.CONNECTING);
    try {
      const ai = getAI();
      const config = getActiveVoiceConfig();
      if (!micStreamRef.current) micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!outputAudioContextRef.current) outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => setStatus(ConnectionStatus.CONNECTED),
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => setStatus(ConnectionStatus.ERROR),
          onclose: () => setStatus(ConnectionStatus.DISCONNECTED)
        },
        config: {
          seed: isSeedLocked ? vocalSeed : undefined,
          responseModalities: [Modality.AUDIO],
          systemInstruction: `YOU ARE ${config.name}. ${config.instruction} PERFORM IN ${selectedLanguage}. TONE: ${getStyleInstruction()}. SPEED: ${speed}. FORCE DETERMINISTIC VOCAL OUTPUT.`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.baseVoice } } }
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) { setStatus(ConnectionStatus.ERROR); }
  };

  const handleVoiceover = async () => {
    if (!voiceoverText.trim()) return;
    setIsProcessing(true);
    setDetectedEmotion(null);
    setLastAudioUrl(null);
    
    try {
      const ai = getAI();
      const config = getActiveVoiceConfig();

      // Step 1: Sentiment Intelligence
      const emotionPrompt = `Determine the psychological subtext for ${selectedLanguage} text: "${voiceoverText}". Return ONLY the emotion name.`;
      const emotionResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: emotionPrompt }] }],
      });
      const emotion = emotionResponse.text?.trim() || "Neutral";
      setDetectedEmotion(emotion);

      // Step 2: Synthesis with Locked Seed
      const currentSeed = isSeedLocked ? vocalSeed : Math.floor(Math.random() * 1000000);
      if (!isSeedLocked) setVocalSeed(currentSeed);

      const ttsPrompt = `TASK: DETERMINISTIC BIOMETRIC RENDERING.
      DNA: ${config.instruction}.
      LANGUAGE: ${selectedLanguage}.
      EMOTION: ${emotion}.
      STYLE FUSION: ${getStyleInstruction()}.
      
      CONTENT: "${voiceoverText}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
          seed: currentSeed,
          temperature: temperature,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.baseVoice } } }
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const audioBytes = decode(audioData);
        setLastAudioUrl(URL.createObjectURL(createWavBlob(audioBytes, 24000)));
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err: any) { alert("Neural stability failure. Recalibrate seed."); } finally { setIsProcessing(false); }
  };

  const createWavBlob = (pcmData: Uint8Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + pcmData.length);
    const view = new DataView(buffer);
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);
    new Uint8Array(buffer, 44).set(pcmData);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[#050810]">
      <header className="w-full max-w-7xl mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900 pb-8">
        <div className="relative group">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 tracking-tighter uppercase italic leading-none">VoiceMirror</h1>
          <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.6em] mt-3">Neural Parity Engine v5.0</p>
        </div>
        <div className="flex bg-slate-900/60 p-1.5 rounded-3xl border border-indigo-500/10 shadow-2xl backdrop-blur-xl">
          <button onClick={() => setMode(AppMode.VOICEOVER)} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${mode === AppMode.VOICEOVER ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}>Studio</button>
          <button onClick={() => setMode(AppMode.LIVE_CHAT)} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${mode === AppMode.LIVE_CHAT ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300'}`}>Live Relay</button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-4 flex flex-col gap-6">
          <VoiceSelector selectedVoiceId={selectedVoiceId} onSelectVoice={setSelectedVoiceId} customProfile={voiceProfile} />
          <VoiceProfileCard profile={voiceProfile} onProfileChange={(p) => { setVoiceProfile(p); setSelectedVoiceId('custom'); }} />
          
          <div className="glass p-8 rounded-3xl border border-indigo-500/10 shadow-2xl">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase mb-8 tracking-[0.4em] italic">Precision Parameters</h3>
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Neural Stability (Language)</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(Language).map((l) => (
                    <button key={l} onClick={() => setSelectedLanguage(l)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedLanguage === l ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-300'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pitch Shift</label>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">{pitch.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.5" max="1.5" step="0.1" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tone (Timbre)</label>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">{tone.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.5" max="1.5" step="0.1" value={tone} onChange={(e) => setTone(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Randomness (Temp)</label>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">{(temperature * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Seed Lock</label>
                  <button onClick={() => setIsSeedLocked(!isSeedLocked)} className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${isSeedLocked ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
                    {isSeedLocked ? 'LOCKED' : 'DYNAMIC'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="number" value={vocalSeed} onChange={(e) => setVocalSeed(parseInt(e.target.value))} className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-indigo-400 w-full outline-none focus:border-indigo-500/50" />
                  <button onClick={() => setVocalSeed(Math.floor(Math.random() * 10000))} className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:text-indigo-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Vocal Synthesis Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(VoiceStyle).filter(s => s !== VoiceStyle.COMBINATION).map((s) => (
                    <button key={s} onClick={() => toggleStyle(s as VoiceStyle)} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeStyles.includes(s as VoiceStyle) ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-950 border-slate-800 text-slate-600 hover:text-slate-300'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 flex flex-col gap-6">
          {mode === AppMode.VOICEOVER ? (
            <div className="glass p-10 rounded-[3rem] flex-1 flex flex-col min-h-[650px] border-t-8 border-indigo-600 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)] relative overflow-hidden">
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter">Script Rendering</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mt-3">Active DNA: {getActiveVoiceConfig().name} • {selectedLanguage}</p>
                </div>
                {detectedEmotion && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 px-6 py-3 rounded-full backdrop-blur-3xl flex items-center gap-4 group">
                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">{detectedEmotion}</span>
                  </div>
                )}
              </div>
              <textarea value={voiceoverText} onChange={(e) => setVoiceoverText(e.target.value)} placeholder={`Input script in ${selectedLanguage}... Seed locking is active to prevent phonetic drift.`} className="flex-1 w-full bg-slate-950/60 border border-slate-800/80 rounded-[2rem] p-10 text-slate-100 outline-none resize-none mb-10 transition-all focus:border-indigo-500/40 text-2xl font-light leading-relaxed placeholder:text-slate-800 shadow-inner" />
              <div className="flex gap-4 relative z-10">
                <button onClick={handleVoiceover} disabled={isProcessing || (selectedVoiceId === 'custom' && !voiceProfile?.analysis)} className={`flex-1 py-7 rounded-3xl font-black text-xs uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-5 shadow-3xl active:scale-95 border border-indigo-500/20 ${isProcessing ? 'bg-slate-800 text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-indigo-800 text-white hover:brightness-110 shadow-indigo-600/30'}`}>
                  {isProcessing ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" /> : "Render Biometric Sync"}
                </button>
                {lastAudioUrl && (
                  <a href={lastAudioUrl} download={`voice_mirror_${selectedLanguage}.wav`} className="p-7 bg-slate-950 border border-slate-800 rounded-3xl hover:border-indigo-500/60 text-indigo-400 transition-all flex items-center justify-center shadow-2xl active:scale-90"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></a>
                )}
              </div>
            </div>
          ) : (
            <div className="glass p-10 rounded-[3rem] flex-1 flex flex-col min-h-[650px] relative overflow-hidden border-t-8 border-cyan-500 shadow-3xl">
              <div className="flex justify-between items-center mb-12 relative z-10">
                <h2 className="text-4xl font-black text-white italic tracking-tighter">Live Relay</h2>
                <div className="text-[10px] font-black text-slate-500 bg-slate-950/90 border border-slate-800 px-6 py-3 rounded-full uppercase tracking-widest">Locked: {getActiveVoiceConfig().name} • {selectedLanguage}</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-14 relative z-10">
                <div className={`w-72 h-72 rounded-full flex items-center justify-center transition-all duration-1000 ${status === ConnectionStatus.CONNECTED ? 'bg-indigo-600/5 scale-110 border-2 border-indigo-500/30 shadow-[0_0_180px_rgba(79,70,229,0.2)]' : 'bg-slate-950 border-2 border-slate-900'}`}>
                   {status === ConnectionStatus.CONNECTED ? (
                     <div className="flex gap-4 items-center">
                        {[...Array(9)].map((_, i) => <div key={i} className="w-3.5 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s`, opacity: 0.3 + (i * 0.1) }} />)}
                     </div>
                   ) : <svg className="w-32 h-32 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                </div>
                <div className="max-w-md">
                  <h3 className="text-2xl font-black text-slate-100 mb-5 uppercase tracking-[0.4em] italic">{status === ConnectionStatus.CONNECTED ? 'Stream Synced' : 'Initialize Synapse'}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-black uppercase tracking-tighter opacity-70 italic">Biometric mirroring enabled for {selectedLanguage}.</p>
                </div>
              </div>
              <div className="mt-14 relative z-10">
                {status === ConnectionStatus.CONNECTED ? (
                  <button onClick={stopLiveSession} className="w-full py-8 rounded-[2rem] bg-red-500/5 border border-red-500/20 text-red-500 font-black uppercase tracking-[0.6em] text-[10px] hover:bg-red-500/10 transition-all active:scale-95 shadow-xl">Sever Link</button>
                ) : (
                  <button onClick={() => startLiveSession(false)} disabled={status === ConnectionStatus.CONNECTING} className="w-full py-8 rounded-[2rem] bg-indigo-600 text-white font-black uppercase tracking-[0.6em] text-[10px] hover:bg-indigo-500 shadow-3xl transition-all active:scale-95 border border-indigo-400/20">{status === ConnectionStatus.CONNECTING ? 'Syncing...' : 'Establish Neural Link'}</button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <footer className="w-full max-w-7xl mt-auto pt-24 pb-12 text-center text-slate-800 text-[10px] uppercase tracking-[0.8em] font-black opacity-30 italic">Synaptic Audio Architecture • v5.0.0</footer>
    </div>
  );
};

export default App;
