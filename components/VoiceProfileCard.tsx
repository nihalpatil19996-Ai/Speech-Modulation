
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { VoiceProfile } from '../types';
import { blobToBase64, decode, decodeAudioData } from '../services/audioUtils';

interface VoiceProfileCardProps {
  profile: VoiceProfile | null;
  onProfileChange: (profile: VoiceProfile) => void;
}

const STORAGE_KEY = 'voiceMirror_savedProfiles';
const CALIBRATION_TEXT = "The North Wind and the Sun were disputing which was the stronger, when a traveler came along wrapped in a warm cloak. They agreed that the one who first succeeded in making the traveler take his cloak off should be considered stronger than the other. Then the North Wind blew as hard as he could, but the more he blew the more closely did the traveler fold his cloak around him; and at last the North Wind gave up the attempt. Then the Sun shined out warmly, and immediately the traveler took off his cloak.";
const TEST_SENTENCE = "Biometric sync complete. Neural stability is now locked at 99.8% parity.";

const VoiceProfileCard: React.FC<VoiceProfileCardProps> = ({ profile, onProfileChange }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showLoadList, setShowLoadList] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<VoiceProfile[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedProfiles(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse saved profiles", e);
      }
    }
  }, []);

  const saveToLocalStorage = (profiles: VoiceProfile[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    setSavedProfiles(profiles);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await blobToBase64(file);
      onProfileChange({
        id: crypto.randomUUID(),
        name: file.name.split('.')[0],
        audioUrl: URL.createObjectURL(file),
        base64Data: base64,
        mimeType: file.type,
        isCustom: true
      });
    }
  };

  const analyzeVoice = async () => {
    if (!profile?.base64Data) return;
    setIsAnalyzing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: profile.base64Data,
                mimeType: profile.mimeType || 'audio/mpeg'
              }
            },
            {
              text: `Perform an exhaustive biometric audio analysis for high-fidelity neural cloning.
              Extract with 99% accuracy:
              1. HARMONIC PROFILE: Fundamental frequency range (Hz), Spectral Centroid, and Harmonic-to-Noise Ratio (HNR).
              2. FORMANT DYNAMICS: Exact positioning of F1, F2, and F3 to capture vocal cavity resonance.
              3. MICRO-PROSODY: Jitter (pitch variability) and Shimmer (amplitude variability) markers.
              4. ARTICULATION: Plosive intensity and sibilance frequency peaks.
              
              Target: Create a 'LOCKED NEURAL SIGNATURE' that prevents phonetic drift. The analysis should be clinical and exhaustive.`
            }
          ]
        }
      });

      const analysisText = response.text || "Analysis complete.";
      onProfileChange({ ...profile, analysis: analysisText });
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCalibrationTest = async () => {
    if (!profile?.analysis) return;
    setIsTesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `STRICT CLONE DNA: ${profile.analysis}\n\nSpeak: "${TEST_SENTENCE}"` }] }],
        config: {
          seed: 42, // Consistent seed for testing
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const audioBytes = decode(audioData);
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (err) {
      console.error("Test failed", err);
    } finally {
      setIsTesting(false);
    }
  };

  const saveCurrentProfile = () => {
    if (!profile) return;
    const newProfile = { ...profile, savedAt: Date.now() };
    const exists = savedProfiles.findIndex(p => p.id === profile.id);
    let updated;
    if (exists > -1) {
      updated = [...savedProfiles];
      updated[exists] = newProfile;
    } else {
      updated = [newProfile, ...savedProfiles];
    }
    saveToLocalStorage(updated);
    alert("Vocal signature archived.");
  };

  const deleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProfiles.filter(p => p.id !== id);
    saveToLocalStorage(updated);
  };

  return (
    <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative border-indigo-500/10 shadow-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest italic">Cloning Matrix</h3>
        <div className="flex gap-4">
          <button onClick={() => setShowCalibration(!showCalibration)} className="text-[9px] font-black text-indigo-400/60 hover:text-indigo-400 transition-colors uppercase tracking-[0.2em]">
            Protocol
          </button>
          <button onClick={() => setShowLoadList(!showLoadList)} className="text-[9px] font-black text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-[0.2em]">
            Registry ({savedProfiles.length})
          </button>
        </div>
      </div>

      {showCalibration && (
        <div className="bg-indigo-600/5 border border-indigo-500/20 p-5 rounded-xl mb-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Calibration Script (Record this for best results)</p>
          <p className="text-xs text-slate-400 leading-relaxed italic">"{CALIBRATION_TEXT}"</p>
          <button onClick={() => setShowCalibration(false)} className="mt-4 w-full py-2 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20">Got it</button>
        </div>
      )}

      {showLoadList ? (
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {savedProfiles.length === 0 ? <p className="text-center py-12 text-xs text-slate-600 italic">No profiles stored.</p> :
            savedProfiles.map(p => (
              <div key={p.id} onClick={() => { onProfileChange(p); setShowLoadList(false); }} className="group flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500/50 transition-all">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-slate-200 truncate">{p.name}</span>
                  <span className="text-[9px] font-bold text-slate-600 uppercase">{new Date(p.savedAt!).toLocaleDateString()}</span>
                </div>
                <button onClick={(e) => deleteProfile(p.id, e)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))
          }
        </div>
      ) : profile ? (
        <div className="bg-slate-950/40 p-5 rounded-2xl border border-indigo-500/20 shadow-inner">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg border-2 border-indigo-400/20">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white uppercase truncate">{profile.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Biometric Link Ready</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            {!profile.analysis ? (
              <button onClick={analyzeVoice} disabled={isAnalyzing} className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-indigo-600/20">
                {isAnalyzing ? "Decoding Signal..." : "Extract Neural DNA"}
              </button>
            ) : (
              <>
                <button onClick={runCalibrationTest} disabled={isTesting} className="col-span-1 py-3 bg-slate-800 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                  {isTesting ? "Testing..." : "Test Clone"}
                </button>
                <button onClick={saveCurrentProfile} className="col-span-1 py-3 bg-indigo-600 text-white hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                  Archive
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <label className="border-2 border-dashed border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group">
          <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800 group-hover:scale-110 transition-transform">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
          <span className="text-xs text-slate-500 font-black uppercase tracking-[0.2em]">Inject Vocal Source</span>
        </label>
      )}
    </div>
  );
};

export default VoiceProfileCard;
