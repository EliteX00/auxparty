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
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  isHost: boolean;
  hostName: string;
  userName: string;
  connected: boolean;
  peers: RoomPeer[];
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

export type PlayMode = 'none' | 'repeat-one' | 'repeat-all';
