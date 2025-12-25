
export enum AppMode {
  VOICEOVER = 'VOICEOVER',
  LIVE_CHAT = 'LIVE_CHAT'
}

export enum Language {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  MARATHI = 'Marathi'
}

export enum VoiceStyle {
  NEUTRAL = 'Neutral',
  ADVERTISING = 'Advertising',
  HORROR = 'Horror',
  EMOTIONAL = 'Emotional',
  HAPPY = 'Happy',
  NARRATIVE = 'Narrative',
  WHISPER = 'Whisper',
  COMBINATION = 'Combination'
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  description: string;
  baseVoice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  accent?: string;
}

export interface VoiceProfile {
  id: string;
  name: string;
  audioUrl?: string;
  base64Data?: string;
  mimeType?: string;
  analysis?: string;
  isCustom?: boolean;
  savedAt?: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
