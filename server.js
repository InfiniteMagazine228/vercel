const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Cấu hình Socket.io ép chạy bằng polling để tương thích với Vercel Serverless
const io = new Server(server, {
    path: '/socket.io/',
    transports: ['polling'], 
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Trả về file giao diện game khi truy cập trang chủ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    // Khởi tạo vị trí nhân vật ngẫu nhiên trên sàn
    players[socket.id] = { 
        x: (Math.random() - 0.5) * 10, 
        y: 1, 
        z: (Math.random() - 0.5) * 10, 
        color: Math.random() * 0xffffff 
    };
    
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...players[socket.id] });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Chạy local nếu không phải môi trường Vercel production
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`Game đang chạy local tại http://localhost:${PORT}`);
    });
}

module.exports = server;
