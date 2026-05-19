import { createContext, useContext, useState, useCallback } from 'react';
import { getOrCreatePlayerId } from '../lib/playerId';

const SESSION_KEY = 'spyfall_session';

const RoomContext = createContext();

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export const RoomProvider = ({ children }) => {
  const saved = loadSession();
  const [currentRoom, setCurrentRoom] = useState(saved?.roomCode ?? null);
  const [userName, setUserName] = useState(saved?.userName ?? '');
  const [playerId] = useState(() => saved?.playerId ?? getOrCreatePlayerId());
  const [users, setUsers] = useState([]);

  const joinRoom = useCallback((roomCode, name) => {
    setCurrentRoom(roomCode);
    setUserName(name);
    saveSession({ roomCode, userName: name, playerId });
  }, [playerId]);

  const leaveRoom = useCallback(() => {
    setCurrentRoom(null);
    setUserName('');
    setUsers([]);
    saveSession(null);
  }, []);

  const updateUsers = useCallback((usersList) => {
    setUsers(usersList);
  }, []);

  const getSession = useCallback(() => {
    return loadSession() || (currentRoom ? { roomCode: currentRoom, userName, playerId } : null);
  }, [currentRoom, userName, playerId]);

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        userName,
        playerId,
        users,
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
