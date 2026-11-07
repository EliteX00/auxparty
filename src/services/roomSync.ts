import { Track, RoomPeer, RoomMessage, AuxMode, SoundEffectType } from '../types';

export type SyncEventType =
  | 'INIT_SYNC'
  | 'SYNC_STATE'
  | 'REQUEST_STATE'
  | 'PLAY_PAUSE'
  | 'SEEK'
  | 'TRACK_CHANGE'
  | 'QUEUE_UPDATE'
  | 'REQUEST_ADD_TO_QUEUE'
  | 'REQUEST_ADD_MANY_TO_QUEUE'
  | 'JOIN'
  | 'LEAVE'
  | 'HEARTBEAT'
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
  senderId?: string;
  sender?: string;
  peer?: RoomPeer;
  peers?: RoomPeer[];
  peerId?: string;
  track?: Track | null;
  tracks?: Track[];
  isPlaying?: boolean;
  position?: number;
  timestamp?: number;
  queue?: Track[];
  hostName?: string;
  activeDjName?: string;
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

const TOPIC_PREFIX = 'auxparty_v2_';
const PUB_SERVER = 'https://ntfy.sh';
const WS_SERVER = 'wss://ntfy.sh';

export class RoomSyncService {
  private ws: WebSocket | null = null;
  private es: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private stateGetter: StateGetter | null = null;

  public myPeerId: string = '';
  public isHost: boolean = false;
  public isDJ: boolean = false;
  public roomCode: string = '';
  public userName: string = '';
  public userColor: string = '#8b5cf6';
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

  private peerMap: Map<string, { peer: RoomPeer; lastSeen: number }> = new Map();
  public activePeers: RoomPeer[] = [];
  public currentSkipVotes: Set<string> = new Set();
  private isConnecting: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.sendLeaveBeacon();
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

  private initIdentity(name: string, isHostRole: boolean) {
    this.myPeerId = `peer_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4'];
    this.userColor = colors[Math.floor(Math.random() * colors.length)];
    this.userName = name || (isHostRole ? 'DJ (Host)' : 'Friend');
    this.isHost = isHostRole;
    this.isDJ = isHostRole;
    this.activeDjName = isHostRole ? this.userName : '';
    this.auxMode = 'host-only';
    this.currentSkipVotes.clear();
    this.peerMap.clear();

    const myPeer: RoomPeer = {
      id: this.myPeerId,
      name: this.userName,
      isHost: this.isHost,
      isDJ: this.isDJ,
      color: this.userColor,
    };
    this.peerMap.set(this.myPeerId, { peer: myPeer, lastSeen: Date.now() });
    this.updateActivePeers();
  }

  private updateActivePeers() {
    this.activePeers = Array.from(this.peerMap.values()).map((p) => p.peer);
    this.onPeersUpdated?.(this.activePeers);
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
    this.initIdentity(hostName, true);

    if (typeof initialState === 'function') {
      this.stateGetter = initialState;
    } else {
      this.stateGetter = () => initialState;
    }

    const connected = await this.connectChannel();
    if (connected) {
      // Send initial presence and state
      this.broadcastSelfPresence('JOIN');
      const st = this.stateGetter();
      this.publish({
        type: 'INIT_SYNC',
        senderId: this.myPeerId,
        sender: this.userName,
        track: st.track,
        isPlaying: st.isPlaying,
        position: st.position,
        timestamp: Date.now(),
        queue: st.queue,
        hostName: this.userName,
        activeDjName: this.userName,
        auxMode: this.auxMode,
        peers: this.activePeers,
      });
      return true;
    }
    return false;
  }

  // Join room as Guest
  public async joinRoom(roomCode: string, guestName: string): Promise<boolean> {
    this.leave();
    this.roomCode = roomCode.toUpperCase().trim();
    this.initIdentity(guestName, false);

    const connected = await this.connectChannel();
    if (connected) {
      // Announce join to room
      this.broadcastSelfPresence('JOIN');
      // Request latest playback state from DJ/Host
      this.publish({
        type: 'REQUEST_STATE',
        senderId: this.myPeerId,
        sender: this.userName,
      });

      // Also fetch cached recent state from ntfy topic history
      this.fetchRecentRoomHistory();

      // If nobody answers within 2.5 seconds, assume DJ role
      setTimeout(() => {
        if (!this.activeDjName && this.activePeers.length <= 1) {
          this.isDJ = true;
          this.activeDjName = this.userName;
          const myP = this.peerMap.get(this.myPeerId);
          if (myP) myP.peer.isDJ = true;
          this.updateActivePeers();
          this.onDjChanged?.(this.userName, true);
        }
      }, 2500);

      return true;
    }
    return false;
  }

  // Connect to the room pubsub channel using WebSocket (with SSE fallback)
  private async connectChannel(): Promise<boolean> {
    this.isConnecting = true;
    const topic = `${TOPIC_PREFIX}${this.roomCode.toLowerCase()}`;
    const wsUrl = `${WS_SERVER}/${topic}/ws`;

    return new Promise((resolve) => {
      let resolved = false;

      const finishConnect = (success: boolean) => {
        if (resolved) return;
        resolved = true;
        this.isConnecting = false;
        if (success) {
          this.startHeartbeat();
          this.startPruning();
        }
        resolve(success);
      };

      // Fallback timer: 4 seconds max
      const fallbackTimer = setTimeout(() => {
        if (!resolved) {
          console.warn('WebSocket connect slow, starting SSE fallback...');
          this.connectSSE(topic);
          finishConnect(true);
        }
      }, 4000);

      try {
        const ws = new WebSocket(wsUrl);
        this.ws = ws;

        ws.onopen = () => {
          clearTimeout(fallbackTimer);
          finishConnect(true);
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);
            if (raw.event === 'message' && raw.message) {
              const payload = JSON.parse(raw.message) as SyncPayload;
              this.handleIncomingPayload(payload);
            }
          } catch (e) {
            console.error('Error parsing room message:', e);
          }
        };

        ws.onerror = (e) => {
          console.warn('WebSocket error, falling back to SSE:', e);
          if (!resolved) {
            clearTimeout(fallbackTimer);
            this.connectSSE(topic);
            finishConnect(true);
          }
        };

        ws.onclose = () => {
          // Auto reconnect if not deliberately left
          if (this.roomCode && !this.isConnecting) {
            this.scheduleReconnect();
          }
        };
      } catch (err: any) {
        clearTimeout(fallbackTimer);
        this.connectSSE(topic);
        finishConnect(true);
      }
    });
  }

  // SSE Fallback for restricted networks
  private connectSSE(topic: string) {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    try {
      const sseUrl = `${PUB_SERVER}/${topic}/sse`;
      const es = new EventSource(sseUrl);
      this.es = es;

      es.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const payload = JSON.parse(raw.message) as SyncPayload;
            this.handleIncomingPayload(payload);
          }
        } catch (e) {}
      };

      es.onerror = () => {
        // SSE auto-reconnects by default
      };
    } catch (e) {
      console.error('SSE initialization error:', e);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.roomCode) {
        this.connectChannel();
      }
    }, 2000);
  }

  // Fetch recent messages to quickly catch up on room state
  private async fetchRecentRoomHistory() {
    try {
      const topic = `${TOPIC_PREFIX}${this.roomCode.toLowerCase()}`;
      const res = await fetch(`${PUB_SERVER}/${topic}/json?poll=1&since=5m`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const text = await res.text();
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const raw = JSON.parse(line);
          if (raw.event === 'message' && raw.message) {
            const payload = JSON.parse(raw.message) as SyncPayload;
            if (payload.type === 'SYNC_STATE' || payload.type === 'INIT_SYNC') {
              this.handleIncomingPayload(payload);
            }
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Error fetching room history:', e);
    }
  }

  // Publish message to all subscribers in the room
  private async publish(payload: SyncPayload) {
    if (!this.roomCode) return;
    try {
      const topic = `${TOPIC_PREFIX}${this.roomCode.toLowerCase()}`;
      await fetch(`${PUB_SERVER}/${topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Error publishing to room:', e);
    }
  }

  // Periodic heartbeat to maintain live peer list
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.broadcastSelfPresence('HEARTBEAT');
    }, 4000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private broadcastSelfPresence(type: 'JOIN' | 'HEARTBEAT') {
    const myPeer: RoomPeer = {
      id: this.myPeerId,
      name: this.userName,
      isHost: this.isHost,
      isDJ: this.isDJ,
      color: this.userColor,
    };
    this.publish({
      type,
      senderId: this.myPeerId,
      sender: this.userName,
      peer: myPeer,
      activeDjName: this.activeDjName,
      auxMode: this.auxMode,
    });
  }

  // Remove peers who have been silent for more than 10 seconds
  private startPruning() {
    this.stopPruning();
    this.pruneTimer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, data] of this.peerMap.entries()) {
        if (id === this.myPeerId) continue;
        if (now - data.lastSeen > 10000) {
          this.peerMap.delete(id);
          changed = true;
          this.currentSkipVotes.delete(data.peer.name);
        }
      }
      if (changed) {
        this.updateActivePeers();
        // If current DJ went offline, and I am host or the oldest peer, claim DJ
        if (
          this.activeDjName &&
          !this.activePeers.some((p) => p.name === this.activeDjName)
        ) {
          this.isDJ = true;
          this.activeDjName = this.userName;
          const me = this.peerMap.get(this.myPeerId);
          if (me) me.peer.isDJ = true;
          this.updateActivePeers();
          this.onDjChanged?.(this.userName, true);
        }
      }
    }, 3000);
  }

  private stopPruning() {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  // Process incoming payloads from room subscribers
  private handleIncomingPayload(payload: SyncPayload) {
    // Ignore our own broadcast messages
    if (payload.senderId && payload.senderId === this.myPeerId) {
      return;
    }

    switch (payload.type) {
      case 'JOIN':
      case 'HEARTBEAT': {
        if (payload.peer && payload.peer.id) {
          const isNew = !this.peerMap.has(payload.peer.id);
          this.peerMap.set(payload.peer.id, {
            peer: payload.peer,
            lastSeen: Date.now(),
          });
          this.updateActivePeers();

          if (payload.auxMode) this.auxMode = payload.auxMode;
          if (payload.activeDjName) {
            this.activeDjName = payload.activeDjName;
            this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
          }

          if (isNew && payload.type === 'JOIN') {
            const joinMsg: RoomMessage = {
              id: `msg-${Date.now()}-${Math.random()}`,
              sender: 'AuxParty',
              text: `${payload.peer.name} joined the room! 🎧`,
              timestamp: Date.now(),
              isSystem: true,
            };
            this.onChatReceived?.(joinMsg);

            // If I am DJ or Host, reply with current state
            if (this.isDJ || this.isHost) {
              const st = this.stateGetter ? this.stateGetter() : null;
              if (st) {
                this.publish({
                  type: 'SYNC_STATE',
                  senderId: this.myPeerId,
                  sender: this.userName,
                  track: st.track,
                  isPlaying: st.isPlaying,
                  position: st.position,
                  timestamp: Date.now(),
                  queue: st.queue,
                  activeDjName: this.activeDjName,
                  auxMode: this.auxMode,
                });
              }
            }
          }
        }
        break;
      }

      case 'LEAVE': {
        if (payload.peerId) {
          const existing = this.peerMap.get(payload.peerId);
          this.peerMap.delete(payload.peerId);
          this.updateActivePeers();
          if (existing) {
            this.currentSkipVotes.delete(existing.peer.name);
            const leaveMsg: RoomMessage = {
              id: `msg-${Date.now()}`,
              sender: 'AuxParty',
              text: `${existing.peer.name} left the room.`,
              timestamp: Date.now(),
              isSystem: true,
            };
            this.onChatReceived?.(leaveMsg);
          }
        }
        break;
      }

      case 'REQUEST_STATE': {
        if (this.isDJ || this.isHost) {
          const st = this.stateGetter ? this.stateGetter() : null;
          if (st) {
            this.publish({
              type: 'SYNC_STATE',
              senderId: this.myPeerId,
              sender: this.userName,
              track: st.track,
              isPlaying: st.isPlaying,
              position: st.position,
              timestamp: Date.now(),
              queue: st.queue,
              activeDjName: this.activeDjName,
              auxMode: this.auxMode,
            });
          }
        }
        break;
      }

      case 'INIT_SYNC':
      case 'SYNC_STATE': {
        if (payload.activeDjName) {
          this.activeDjName = payload.activeDjName;
          this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
        }
        if (payload.auxMode) {
          this.auxMode = payload.auxMode;
        }
        this.onSyncReceived?.(payload);
        break;
      }

      case 'QUEUE_UPDATE': {
        this.onSyncReceived?.(payload);
        break;
      }

      case 'CHAT': {
        if (payload.message) {
          this.onChatReceived?.(payload.message);
        }
        break;
      }

      case 'REACTION': {
        if (payload.emoji) {
          this.onReactionReceived?.(payload.emoji, payload.sender || 'Friend');
        }
        break;
      }

      case 'TRIGGER_SOUND': {
        if (payload.sound) {
          this.onSoundTriggered?.(payload.sound, payload.sender || 'Friend');
        }
        break;
      }

      case 'VOTE_SKIP': {
        const voter = payload.sender || 'Friend';
        this.currentSkipVotes.add(voter);
        const votes = Array.from(this.currentSkipVotes);
        this.onVoteSkipReceived?.(votes);
        break;
      }

      case 'VOTE_TRACK': {
        if (payload.trackId) {
          this.onVoteTrackReceived?.(payload.trackId, payload.sender || 'Friend');
        }
        break;
      }

      case 'SET_AUX_MODE': {
        if (payload.auxMode) {
          this.auxMode = payload.auxMode;
          this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
          this.onAuxModeChanged?.(payload.auxMode);
        }
        break;
      }

      case 'TRANSFER_AUX': {
        if (payload.activeDjName) {
          this.activeDjName = payload.activeDjName;
          this.isDJ = this.auxMode === 'open-aux' || this.activeDjName === this.userName;
          this.onDjChanged?.(payload.activeDjName, this.isDJ);
        }
        break;
      }

      case 'REQUEST_ADD_TO_QUEUE': {
        if (payload.track) {
          this.onQueueAddRequested?.(payload.track, payload.sender || 'Friend');
        }
        break;
      }

      case 'REQUEST_ADD_MANY_TO_QUEUE': {
        if (payload.tracks) {
          this.onQueueAddManyRequested?.(payload.tracks, payload.sender || 'Friend');
        }
        break;
      }
    }
  }

  // Broadcast playback state to room
  public broadcastPlayback(
    track: Track | null,
    isPlaying: boolean,
    position: number,
    queue: Track[]
  ) {
    if (!this.isHost && this.auxMode !== 'open-aux' && this.activeDjName !== this.userName) {
      return;
    }
    this.publish({
      type: 'SYNC_STATE',
      senderId: this.myPeerId,
      sender: this.userName,
      track,
      isPlaying,
      position,
      timestamp: Date.now(),
      queue,
      activeDjName: this.activeDjName,
      auxMode: this.auxMode,
    });
  }

  public triggerSound(sound: SoundEffectType) {
    this.publish({
      type: 'TRIGGER_SOUND',
      senderId: this.myPeerId,
      sound,
      sender: this.userName,
    });
    this.onSoundTriggered?.(sound, this.userName);
  }

  public voteSkip() {
    this.currentSkipVotes.add(this.userName);
    const votes = Array.from(this.currentSkipVotes);
    this.publish({
      type: 'VOTE_SKIP',
      senderId: this.myPeerId,
      sender: this.userName,
    });
    this.onVoteSkipReceived?.(votes);
  }

  public resetSkipVotes() {
    this.currentSkipVotes.clear();
    this.onVoteSkipReceived?.([]);
  }

  public setAuxMode(mode: AuxMode) {
    this.auxMode = mode;
    this.isDJ = mode === 'open-aux' || this.activeDjName === this.userName;
    this.publish({
      type: 'SET_AUX_MODE',
      senderId: this.myPeerId,
      auxMode: mode,
      sender: this.userName,
    });
    this.onAuxModeChanged?.(mode);
  }

  public transferAux(targetPeerName: string) {
    this.activeDjName = targetPeerName;
    this.isDJ = this.auxMode === 'open-aux' || targetPeerName === this.userName;
    this.publish({
      type: 'TRANSFER_AUX',
      senderId: this.myPeerId,
      activeDjName: targetPeerName,
      sender: this.userName,
    });
    this.onDjChanged?.(targetPeerName, targetPeerName === this.userName);
  }

  public requestAddToQueue(track: Track) {
    const enriched = { ...track, addedBy: this.userName, votes: 0 };
    this.publish({
      type: 'REQUEST_ADD_TO_QUEUE',
      senderId: this.myPeerId,
      track: enriched,
      sender: this.userName,
    });
  }

  public requestAddManyToQueue(tracks: Track[]) {
    const enriched = tracks.map((t) => ({ ...t, addedBy: this.userName, votes: 0 }));
    this.publish({
      type: 'REQUEST_ADD_MANY_TO_QUEUE',
      senderId: this.myPeerId,
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
    this.publish({
      type: 'CHAT',
      senderId: this.myPeerId,
      message: msg,
      sender: this.userName,
    });
    this.onChatReceived?.(msg);
  }

  public sendReaction(emoji: string) {
    this.publish({
      type: 'REACTION',
      senderId: this.myPeerId,
      emoji,
      sender: this.userName,
    });
    this.onReactionReceived?.(emoji, this.userName);
  }

  public broadcast(payload: SyncPayload) {
    payload.senderId = this.myPeerId;
    payload.sender = this.userName;
    this.publish(payload);
  }

  public abortJoin() {
    this.leave();
  }

  private sendLeaveBeacon() {
    if (!this.roomCode || !this.myPeerId) return;
    try {
      const topic = `${TOPIC_PREFIX}${this.roomCode.toLowerCase()}`;
      const payload: SyncPayload = {
        type: 'LEAVE',
        senderId: this.myPeerId,
        peerId: this.myPeerId,
        sender: this.userName,
      };
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`${PUB_SERVER}/${topic}`, JSON.stringify(payload));
      }
    } catch {}
  }

  public leave() {
    this.sendLeaveBeacon();
    this.stopHeartbeat();
    this.stopPruning();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.es) {
      try {
        this.es.close();
      } catch {}
      this.es = null;
    }

    this.peerMap.clear();
    this.activePeers = [];
    this.isHost = false;
    this.isDJ = false;
    this.roomCode = '';
    this.currentSkipVotes.clear();
    this.stateGetter = null;
  }
}

export const roomSync = new RoomSyncService();
