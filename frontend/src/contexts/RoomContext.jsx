import { createContext, useContext, useState, useCallback } from 'react';
import { getOrCreatePlayerId } from '../lib/playerId';

const SESSION_KEY = 'roda_session';
const LEGACY_SESSION_KEY = 'spyfall_session';

const RoomContext = createContext();

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem(LEGACY_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

export const RoomProvider = ({ children }) => {
  const saved = loadSession();
  const [currentRoom, setCurrentRoom] = useState(saved?.roomCode ?? null);
  const [userName, setUserName] = useState(saved?.userName ?? '');
  const [playerId] = useState(() => saved?.playerId ?? getOrCreatePlayerId());
  const [users, setUsers] = useState([]);
  const [selectedGame, setSelectedGame] = useState(saved?.gameType ?? null);

  const selectGame = useCallback((gameType) => {
    setSelectedGame(gameType);
  }, []);

  const clearSelectedGame = useCallback(() => {
    setSelectedGame(null);
    if (!currentRoom) {
      saveSession(null);
    }
  }, [currentRoom]);

  const joinRoom = useCallback((roomCode, name, gameType) => {
    const nextGame = gameType || selectedGame;
    setCurrentRoom(roomCode);
    setUserName(name);
    if (nextGame) setSelectedGame(nextGame);
    saveSession({ roomCode, userName: name, playerId, gameType: nextGame });
  }, [playerId, selectedGame]);

  const leaveRoom = useCallback(() => {
    setCurrentRoom(null);
    setUserName('');
    setUsers([]);
    saveSession(selectedGame ? { gameType: selectedGame, playerId } : null);
  }, [selectedGame, playerId]);

  const updateUsers = useCallback((usersList) => {
    setUsers(usersList);
  }, []);

  const getSession = useCallback(() => {
    return loadSession() || (currentRoom
      ? { roomCode: currentRoom, userName, playerId, gameType: selectedGame }
      : null);
  }, [currentRoom, userName, playerId, selectedGame]);

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        userName,
        playerId,
        users,
        selectedGame,
        selectGame,
        clearSelectedGame,
        joinRoom,
        leaveRoom,
        updateUsers,
        getSession
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
