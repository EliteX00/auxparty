import { Peer, DataConnection, PeerOptions } from 'peerjs';
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

export type StateGetter = () => {
  track: Track | null;
  isPlaying: boolean;
  position: number;
  queue: Track[];
};

export const DEFAULT_PEER_OPTIONS: PeerOptions = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: [
          'turn:relay.metered.ca:80',
          'turn:relay.metered.ca:80?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
  },
};

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
  private connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.leave();
      });
    }
  }

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
    initialState:
      | { track: Track | null; isPlaying: boolean; position: number; queue: Track[] }
      | StateGetter
  ): Promise<boolean> {
    this.leave();

    this.roomCode = roomCode.toUpperCase().trim();
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
      let resolved = false;

      const finish = (success: boolean, errorMsg?: string) => {
        if (resolved) return;
        resolved = true;
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }
        if (!success) {
          if (errorMsg) this.onError?.(errorMsg);
          this.leave();
        }
        resolve(success);
      };

      this.connectionTimeoutId = setTimeout(() => {
        finish(
          false,
          `Timed out starting room #${this.roomCode}. Signaling server may be busy, please try again.`
        );
      }, 10000);

      try {
        const peer = new Peer(peerId, DEFAULT_PEER_OPTIONS);
        this.peer = peer;

        peer.on('open', () => {
          this.onPeersUpdated?.(this.activePeers);
          finish(true);
        });

        peer.on('error', (err: any) => {
          console.error('Peer host error:', err);
          if (err.type === 'unavailable-id') {
            finish(
              false,
              `Room #${this.roomCode} is already active or was recently hosted. Please wait a moment or try another code.`
            );
          } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
            finish(
              false,
              'Unable to reach peer signaling server. If you are using Brave or an adblocker, allow WebSockets for this site.'
            );
          } else {
            finish(false, err.message || 'Connection error occurred while starting the room.');
          }
        });

        peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn, initialState);
        });
      } catch (e: any) {
        finish(false, e.message || 'Failed to initialize room');
      }
    });
  }

  // Handle a guest connecting to the host
  private handleIncomingConnection(
    conn: DataConnection,
    initialState:
      | { track: Track | null; isPlaying: boolean; position: number; queue: Track[] }
      | StateGetter
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

          const currentState = typeof initialState === 'function' ? initialState() : initialState;
          conn.send({
            type: 'INIT_SYNC',
            track: currentState.track,
            isPlaying: currentState.isPlaying,
            position: currentState.position,
            timestamp: Date.now(),
            queue: currentState.queue,
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
    this.leave();

    this.roomCode = roomCode.toUpperCase().trim();
    this.userName = guestName || 'Friend';
    this.isHost = false;
    this.isDJ = false;
    this.currentSkipVotes.clear();

    const hostPeerId = `auxparty-${this.roomCode.toLowerCase()}`;

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (success: boolean, errorMsg?: string) => {
        if (resolved) return;
        resolved = true;
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }
        if (!success) {
          if (errorMsg) this.onError?.(errorMsg);
          this.leave();
        }
        resolve(success);
      };

      // 10-second timeout: never leave the user hanging
      this.connectionTimeoutId = setTimeout(() => {
        finish(
          false,
          `Connection timed out. Room #${this.roomCode} may be offline or no host is currently active.`
        );
      }, 10000);

      try {
        const peer = new Peer(DEFAULT_PEER_OPTIONS);
        this.peer = peer;

        peer.on('open', () => {
          if (resolved || this.peer !== peer) return;

          try {
            const conn = peer.connect(hostPeerId, { reliable: true });
            this.hostConnection = conn;

            // Monitor WebRTC connection states
            if (conn.peerConnection) {
              const pc = conn.peerConnection;
              pc.oniceconnectionstatechange = () => {
                if (pc.iceConnectionState === 'failed') {
                  finish(
                    false,
                    `Direct P2P connection failed to reach Room #${this.roomCode}. Network or firewall may be restricting WebRTC.`
                  );
                }
              };
              pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed') {
                  finish(false, `WebRTC connection failed. Host may have gone offline.`);
                }
              };
            }

            conn.on('open', () => {
              if (resolved) return;
              try {
                conn.send({
                  type: 'JOIN',
                  sender: this.userName,
                } as SyncPayload);
              } catch (e) {
                console.error('Error sending JOIN payload:', e);
              }
              finish(true);
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
              this.leave();
            });

            conn.on('error', (err: any) => {
              console.error('Guest connection error:', err);
              finish(false, `Could not find room #${this.roomCode}. Check that the room code is active.`);
            });
          } catch (e: any) {
            console.error('Error connecting to host peer:', e);
            finish(false, e.message || 'Failed to initiate connection with host.');
          }
        });

        peer.on('error', (err: any) => {
          console.error('Peer guest error:', err);
          if (err.type === 'peer-unavailable') {
            finish(
              false,
              `Room #${this.roomCode} was not found or the host is offline. You can start this room as Host / DJ.`
            );
          } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
            finish(
              false,
              'Signaling connection error. If you are using Brave or an adblocker, allow WebSockets/WebRTC, or check your internet connection.'
            );
          } else {
            finish(false, err.message || 'Unable to connect to room. Host may be offline.');
          }
        });
      } catch (err: any) {
        finish(false, err.message || 'Failed to join room');
      }
    });
  }

  // Cancel any in-progress connection attempt
  public abortJoin() {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
    this.leave();
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
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
    this.connections.forEach((c) => {
      try {
        c.close();
      } catch {}
    });
    this.connections.clear();
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {}
      this.hostConnection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
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
