const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const users = {}; // Lưu danh sách người dùng online

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AryaK24 - Chat Online</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="/socket.io/socket.io.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Quicksand', sans-serif; overflow: hidden; background: #f0f2f5; }
        .rounded-zalo { border-radius: 22px; }
        .glass { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); }
        .cherry-blossom { position: fixed; top: -10px; z-index: 999; pointer-events: none; animation: fall linear forwards; }
        @keyframes fall { to { transform: translateY(105vh) rotate(360deg); } }
        .msg-in { border-radius: 4px 18px 18px 18px; background: white; }
        .msg-out { border-radius: 18px 18px 4px 18px; background: #e7f3ff; color: #004a91; }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    </style>
</head>
<body>
    <div id="app" class="h-screen w-full flex items-center justify-center p-0 md:p-4">
        
        <!-- MÀN ĐĂNG KÝ / ĐĂNG NHẬP -->
        <div v-if="!isLoggedIn" class="z-[1000] fixed inset-0 flex items-center justify-center bg-sky-50 p-4">
            <div class="w-full max-w-md p-8 rounded-3xl shadow-2xl border bg-white">
                <div class="text-center mb-6">
                    <h1 class="text-4xl font-bold text-blue-600">AryaK24</h1>
                    <p class="text-gray-400 font-medium">Chat Online No Firebase</p>
                </div>
                <div class="space-y-3">
                    <input v-model="regForm.name" type="text" placeholder="Họ và tên" class="w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none focus:ring-2 focus:ring-blue-500">
                    <input v-model="regForm.phone" type="text" placeholder="Số điện thoại" class="w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none focus:ring-2 focus:ring-blue-500">
                    <select v-model="regForm.province" class="w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none">
                        <option value="">Chọn tỉnh thành</option>
                        <option v-for="p in provinces" :value="p">{{p}}</option>
                    </select>
                    <input v-model="regForm.password" type="password" placeholder="Mật khẩu (8+ ký tự, 1 hoa, 1 số)" class="w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none">
                    
                    <button @click="handleLogin" class="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition">
                        Bắt đầu Chat ngay
                    </button>
                </div>
            </div>
        </div>

        <!-- GIAO DIỆN CHÍNH -->
        <div v-if="isLoggedIn" class="w-full h-full max-w-6xl glass rounded-zalo shadow-2xl flex overflow-hidden">
            <!-- Sidebar -->
            <nav class="w-16 md:w-20 bg-[#0091ff] flex flex-col items-center py-6 text-white">
                <div @click="showSettings = true" class="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 cursor-pointer mb-8">
                    <img :src="'https://ui-avatars.com/api/?name='+currentUser.name" alt="Avatar">
                </div>
                <div class="flex flex-col space-y-6 flex-1">
                    <button class="p-3 bg-white/20 rounded-xl"><i data-lucide="message-square"></i></button>
                    <button class="p-3 hover:bg-white/10 rounded-xl"><i data-lucide="users"></i></button>
                </div>
                <button @click="showSettings = true" class="p-3 hover:bg-white/10 rounded-xl"><i data-lucide="settings"></i></button>
            </nav>

            <!-- Danh sách người dùng ONLINE -->
            <aside class="w-full md:w-80 bg-white border-r flex flex-col" :class="activeChat ? 'hidden md:flex' : 'flex'">
                <div class="p-4 border-b">
                    <h2 class="text-xl font-bold">Đang online ({{onlineUsers.length}})</h2>
                </div>
                <div class="flex-1 overflow-y-auto custom-scroll">
                    <div v-for="user in onlineUsers" :key="user.id" @click="selectChat(user)"
                        v-show="user.id !== socketId"
                        class="flex items-center p-4 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50">
                        <img :src="'https://ui-avatars.com/api/?name='+user.name+'&background=random'" class="w-12 h-12 rounded-full border">
                        <div class="ml-3">
                            <p class="font-bold text-sm">{{user.name}}</p>
                            <p class="text-[10px] text-green-500 font-bold">● Đang hoạt động</p>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Khung Chat -->
            <main class="flex-1 flex flex-col bg-[#e9ebed]" :class="!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'">
                <template v-if="activeChat">
                    <div class="p-3 bg-white border-b flex items-center justify-between">
                        <div class="flex items-center">
                            <button @click="activeChat = null" class="md:hidden mr-2"><i data-lucide="chevron-left"></i></button>
                            <img :src="'https://ui-avatars.com/api/?name='+activeChat.name" class="w-10 h-10 rounded-full">
                            <div class="ml-3"><p class="font-bold text-sm">{{activeChat.name}}</p></div>
                        </div>
                    </div>
                    <!-- Tin nhắn -->
                    <div id="chat-box" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll">
                        <div v-for="m in messages" :class="m.senderId === socketId ? 'flex justify-end' : 'flex justify-start'">
                            <div :class="m.senderId === socketId ? 'msg-out shadow-sm' : 'msg-in shadow-sm'" class="max-w-[80%] p-3 relative">
                                <p v-if="m.type === 'text'" class="text-sm">{{m.content}}</p>
                                <img v-if="m.type === 'image'" :src="m.content" class="rounded-lg max-w-full cursor-pointer" @click="downloadFile(m.content)">
                                <a v-if="m.type === 'file'" :href="m.content" target="_blank" class="flex items-center space-x-2 text-blue-600 text-xs">
                                    <i data-lucide="file"></i> <span>Tải File/APK</span>
                                </a>
                                <p class="text-[9px] mt-1 opacity-50">{{m.time}}</p>
                            </div>
                        </div>
                    </div>
                    <!-- Input -->
                    <div class="p-3 bg-white flex items-center space-x-3">
                        <label class="cursor-pointer text-gray-400 hover:text-blue-500">
                            <i data-lucide="image"></i><input type="file" class="hidden" accept="image/*" @change="uploadFile($event, 'image')">
                        </label>
                        <label class="cursor-pointer text-gray-400 hover:text-blue-500">
                            <i data-lucide="paperclip"></i><input type="file" class="hidden" @change="uploadFile($event, 'file')">
                        </label>
                        <input v-model="inputMsg" @keyup.enter="sendMsg" type="text" placeholder="Nhập tin nhắn..." class="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none text-sm">
                        <button @click="sendMsg" class="text-blue-600"><i data-lucide="send"></i></button>
                    </div>
                </template>
                <div v-else class="text-center opacity-30">
                    <i data-lucide="message-circle" class="w-20 h-20 mx-auto mb-4 text-blue-600"></i>
                    <p>Chọn bạn online để chat trên <b>AryaK24</b></p>
                </div>
            </main>

            <!-- Cài đặt -->
            <div v-if="showSettings" class="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
                    <button @click="showSettings = false" class="absolute right-4 top-4"><i data-lucide="x"></i></button>
                    <h2 class="text-2xl font-bold mb-4">Cài đặt</h2>
                    <div class="space-y-4 text-sm text-gray-600">
                        <p><b>Tên:</b> {{currentUser.name}}</p>
                        <p><b>SĐT:</b> {{currentUser.phone}}</p>
                        <p><b>Tỉnh:</b> {{currentUser.province}}</p>
                        <hr>
                        <p class="italic">Giới thiệu: AryaK24 v1.0 - Hệ thống chat real-time tốc độ cao, không cần database.</p>
                        <button @click="location.reload()" class="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold">Đăng xuất</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        const { createApp, ref, onMounted, nextTick } = Vue;

        createApp({
            setup() {
                const isLoggedIn = ref(false);
                const currentUser = ref({});
                const socketId = ref('');
                const activeChat = ref(null);
                const onlineUsers = ref([]);
                const messages = ref([]);
                const inputMsg = ref('');
                const showSettings = ref(false);
                const regForm = ref({ name: '', phone: '', province: '', password: '' });
                const provinces = ["Hà Nội", "TP. HCM", "Hải Phòng", "Đà Nẵng", "Cần Thơ"];

                const handleLogin = () => {
                    if(!regForm.value.name || regForm.value.password.length < 1) return alert("Vui lòng nhập đủ!");
                    currentUser.value = { ...regForm.value };
                    socket.emit('login', regForm.value);
                    isLoggedIn.value = true;
                    setTimeout(() => lucide.createIcons(), 100);
                };

                const selectChat = (user) => {
                    activeChat.value = user;
                    messages.value = []; // Reset tin nhắn khi đổi người (Bản đơn giản)
                };

                const sendMsg = () => {
                    if(!inputMsg.value.trim()) return;
                    const msg = {
                        targetId: activeChat.value.id,
                        senderId: socketId.value,
                        content: inputMsg.value,
                        type: 'text',
                        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    };
                    socket.emit('private-msg', msg);
                    messages.value.push(msg);
                    inputMsg.value = '';
                    scrollToBottom();
                };

                const uploadFile = (e, type) => {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                        const msg = {
                            targetId: activeChat.value.id,
                            senderId: socketId.value,
                            content: reader.result,
                            type: type,
                            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        };
                        socket.emit('private-msg', msg);
                        messages.value.push(msg);
                        scrollToBottom();
                    };
                    reader.readAsDataURL(file);
                };

                const scrollToBottom = () => {
                    nextTick(() => {
                        const b = document.getElementById('chat-box');
                        if(b) b.scrollTop = b.scrollHeight;
                    });
                };

                const downloadFile = (url) => { window.open(url, '_blank'); };

                onMounted(() => {
                    socket.on('connect', () => socketId.value = socket.id);
                    socket.on('user-list', (list) => onlineUsers.value = list);
                    socket.on('receive-msg', (msg) => {
                        if(activeChat.value && msg.senderId === activeChat.value.id) {
                            messages.value.push(msg);
                            scrollToBottom();
                        } else {
                            alert("Bạn có tin nhắn mới từ một người khác!");
                        }
                    });
                    
                    // Hiệu ứng hoa
                    setInterval(() => {
                        const f = document.createElement('div');
                        f.innerHTML = '🌸'; f.className = 'cherry-blossom';
                        f.style.left = Math.random() * 100 + 'vw';
                        f.style.animationDuration = Math.random() * 3 + 2 + 's';
                        document.body.appendChild(f);
                        setTimeout(() => f.remove(), 5000);
                    }, 600);
                    lucide.createIcons();
                });

                return { isLoggedIn, currentUser, socketId, activeChat, onlineUsers, messages, inputMsg, showSettings, regForm, provinces, handleLogin, selectChat, sendMsg, uploadFile, downloadFile };
            }
        }).mount('#app');
    </script>
</body>
</html>
    `);
});

io.on('connection', (socket) => {
    socket.on('login', (userData) => {
        users[socket.id] = { id: socket.id, name: userData.name };
        io.emit('user-list', Object.values(users));
    });

    socket.on('private-msg', (data) => {
        socket.to(data.targetId).emit('receive-msg', data);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('user-list', Object.values(users));
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('AryaK24 đang chạy tại cổng: ' + PORT));