# 🕵️ Spyfall - Jogo Online Multiplayer

<div align="center">

![Spyfall Logo](https://img.shields.io/badge/Spyfall-Game-01DEB2?style=for-the-badge&logo=gamepad&logoColor=white)

**Um jogo de dedução social onde você precisa descobrir quem é o espião!**

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

[🎮 Jogar Agora](#) • [📖 Como Jogar](#-como-jogar) • [🛠️ Instalação](#%EF%B8%8F-instalação)

</div>

---

## 📋 Sobre o Jogo

**Spyfall** é um jogo de festa para 3 ou mais jogadores. Todos os jogadores recebem a mesma localização, exceto um: **o espião**. 

O objetivo dos **agentes** é descobrir quem é o espião através de perguntas inteligentes, enquanto o **espião** deve descobrir qual é a localização sem ser detectado.

## ✨ Funcionalidades

- 🎯 **Salas Multiplayer** - Crie ou entre em salas com código único
- 👥 **3+ Jogadores** - Suporta múltiplos jogadores por sala
- 🎭 **24 Localizações** - Grande variedade de locais para jogar
- ⏱️ **Timer de 6 minutos** - Contagem regressiva com alerta visual
- 📝 **Lista de Locais** - Risque locais para ajudar na dedução
- 🗳️ **Sistema de Acusação** - Vote para acusar suspeitos
- 🎯 **Chute do Espião** - O espião pode chutar a localização
- 🏆 **Sistema de Pontuação** - Placar persistente entre partidas
- 📱 **Mobile First** - Interface otimizada para celulares
- 🌙 **Dark Mode** - Visual moderno e confortável

## 🎮 Como Jogar

### Criando uma Sala
1. Acesse o jogo e digite seu nome
2. Clique em **"Criar Sala"**
3. Compartilhe o código da sala com seus amigos

### Entrando em uma Sala
1. Digite seu nome
2. Clique em **"Entrar na Sala"**
3. Insira o código de 4 letras da sala

### Durante o Jogo

#### Se você é um **AGENTE** 🔍
- Você verá a localização no topo da tela
- Faça perguntas aos outros jogadores para identificar o espião
- Cuidado para não revelar a localização com perguntas muito óbvias!
- Use a lista de locais para riscar possibilidades
- Você pode **acusar** alguém que suspeita ser o espião

#### Se você é o **ESPIÃO** 🕵️
- Você NÃO sabe qual é a localização
- Ouça as perguntas e respostas para deduzir o local
- Tente se misturar e não ser descoberto
- Você pode **chutar a localização** a qualquer momento

### Pontuação

| Ação | Pontos |
|------|--------|
| Acusador acerta o espião | +2 pontos |
| Agentes que votaram a favor (acerto) | +1 ponto |
| Espião adivinha a localização | +2 pontos |
| Agentes (espião erra o chute) | +1 ponto cada |
| Votação final - voto correto | +1 ponto |
| Espião não descoberto (tempo) | +2 pontos |

## 📍 Localizações Disponíveis

<details>
<summary>Ver todas as 24 localizações</summary>

| Ícone | Local |
|-------|-------|
| ✈️ | Aeroporto |
| 🏦 | Banco |
| 🏖️ | Praia |
| 🎰 | Cassino |
| ⛪ | Igreja |
| 🎪 | Circo |
| 🏫 | Escola |
| 🏟️ | Estádio |
| 🏭 | Fábrica |
| 🏨 | Hotel |
| 🏥 | Hospital |
| 🎬 | Estúdio de Cinema |
| 🍽️ | Restaurante |
| 🛳️ | Navio Cruzeiro |
| 🎭 | Teatro |
| 🏛️ | Museu |
| 🚉 | Estação de Trem |
| 🎢 | Parque de Diversões |
| 🏎️ | Autódromo |
| 🛒 | Supermercado |
| 💇 | Salão de Beleza |
| 🎳 | Boliche |
| 🏋️ | Academia |
| 🚀 | Estação Espacial |

</details>

## 🛠️ Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- npm ou yarn

### Clonando o Repositório

```bash
git clone https://github.com/seu-usuario/spyfall.git
cd spyfall
```

### Instalando Dependências

```bash
# Instalar dependências do projeto
npm install

# Instalar dependências do backend
cd backend && npm install && cd ..

# Instalar dependências do frontend
cd frontend && npm install && cd ..
```

### Configurando Variáveis de Ambiente

#### Backend (`backend/.env`)
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Frontend (`frontend/.env`)
```env
VITE_SOCKET_URL=http://localhost:3000
```

### Executando o Projeto

```bash
# Rodar backend e frontend simultaneamente
npm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:3000`.

### Acessando pelo Celular (Rede Local)

Para testar no celular, adicione o IP da sua máquina nas origens permitidas:

1. Descubra seu IP: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
2. Adicione ao `ALLOWED_ORIGINS` no backend
3. Acesse `http://SEU_IP:5173` no celular

## 🚀 Deploy

### Backend (Railway)

1. Crie um projeto no [Railway](https://railway.app/)
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente:
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://seu-app.vercel.app`
4. O arquivo `railway.json` já está configurado

### Frontend (Vercel)

1. Importe o projeto no [Vercel](https://vercel.com/)
2. Configure o **Root Directory** como `frontend`
3. Adicione a variável de ambiente:
   - `VITE_SOCKET_URL=https://sua-api.railway.app`

## 🏗️ Estrutura do Projeto

```
spyfall/
├── backend/
│   ├── src/
│   │   └── index.js      # Servidor Socket.io + Express
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/       # Componentes shadcn/ui
│   │   │   ├── Home.jsx  # Tela inicial
│   │   │   └── GameRoom.jsx  # Sala de jogo
│   │   ├── context/
│   │   │   └── RoomContext.jsx  # Estado global
│   │   ├── lib/
│   │   │   ├── socket.js # Conexão Socket.io
│   │   │   └── utils.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css     # Tailwind CSS
│   ├── package.json
│   └── .env
├── railway.json          # Config Railway
├── nixpacks.toml         # Config Nixpacks
└── package.json          # Scripts do monorepo
```

## 🔧 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.io** - Comunicação em tempo real
- **dotenv** - Variáveis de ambiente
- **cors** - Cross-Origin Resource Sharing

### Frontend
- **React 19** - Biblioteca UI
- **Vite** - Build tool
- **Tailwind CSS v4** - Framework CSS
- **shadcn/ui** - Componentes UI
- **Lucide React** - Ícones
- **Socket.io Client** - Cliente WebSocket

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abrir um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Desenvolvido com ❤️ e ☕

---

<div align="center">

**[⬆ Voltar ao topo](#-spyfall---jogo-online-multiplayer)**

</div>
