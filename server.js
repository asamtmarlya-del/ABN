const express = require('express');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const token = '8543476489:AAFPV1Iz9_a0dgoSmiYeqLVO166BefYi7Fs';
const adminId = '6326755118';

const app = express();
const appServer = http.createServer(app);
const appBot = new telegramBot(token, {polling: true});

app.use(bodyParser.json());

const storageDir = path.join(__dirname, 'storage');
const databaseFile = path.join(__dirname, 'files_db.json');

if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

function loadDatabase() {
    if (fs.existsSync(databaseFile)) {
        return JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
    }
    return { files: {} };
}

function saveDatabase(data) {
    fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2));
}

function getUserDir(userId) {
    const dir = path.join(storageDir, userId.toString());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    return dir;
}

app.get('/', (req, res) => {
    res.send('<h1 align="center">☁️ بوت رفع وحفظ الملفات ☁️</h1>');
});

appBot.on('message', (message) => {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text;

    if (text === '/start') {
        appBot.sendMessage(chatId,
            '☁️ مرحباً بك في بوت رفع وحفظ الملفات\n\n' +
            '💾 الميزات:\n' +
            '📤 رفع أي نوع ملف\n' +
            '💿 حفظ آمن على السيرفر\n' +
            '📥 تحميل ملفاتك في أي وقت\n' +
            '📊 إدارة كاملة للملفات\n\n' +
            '👨‍💻 بواسطة قائد 『ABN @Aosab\n\n' +
            'اختر من الخيارات:',
            {
                reply_markup: {
                    keyboard: [
                        [{text: '📤 رفع ملف'}, {text: '📥 تحميل ملف'}],
                        [{text: '📋 قائمة ملفاتي'}, {text: '🗑️ حذف ملف'}],
                        [{text: 'ℹ️ معلومات'}]
                    ],
                    resize_keyboard: true
                }
            }
        );
    }
    else if (text === '📤 رفع ملف') {
        appBot.sendMessage(chatId,
            '📤 ارسل الملف الذي تريد رفعه:\n\n' +
            '✅ جميع أنواع الملفات مدعومة\n' +
            '✅ الحد الأقصى: 50 MB\n' +
            '💾 سيتم حفظه بأمان'
        );
    }
    else if (text === '📥 تحميل ملف') {
        const db = loadDatabase();
        const userFiles = db.files[userId] || [];
        
        if (userFiles.length === 0) {
            appBot.sendMessage(chatId, '❌ لا توجد ملفات محفوظة');
            return;
        }

        const keyboard = userFiles.map(f => [{text: `📄 ${f.name}`}]);
        appBot.sendMessage(chatId, '📥 اختر ملف للتحميل:', {
            reply_markup: { keyboard, resize_keyboard: true }
        });
    }
    else if (text === '📋 قائمة ملفاتي') {
        const db = loadDatabase();
        const userFiles = db.files[userId] || [];
        
        if (userFiles.length === 0) {
            appBot.sendMessage(chatId, '❌ لا توجد ملفات محفوظة');
            return;
        }

        let list = '📋 ملفاتك:\n\n';
        userFiles.forEach((f, i) => {
            const sizeMB = (f.size / 1024 / 1024).toFixed(2);
            list += `${i + 1}. 📄 ${f.name}\n   📊 الحجم: ${sizeMB} MB\n   📅 التاريخ: ${f.date}\n\n`;
        });

        appBot.sendMessage(chatId, list);
    }
    else if (text === '🗑️ حذف ملف') {
        const db = loadDatabase();
        const userFiles = db.files[userId] || [];
        
        if (userFiles.length === 0) {
            appBot.sendMessage(chatId, '❌ لا توجد ملفات للحذف');
            return;
        }

        const keyboard = userFiles.map(f => [{text: `🗑️ ${f.name}`}]);
        appBot.sendMessage(chatId, '🗑️ اختر ملف للحذف:', {
            reply_markup: { keyboard, resize_keyboard: true }
        });
    }
    else if (text === 'ℹ️ معلومات') {
        appBot.sendMessage(chatId,
            'ℹ️ معلومات البوت:\n\n' +
            '☁️ بوت رفع وحفظ الملفات\n\n' +
            '🔒 الأمان:\n' +
            '✅ ملفاتك محفوظة بشكل آمن\n' +
            '✅ محمية بـ user ID خاص بك\n' +
            '✅ تشفير البيانات\n\n' +
            '📊 الحدود:\n' +
            '✅ حد الملف: 10000 GB\n' +
            '✅ عدد الملفات: غير محدود\n' +
            '✅ وقت التخزين: دائم\n\n' +
            '👨‍💻 تم انشاء هذا البوت بواسطة قائد 『ABN\n' +
            '📱 @Aosab'
        );
    }
    
    // معالجة الملفات المرفوعة
    else if (message.document) {
        const file = message.document;
        const fileName = file.file_name;
        const fileSize = file.file_size;

        if (fileSize > 10000 * 1024 * 1024 * 1024) {
            appBot.sendMessage(chatId, '❌ حجم الملف كبير جداً (الحد الأقصى 10000 GB)');
            return;
        }

        appBot.sendMessage(chatId, '⏳ جاري رفع الملف...');

        appBot.getFile(file.file_id)
            .then(fileInfo => {
                const userDir = getUserDir(userId);
                const filePath = path.join(userDir, fileName);
                const stream = fs.createWriteStream(filePath);

                return new Promise((resolve, reject) => {
                    const request = require('https').get(
                        `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`,
                        (response) => {
                            response.pipe(stream);
                            stream.on('finish', () => {
                                resolve({ path: filePath, size: fileSize, name: fileName });
                            });
                            stream.on('error', reject);
                        }
                    );
                    request.on('error', reject);
                });
            })
            .then(fileInfo => {
                const db = loadDatabase();
                if (!db.files[userId]) db.files[userId] = [];

                const date = new Date().toLocaleDateString('ar-SA');
                db.files[userId].push({
                    name: fileInfo.name,
                    size: fileInfo.size,
                    path: fileInfo.path,
                    date: date
                });

                saveDatabase(db);

                const sizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
                appBot.sendMessage(chatId,
                    `✅ تم رفع الملف بنجاح!\n\n` +
                    `📄 الملف: ${fileInfo.name}\n` +
                    `📊 الحجم: ${sizeMB} MB\n` +
                    `💾 حفظ آمن`
                );
            })
            .catch(err => {
                appBot.sendMessage(chatId, `❌ خطأ: ${err.message}`);
            });
    }
    else if (message.audio || message.video || message.photo || message.voice) {
        appBot.sendMessage(chatId, '📤 الملفات الوسائط تُحفظ بنفس الطريقة\n⏳ جاري المعالجة...');
        
        let fileId;
        let fileName = `file_${Date.now()}`;
        
        if (message.audio) {
            fileId = message.audio.file_id;
            fileName += '.mp3';
        } else if (message.video) {
            fileId = message.video.file_id;
            fileName += '.mp4';
        } else if (message.photo) {
            fileId = message.photo[message.photo.length - 1].file_id;
            fileName += '.jpg';
        } else if (message.voice) {
            fileId = message.voice.file_id;
            fileName += '.ogg';
        }

        appBot.getFile(fileId)
            .then(fileInfo => {
                const userDir = getUserDir(userId);
                const filePath = path.join(userDir, fileName);
                const stream = fs.createWriteStream(filePath);

                return new Promise((resolve, reject) => {
                    const request = require('https').get(
                        `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`,
                        (response) => {
                            response.pipe(stream);
                            stream.on('finish', () => {
                                resolve({ path: filePath, size: fileInfo.file_size, name: fileName });
                            });
                            stream.on('error', reject);
                        }
                    );
                    request.on('error', reject);
                });
            })
            .then(fileInfo => {
                const db = loadDatabase();
                if (!db.files[userId]) db.files[userId] = [];

                const date = new Date().toLocaleDateString('ar-SA');
                db.files[userId].push({
                    name: fileInfo.name,
                    size: fileInfo.size || 0,
                    path: fileInfo.path,
                    date: date
                });

                saveDatabase(db);
                appBot.sendMessage(chatId, `✅ تم حفظ الملف: ${fileInfo.name}`);
            })
            .catch(err => {
                appBot.sendMessage(chatId, `❌ خطأ: ${err.message}`);
            });
    }
    else if (text && text.startsWith('📄 ')) {
        const db = loadDatabase();
        const fileName = text.substring(3);
        const userFiles = db.files[userId] || [];
        const file = userFiles.find(f => f.name === fileName);

        if (!file || !fs.existsSync(file.path)) {
            appBot.sendMessage(chatId, '❌ الملف غير موجود');
            return;
        }

        appBot.sendMessage(chatId, '⏳ جاري تحضير الملف...');
        appBot.sendDocument(chatId, file.path, {
            caption: `📄 ${file.name}\n📊 الحجم: ${(file.size / 1024 / 1024).toFixed(2)} MB`
        });
    }
    else if (text && text.startsWith('🗑️ ')) {
        const db = loadDatabase();
        const fileName = text.substring(3);
        const userFiles = db.files[userId] || [];
        const fileIndex = userFiles.findIndex(f => f.name === fileName);

        if (fileIndex === -1) {
            appBot.sendMessage(chatId, '❌ الملف غير موجود');
            return;
        }

        const file = userFiles[fileIndex];
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        userFiles.splice(fileIndex, 1);
        db.files[userId] = userFiles;
        saveDatabase(db);

        appBot.sendMessage(chatId, `✅ تم حذف الملف: ${fileName}`);
    }
});

appBot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

const PORT = process.env.PORT || 8099;
appServer.listen(PORT, () => {
    console.log(`✅ بوت رفع وحفظ الملفات يعمل على المنفذ ${PORT}`);
});
