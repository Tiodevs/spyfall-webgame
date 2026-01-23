import { createContext, useContext, useState } from 'react';

const RoomContext = createContext();

export const RoomProvider = ({ children }) => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [userName, setUserName] = useState('');
  const [users, setUsers] = useState([]);

  const joinRoom = (roomCode, name) => {
    setCurrentRoom(roomCode);
    setUserName(name);
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setUserName('');
    setUsers([]);
  };

  const updateUsers = (usersList) => {
    setUsers(usersList);
  };

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        userName,
        users,
        joinRoom,
        leaveRoom,
        updateUsers
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
