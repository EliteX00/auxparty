export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: string;
  duration: number; // in seconds
  image: string;
  streamUrl: string;
  has320?: boolean;
  addedBy?: string;
  votes?: number;
  votedBy?: string[];
}

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  duration: number;
}

export interface SpotifyPlaylistResponse {
  success: boolean;
  name: string;
  cover: string;
  trackCount: number;
  tracks: SpotifyTrack[];
}

export interface RoomPeer {
  id: string;
  name: string;
  isHost: boolean;
  isDJ?: boolean;
  color?: string;
}

export type AuxMode = 'host-only' | 'open-aux';

export interface RoomState {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  isDJ: boolean;
  hostName: string;
  activeDjName: string;
  userName: string;
  connected: boolean;
  peers: RoomPeer[];
  auxMode: AuxMode;
  skipVotes: string[]; // array of peer names/ids who voted to skip
}

export interface RoomMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  sender: string;
  x: number;
}

export type SoundEffectType = 'airhorn' | 'scratch' | 'bassdrop' | 'cheer';

export type PlayMode = 'none' | 'repeat-one' | 'repeat-all';
