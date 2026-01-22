const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const port = 3000;

// Armazenamento em memória das salas
// Estrutura: { roomCode: { code: string, users: [{ id: string, socketId: string }], createdAt: Date } }
const rooms = new Map();

// Função auxiliar para gerar código de sala (4 letras maiúsculas)
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Verifica se o código já existe
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Função auxiliar para obter lista de salas
function getRoomsList() {
  return Array.from(rooms.values()).map(room => ({
    code: room.code,
    userCount: room.users.length,
    createdAt: room.createdAt
  }));
}

app.get('/', (req, res) => {
  res.send('Olá, Node.js!');
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });
});

httpServer.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});