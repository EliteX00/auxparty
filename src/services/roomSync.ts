import { Peer, DataConnection } from 'peerjs';
import { Track, RoomPeer, RoomMessage, AuxMode, SoundEffectType } from '../types';

export type SyncEventType =
  | 'INIT_SYNC'
  | 'SYNC_STATE'
  | 'PLAY_PAUSE'
  | 'SEEK'
  | 'TRACK_CHANGE'
  | 'QUEUE_UPDATE'
  | 'REQUEST_ADD_TO_QUEUE'
  | 'REQUEST_ADD_MANY_TO_QUEUE'
  | 'JOIN'
  | 'LEAVE'
  | 'CHAT'
  | 'REACTION'
  | 'PEER_LIST'
  | 'TRIGGER_SOUND'
  | 'VOTE_SKIP'
  | 'VOTE_TRACK'
  | 'SET_AUX_MODE'
  | 'TRANSFER_AUX';

export interface SyncPayload {
  type: SyncEventType;
  track?: Track | null;
  tracks?: Track[];
  isPlaying?: boolean;
  position?: number;
  timestamp?: number;
  queue?: Track[];
  hostName?: string;
  activeDjName?: string;
  sender?: string;
  peers?: RoomPeer[];
  message?: RoomMessage;
  emoji?: string;
  sound?: SoundEffectType;
  auxMode?: AuxMode;
  targetPeerId?: string;
  skipVotes?: string[];
  trackId?: string;
}

export class RoomSyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  public isHost: boolean = false;
  public isDJ: boolean = false;
  public roomCode: string = '';
  public userName: string = '';
  public auxMode: AuxMode = 'host-only';
  public activeDjName: string = '';

  public onSyncReceived?: (payload: SyncPayload) => void;
  public onPeersUpdated?: (peers: RoomPeer[]) => void;
  public onChatReceived?: (msg: RoomMessage) => void;
  public onReactionReceived?: (emoji: string, sender: string) => void;
  public onSoundTriggered?: (sound: SoundEffectType, sender: string) => void;
  public onQueueAddRequested?: (track: Track, sender: string) => void;
  public onQueueAddManyRequested?: (tracks: Track[], sender: string) => void;
  public onVoteSkipReceived?: (skipVotes: string[]) => void;
  public onVoteTrackReceived?: (trackId: string, sender: string) => void;
  public onAuxModeChanged?: (mode: AuxMode) => void;
  public onDjChanged?: (djName: string, isMe: boolean) => void;
  public onError?: (err: string) => void;

  private activePeers: RoomPeer[] = [];
  public currentSkipVotes: Set<string> = new Set();

  public static generateRoomCode(len: number = 4): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create room as Host
  public async createRoom(
    roomCode: string,
    hostName: string,
    initialState: { track: Track | null; isPlaying: boolean; position: number; queue: Track[] }
  ): Promise<boolean> {
    this.roomCode = roomCode.toUpperCase();
    this.userName = hostName || 'DJ (Host)';
    this.isHost = true;
    this.isDJ = true;
    this.activeDjName = this.userName;
    this.auxMode = 'host-only';
    this.currentSkipVotes.clear();

    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];
    this.activePeers = [
      {
        id: 'host',
        name: this.userName,
        isHost: true,
        isDJ: true,
        color: colors[0],
      },
    ];

    const peerId = `auxparty-${this.roomCode.toLowerCase()}`;

    return new Promise((resolve) => {
      try {
        this.peer = new Peer(peerId);

        this.peer.on('open', () => {
          this.onPeersUpdated?.(this.activePeers);
          resolve(true);
        });

        this.peer.on('error', (err: any) => {
          console.error('Peer host error:', err);
          if (err.type === 'unavailable-id') {
            this.onError?.('Room code already in use. Try a different code.');
          } else {
            this.onError?.(err.message || 'Connection error occurred');
          }
          resolve(false);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn, initialState);
        });
      } catch (e: any) {
        this.onError?.(e.message || 'Failed to initialize room');
        resolve(false);
      }
    });
  }

  // Handle a guest connecting to the host
  private handleIncomingConnection(
    conn: DataConnection,
    getCurrentState: { track: Track | null; isPlaying: boolean; position: number; queue: Track[] }
  ) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);

      conn.on('data', (raw: any) => {
        const data = raw as SyncPayload;
        if (data.type === 'JOIN') {
          const peerName = data.sender || 'Friend';
          const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];
          const newPeer: RoomPeer = {
            id: conn.peer,
            name: peerName,
            isHost: false,
            isDJ: this.auxMode === 'open-aux',
            color: colors[this.activePeers.length % colors.length],
          };
          this.activePeers = [...this.activePeers.filter((p) => p.id !== conn.peer), newPeer];

          this.broadcast({
            type: 'PEER_LIST',
            peers: this.activePeers,
            activeDjName: this.activeDjName,
            auxMode: this.auxMode,
          });
          this.onPeersUpdated?.(this.activePeers);

          conn.send({
            type: 'INIT_SYNC',
            track: getCurrentState.track,
            isPlaying: getCurrentState.isPlaying,
            position: getCurrentState.position,
            timestamp: Date.now(),
            queue: getCurrentState.queue,
            hostName: this.userName,
            activeDjName: this.activeDjName,
            peers: this.activePeers,
            auxMode: this.auxMode,
            skipVotes: Array.from(this.currentSkipVotes),
          } as SyncPayload);

          const joinMsg: RoomMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            sender: 'AuxParty',
            text: `${peerName} joined the room! 🎧`,
            timestamp: Date.now(),
            isSystem: true,
          };
          this.broadcast({ type: 'CHAT', message: joinMsg });
          this.onChatReceived?.(joinMsg);
        } else if (data.type === 'CHAT' && data.message) {
          this.broadcast(data);
          this.onChatReceived?.(data.message);
        } else if (data.type === 'REACTION' && data.emoji) {
          this.broadcast(data);
          this.onReactionReceived?.(data.emoji, data.sender || 'Friend');
        } else if (data.type === 'TRIGGER_SOUND' && data.sound) {
          this.broadcast(data);
          this.onSoundTriggered?.(data.sound, data.sender || 'Friend');
        } else if (data.type === 'REQUEST_ADD_TO_QUEUE' && data.track) {
          this.onQueueAddRequested?.(data.track, data.sender || 'Friend');
        } else if (data.type === 'REQUEST_ADD_MANY_TO_QUEUE' && data.tracks) {
          this.onQueueAddManyRequested?.(data.tracks, data.sender || 'Friend');
        } else if (data.type === 'VOTE_SKIP') {
          const voter = data.sender || conn.peer;
          this.currentSkipVotes.add(voter);
          const votesArray = Array.from(this.currentSkipVotes);
          this.broadcast({ type: 'VOTE_SKIP', skipVotes: votesArray });
          this.onVoteSkipReceived?.(votesArray);
        } else if (data.type === 'VOTE_TRACK' && data.trackId) {
          this.broadcast(data);
          this.onVoteTrackReceived?.(data.trackId, data.sender || 'Friend');
        } else if (data.type === 'SYNC_STATE' && (this.auxMode === 'open-aux' || conn.peer === this.activeDjName)) {
          // Open aux allowed peer playback control
          this.onSyncReceived?.(data);
          this.broadcast(data);
        }
      });
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      const departingPeer = this.activePeers.find((p) => p.id === conn.peer);
      this.activePeers = this.activePeers.filter((p) => p.id !== conn.peer);
      this.broadcast({ type: 'PEER_LIST', peers: this.activePeers });
      this.onPeersUpdated?.(this.activePeers);

      if (departingPeer) {
        this.currentSkipVotes.delete(departingPeer.name);
        const leaveMsg: RoomMessage = {
          id: `msg-${Date.now()}`,
          sender: 'AuxParty',
          text: `${departingPeer.name} left the room.`,
          timestamp: Date.now(),
          isSystem: true,
        };
        this.broadcast({ type: 'CHAT', message: leaveMsg });
        this.onChatReceived?.(leaveMsg);
      }
    });
  }

  // Join room as Guest
  public async joinRoom(roomCode: string, guestName: string): Promise<boolean> {
    this.roomCode = roomCode.toUpperCase();
    this.userName = guestName || 'Friend';
    this.isHost = false;
    this.isDJ = false;
    this.currentSkipVotes.clear();

    const hostPeerId = `auxparty-${this.roomCode.toLowerCase()}`;

    return new Promise((resolve) => {
      try {
        this.peer = new Peer();

        this.peer.on('open', () => {
          if (!this.peer) return;
          const conn = this.peer.connect(hostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            conn.send({
              type: 'JOIN',
              sender: this.userName,
            } as SyncPayload);
            resolve(true);
          });

          conn.on('data', (raw: any) => {
            const data = raw as SyncPayload;
            if (data.type === 'PEER_LIST' && data.peers) {
              this.activePeers = data.peers;
              if (data.auxMode) this.auxMode = data.auxMode;
              if (data.activeDjName) {
                this.activeDjName = data.activeDjName;
                this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
              }
              this.onPeersUpdated?.(data.peers);
            } else if (data.type === 'CHAT' && data.message) {
              this.onChatReceived?.(data.message);
            } else if (data.type === 'REACTION' && data.emoji) {
              this.onReactionReceived?.(data.emoji, data.sender || 'Friend');
            } else if (data.type === 'TRIGGER_SOUND' && data.sound) {
              this.onSoundTriggered?.(data.sound, data.sender || 'Friend');
            } else if (data.type === 'VOTE_SKIP' && data.skipVotes) {
              this.onVoteSkipReceived?.(data.skipVotes);
            } else if (data.type === 'SET_AUX_MODE' && data.auxMode) {
              this.auxMode = data.auxMode;
              this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
              this.onAuxModeChanged?.(data.auxMode);
            } else if (data.type === 'TRANSFER_AUX' && data.activeDjName) {
              this.activeDjName = data.activeDjName;
              this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
              this.onDjChanged?.(data.activeDjName, this.isDJ);
            } else {
              this.onSyncReceived?.(data);
            }
          });

          conn.on('close', () => {
            this.onError?.('Disconnected from room host.');
          });

          conn.on('error', (err) => {
            console.error('Guest connection error:', err);
            this.onError?.('Could not find room. Check that the room code is active.');
            resolve(false);
          });
        });

        this.peer.on('error', (err) => {
          console.error('Peer guest error:', err);
          this.onError?.('Unable to connect to room. Host may be offline.');
          resolve(false);
        });
      } catch (err: any) {
        this.onError?.(err.message || 'Failed to join room');
        resolve(false);
      }
    });
  }

  // Broadcast to all peers (or host if guest)
  public broadcast(payload: SyncPayload) {
    if (this.isHost) {
      this.connections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(payload);
          } catch (e) {
            console.error('Broadcast send error:', e);
          }
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(payload);
      } catch (e) {
        console.error('Send to host error:', e);
      }
    }
  }

  // Broadcast playback state
  public broadcastPlayback(track: Track | null, isPlaying: boolean, position: number, queue: Track[]) {
    if (!this.isHost && this.auxMode !== 'open-aux' && this.activeDjName !== this.userName) return;
    this.broadcast({
      type: 'SYNC_STATE',
      track,
      isPlaying,
      position,
      timestamp: Date.now(),
      queue,
    });
  }

  // Sound effect
  public triggerSound(sound: SoundEffectType) {
    if (this.isHost) {
      this.broadcast({ type: 'TRIGGER_SOUND', sound, sender: this.userName });
      this.onSoundTriggered?.(sound, this.userName);
    } else {
      this.broadcast({ type: 'TRIGGER_SOUND', sound, sender: this.userName });
    }
  }

  // Vote to skip
  public voteSkip() {
    if (this.isHost) {
      this.currentSkipVotes.add(this.userName);
      const votesArray = Array.from(this.currentSkipVotes);
      this.broadcast({ type: 'VOTE_SKIP', skipVotes: votesArray });
      this.onVoteSkipReceived?.(votesArray);
    } else {
      this.broadcast({ type: 'VOTE_SKIP', sender: this.userName });
    }
  }

  // Reset skip votes (e.g. when track changes)
  public resetSkipVotes() {
    this.currentSkipVotes.clear();
    this.broadcast({ type: 'VOTE_SKIP', skipVotes: [] });
    this.onVoteSkipReceived?.([]);
  }

  // Toggle Aux Mode (Host only)
  public setAuxMode(mode: AuxMode) {
    if (!this.isHost) return;
    this.auxMode = mode;
    this.broadcast({ type: 'SET_AUX_MODE', auxMode: mode });
    this.onAuxModeChanged?.(mode);
  }

  // Pass the Aux / Delegate DJ (Host only)
  public transferAux(targetPeerName: string) {
    if (!this.isHost) return;
    this.activeDjName = targetPeerName;
    this.broadcast({ type: 'TRANSFER_AUX', activeDjName: targetPeerName });
    this.onDjChanged?.(targetPeerName, targetPeerName === this.userName);
  }

  // Request to add a track to the shared room queue
  public requestAddToQueue(track: Track) {
    const enrichedTrack = { ...track, addedBy: this.userName, votes: 0 };
    if (this.isHost) return;
    this.broadcast({
      type: 'REQUEST_ADD_TO_QUEUE',
      track: enrichedTrack,
      sender: this.userName,
    });
  }

  public requestAddManyToQueue(tracks: Track[]) {
    const enriched = tracks.map((t) => ({ ...t, addedBy: this.userName, votes: 0 }));
    if (this.isHost) return;
    this.broadcast({
      type: 'REQUEST_ADD_MANY_TO_QUEUE',
      tracks: enriched,
      sender: this.userName,
    });
  }

  public sendChatMessage(text: string) {
    const msg: RoomMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: this.userName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    if (this.isHost) {
      this.broadcast({ type: 'CHAT', message: msg });
      this.onChatReceived?.(msg);
    } else {
      this.broadcast({ type: 'CHAT', message: msg });
    }
  }

  public sendReaction(emoji: string) {
    if (this.isHost) {
      this.broadcast({ type: 'REACTION', emoji, sender: this.userName });
      this.onReactionReceived?.(emoji, this.userName);
    } else {
      this.broadcast({ type: 'REACTION', emoji, sender: this.userName });
    }
  }

  public leave() {
    this.connections.forEach((c) => c.close());
    this.connections.clear();
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.activePeers = [];
    this.isHost = false;
    this.isDJ = false;
    this.roomCode = '';
    this.currentSkipVotes.clear();
  }
}

export const roomSync = new RoomSyncService();
