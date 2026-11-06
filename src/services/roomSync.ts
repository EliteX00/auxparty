import { Peer, DataConnection } from 'peerjs';
import { Track, RoomPeer, RoomMessage } from '../types';

export type SyncEventType =
  | 'INIT_SYNC'
  | 'SYNC_STATE'
  | 'PLAY_PAUSE'
  | 'SEEK'
  | 'TRACK_CHANGE'
  | 'QUEUE_UPDATE'
  | 'JOIN'
  | 'LEAVE'
  | 'CHAT'
  | 'REACTION'
  | 'PEER_LIST';

export interface SyncPayload {
  type: SyncEventType;
  track?: Track | null;
  isPlaying?: boolean;
  position?: number;
  timestamp?: number;
  queue?: Track[];
  hostName?: string;
  sender?: string;
  peers?: RoomPeer[];
  message?: RoomMessage;
  emoji?: string;
}

export class RoomSyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  public isHost: boolean = false;
  public roomCode: string = '';
  public userName: string = '';

  public onSyncReceived?: (payload: SyncPayload) => void;
  public onPeersUpdated?: (peers: RoomPeer[]) => void;
  public onChatReceived?: (msg: RoomMessage) => void;
  public onReactionReceived?: (emoji: string, sender: string) => void;
  public onError?: (err: string) => void;

  private activePeers: RoomPeer[] = [];

  // Generate 6-char room code
  public static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
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
    this.activePeers = [{ id: 'host', name: this.userName, isHost: true }];

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
            this.onError?.('Room code already taken. Try generating a new room code.');
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
          const newPeer: RoomPeer = { id: conn.peer, name: peerName, isHost: false };
          this.activePeers = [...this.activePeers.filter((p) => p.id !== conn.peer), newPeer];

          // Broadcast peer list
          this.broadcast({
            type: 'PEER_LIST',
            peers: this.activePeers,
          });
          this.onPeersUpdated?.(this.activePeers);

          // Send current state to newly joined guest
          conn.send({
            type: 'INIT_SYNC',
            track: getCurrentState.track,
            isPlaying: getCurrentState.isPlaying,
            position: getCurrentState.position,
            timestamp: Date.now(),
            queue: getCurrentState.queue,
            hostName: this.userName,
            peers: this.activePeers,
          } as SyncPayload);

          // Broadcast join message
          const joinMsg: RoomMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            sender: 'AuxParty',
            text: `${peerName} joined the party! 🎉`,
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
        const leaveMsg: RoomMessage = {
          id: `msg-${Date.now()}`,
          sender: 'AuxParty',
          text: `${departingPeer.name} left the party.`,
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
              this.onPeersUpdated?.(data.peers);
            } else if (data.type === 'CHAT' && data.message) {
              this.onChatReceived?.(data.message);
            } else if (data.type === 'REACTION' && data.emoji) {
              this.onReactionReceived?.(data.emoji, data.sender || 'Friend');
            } else {
              this.onSyncReceived?.(data);
            }
          });

          conn.on('close', () => {
            this.onError?.('Disconnected from host.');
          });

          conn.on('error', (err) => {
            console.error('Guest connection error:', err);
            this.onError?.('Could not connect to host. Make sure the room code is correct.');
            resolve(false);
          });
        });

        this.peer.on('error', (err) => {
          console.error('Peer guest error:', err);
          this.onError?.('Unable to connect to room. Check your internet connection.');
          resolve(false);
        });
      } catch (err: any) {
        this.onError?.(err.message || 'Failed to join room');
        resolve(false);
      }
    });
  }

  // Broadcast to all peers (if host)
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

  // Host broadcasts playback change
  public broadcastPlayback(track: Track | null, isPlaying: boolean, position: number, queue: Track[]) {
    if (!this.isHost) return;
    this.broadcast({
      type: 'SYNC_STATE',
      track,
      isPlaying,
      position,
      timestamp: Date.now(),
      queue,
    });
  }

  // Send chat message
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

  // Send emoji reaction
  public sendReaction(emoji: string) {
    if (this.isHost) {
      this.broadcast({ type: 'REACTION', emoji, sender: this.userName });
      this.onReactionReceived?.(emoji, this.userName);
    } else {
      this.broadcast({ type: 'REACTION', emoji, sender: this.userName });
    }
  }

  // Leave / Destroy
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
    this.roomCode = '';
  }
}

export const roomSync = new RoomSyncService();
