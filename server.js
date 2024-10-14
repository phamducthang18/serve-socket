const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const Redis = require('ioredis');

// Tạo hai kết nối Redis riêng biệt
const redisSubscriber = new Redis(); // Sử dụng cho việc subscribe
const redisClient = new Redis(); // Sử dụng cho các lệnh Redis khác

let onlineUsers = [];

// Hàm lấy danh sách người dùng online từ Redis
async function getOnlineUsers() {
    
    const userIds = await redisClient.smembers('online_users');
    const onlineUsersList = userIds.map((userId) => {
        const user = onlineUsers.find(u => u.id === parseInt(userId)); 
        return user;
    }).filter(Boolean); 

    return onlineUsersList;

    
}

app.use(express.json());

// Đăng ký Redis pub/sub với redisSubscriber
redisSubscriber.psubscribe('*', (err, count) => {
    if (err) {
        console.error('Failed to subscribe: ', err.message);
    } else {
        console.log(`Subscribed successfully! Currently subscribed to ${count} channels.`);
    }
});

// Lắng nghe các tin nhắn từ Redis (subscriber)
redisSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
        const parsedMessage = JSON.parse(message);
        console.log(`Received message from Redis on channel ${channel}:`, parsedMessage);

        // Phát lại qua Socket.IO
        io.emit(`${channel}:${parsedMessage.event}`, parsedMessage.data);
        console.log(`Message emitted to Socket.IO clients on event ${channel}:${parsedMessage.event}`);
    } catch (e) {
        console.error(`Failed to parse message from Redis on channel ${channel}:`, e.message);
    }
});

// Route test server
app.get('/', (req, res) => {
    res.send('Socket.IO + Redis server is running!');
});

// Khởi động server
server.listen(3001, () => {
    console.log('Socket.IO server is running on port 3000');
});

// Lắng nghe sự kiện khi client kết nối qua Socket.IO
io.on('connection', (socket) => {

    socket.on('joinRooms', (rooms) => {
        rooms.forEach(room => {
          socket.join(room);
          console.log(`User ${socket.id} joined room ${room}`);
        });
      });
      socket.on('sendMessage', (data) => {
        const { roomId, message,user } = data;
        console.log('data',data);
        
        io.to(roomId).emit('receiveMessage', data);

      });
    
    socket.on('register', async (user) => {
        const userExists = onlineUsers.some(u => u.id === user.id);
        if (!userExists) {
            console.log('User registered:', user);
            onlineUsers.push({ id: user.id, name: user.name, socketId: socket.id });

            // Thêm userId vào Redis set bằng redisClient
            // console.log('user',user);
            
            await redisClient.sadd('online_users', user);

            // Cập nhật danh sách người dùng online
            const onlineUsersList = await getOnlineUsers();
            io.emit('updateOnlineUsers', onlineUsersList);
            console.log('Online users:', onlineUsersList);
        }
    });

    // Xử lý khi người dùng ngắt kết nối
    socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Xóa user khỏi danh sách online
        const disconnectedUser = onlineUsers.find(u => u.socketId === socket.id);
        if (disconnectedUser) {
            await redisClient.srem('online_users', disconnectedUser.id); // Xóa khỏi Redis bằng redisClient
        }
        onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);

        // Cập nhật danh sách người dùng online
        const onlineUsersList = await getOnlineUsers();
        io.emit('updateOnlineUsers', onlineUsersList);
        console.log('Updated online users:', onlineUsersList);
    });
});
