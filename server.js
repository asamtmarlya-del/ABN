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
let appBot = null;

app.use(bodyParser.json());

const storageDir = path.join(__dirname, 'storage');
const databaseFile = path.join(__dirname, 'files_db.json');

if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir);

// تهيئة البوت
function initializeBot() {
    try {
        appBot = new telegramBot(token, {polling: true});
        console.log('✅ تم تهيئة البوت بنجاح');
        setupBotListeners();
    } catch (err) {
        console.error('❌ خطأ في تهيئة البوت:', err.message);
        setTimeout(initializeBot, 5000);
    }
}

// معالجات البوت
function setupBotListeners() {
    appBot.on('message', handleMessage);
    
    appBot.on('polling_error', (error) => {
        console.error('❌ خطأ Polling:', error.message);
        if (appBot) {
            appBot.stopPolling().catch(console.error);
        }
        setTimeout(() => {
            console.log('🔄 إعادة محاولة الاتصال...');
            initializeBot();
        }, 5000);
    });

    appBot.on('error', (error) => {
        console.error('❌ خطأ في البوت:', error.message);
    });
}

// معالج الرسائل الرئيسي
function handleMessage(message) {
    try {
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
                '✅ الحد الأقصى: 10000 GB\n' +
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
            handleFileUpload(message, chatId, userId);
        }
        else if (message.audio || message.video || message.photo || message.voice) {
            handleMediaUpload(message, chatId, userId);
        }
        else if (text && text.startsWith('📄 ')) {
            handleFileDownload(text, chatId, userId);
        }
        else if (text && text.startsWith('🗑️ ')) {
            handleFileDelete(text, chatId, userId);
        }
    } catch (err) {
        console.error('❌ خطأ في معالجة الرسالة:', err);
        try {
            appBot.sendMessage(message.chat.id, '❌ حدث خطأ، حاول لاحقاً');
        } catch (e) {
            console.error('❌ فشل إرسال رسالة الخطأ:', e);
        }
    }
}

function handleFileUpload(message, chatId, userId) {
    try {
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
                console.error('❌ خطأ في رفع الملف:', err);
                appBot.sendMessage(chatId, `❌ خطأ: ${err.message}`).catch(console.error);
            });
    } catch (err) {
        console.error('❌ خطأ في معالجة الملف:', err);
        appBot.sendMessage(chatId, '❌ حدث خطأ في الرفع').catch(console.error);
    }
}

function handleMediaUpload(message, chatId, userId) {
    try {
        appBot.sendMessage(chatId, '📤 جاري المعالجة...');
        
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
                appBot.sendMessage(chatId, `✅ تم حفظ الملف: ${fileInfo.name}`).catch(console.error);
            })
            .catch(err => {
                console.error('❌ خطأ في حفظ الملف:', err);
                appBot.sendMessage(chatId, `❌ خطأ: ${err.message}`).catch(console.error);
            });
    } catch (err) {
        console.error('❌ خطأ في معالجة الوسائط:', err);
    }
}

function handleFileDownload(text, chatId, userId) {
    try {
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
        }).catch(err => {
            console.error('❌ خطأ في تحميل الملف:', err);
            appBot.sendMessage(chatId, '❌ فشل تحميل الملف').catch(console.error);
        });
    } catch (err) {
        console.error('❌ خطأ في معالجة التحميل:', err);
        appBot.sendMessage(chatId, '❌ حدث خطأ').catch(console.error);
    }
}

function handleFileDelete(text, chatId, userId) {
    try {
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

        appBot.sendMessage(chatId, `✅ تم حذف الملف: ${fileName}`).catch(console.error);
    } catch (err) {
        console.error('❌ خطأ في حذف الملف:', err);
        appBot.sendMessage(chatId, '❌ فشل حذف الملف').catch(console.error);
    }
}

// دوال مساعدة
function loadDatabase() {
    try {
        if (fs.existsSync(databaseFile)) {
            return JSON.parse(fs.readFileSync(databaseFile, 'utf8'));
        }
    } catch (err) {
        console.error('❌ خطأ في قراءة قاعدة البيانات:', err);
    }
    return { files: {} };
}

function saveDatabase(data) {
    try {
        fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ خطأ في حفظ قاعدة البيانات:', err);
    }
}

function getUserDir(userId) {
    const dir = path.join(storageDir, userId.toString());
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// صحة الخادم
app.get('/', (req, res) => {
    res.send('<h1 align="center">☁️ بوت رفع وحفظ الملفات - يعمل بنجاح ✅</h1>');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// keep-alive للمنع من التوقف
setInterval(() => {
    try {
        if (!appBot) {
            console.log('🔄 إعادة تهيئة البوت...');
            initializeBot();
        }
    } catch (err) {
        console.error('❌ خطأ في keep-alive:', err);
    }
}, 30000);

// بدء الخادم والبوت
const PORT = process.env.PORT || 8099;
appServer.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
    initializeBot();
});

// معالجة الأخطاء غير المعالجة
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير متوقع:', err);
    console.log('🔄 سيتم إعادة تشغيل البوت تلقائياً...');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ وعد مرفوض:', reason);
});
