import React, { createContext, useContext, useEffect, useState } from 'react';
import { RoomState, RoomPeer, RoomMessage, FloatingReaction } from '../types';
import { roomSync, RoomSyncService, SyncPayload } from '../services/roomSync';
import { usePlayer } from './PlayerContext';

interface RoomContextType {
  roomState: RoomState;
  messages: RoomMessage[];
  reactions: FloatingReaction[];
  error: string | null;
  isConnecting: boolean;
  createRoom: (hostName: string) => Promise<boolean>;
  joinRoom: (roomCode: string, guestName: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendMessage: (text: string) => void;
  sendReaction: (emoji: string) => void;
  clearError: () => void;
}

const initialRoomState: RoomState = {
  roomId: '',
  roomCode: '',
  isHost: false,
  hostName: '',
  userName: '',
  connected: false,
  peers: [],
};

const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const player = usePlayer();
  const [roomState, setRoomState] = useState<RoomState>(initialRoomState);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Hook player state changes to broadcast when Host
  useEffect(() => {
    player.setOnStateChangeNotify((track, isPlaying, position, queue) => {
      if (roomSync.isHost && roomState.connected) {
        roomSync.broadcastPlayback(track, isPlaying, position, queue);
      }
    });
  }, [roomState.connected, player]);

  // Setup callbacks for roomSync
  useEffect(() => {
    roomSync.onSyncReceived = (payload: SyncPayload) => {
      if (payload.type === 'INIT_SYNC' || payload.type === 'SYNC_STATE') {
        player.syncFromHost(
          payload.track || null,
          Boolean(payload.isPlaying),
          payload.position || 0,
          payload.timestamp || Date.now(),
          payload.queue
        );
      }
    };

    roomSync.onPeersUpdated = (peers: RoomPeer[]) => {
      setRoomState((prev) => ({ ...prev, peers }));
    };

    roomSync.onChatReceived = (msg: RoomMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    roomSync.onReactionReceived = (emoji: string, sender: string) => {
      const newReaction: FloatingReaction = {
        id: `react-${Date.now()}-${Math.random()}`,
        emoji,
        sender,
        x: Math.random() * 80 + 10, // random percentage for animation
      };
      setReactions((prev) => [...prev, newReaction]);

      // Remove after 2.8s
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 2800);
    };

    roomSync.onError = (errMsg: string) => {
      setError(errMsg);
      setIsConnecting(false);
    };

    return () => {
      roomSync.onSyncReceived = undefined;
      roomSync.onPeersUpdated = undefined;
      roomSync.onChatReceived = undefined;
      roomSync.onReactionReceived = undefined;
      roomSync.onError = undefined;
    };
  }, [player]);

  const createRoom = async (hostName: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    const code = RoomSyncService.generateRoomCode();
    const success = await roomSync.createRoom(code, hostName, {
      track: player.currentTrack,
      isPlaying: player.isPlaying,
      position: player.currentTime,
      queue: player.queue,
    });

    setIsConnecting(false);
    if (success) {
      setRoomState({
        roomId: `auxparty-${code.toLowerCase()}`,
        roomCode: code,
        isHost: true,
        hostName: hostName || 'DJ (Host)',
        userName: hostName || 'DJ (Host)',
        connected: true,
        peers: [{ id: 'host', name: hostName || 'DJ (Host)', isHost: true }],
      });
      setMessages([
        {
          id: 'welcome',
          sender: 'AuxParty',
          text: `Room created! Share room code "${code}" with friends.`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      return true;
    }
    return false;
  };

  const joinRoom = async (roomCode: string, guestName: string): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);
    const cleanCode = roomCode.trim().toUpperCase();
    const success = await roomSync.joinRoom(cleanCode, guestName);

    setIsConnecting(false);
    if (success) {
      setRoomState({
        roomId: `auxparty-${cleanCode.toLowerCase()}`,
        roomCode: cleanCode,
        isHost: false,
        hostName: 'Host',
        userName: guestName || 'Friend',
        connected: true,
        peers: [],
      });
      return true;
    }
    return false;
  };

  const leaveRoom = () => {
    roomSync.leave();
    setRoomState(initialRoomState);
    setMessages([]);
    setReactions([]);
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !roomState.connected) return;
    roomSync.sendChatMessage(text);
  };

  const sendReaction = (emoji: string) => {
    if (!roomState.connected) return;
    roomSync.sendReaction(emoji);
  };

  const clearError = () => setError(null);

  return (
    <RoomContext.Provider
      value={{
        roomState,
        messages,
        reactions,
        error,
        isConnecting,
        createRoom,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendReaction,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within RoomProvider');
  return context;
};
