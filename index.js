import { voiceClient } from "./client.js";
import tokens from "./tokens.js";
import express from 'express';
const app = express();
const port = 3000;
let url = "";
let uptimeDate = Date.now();
let requests = 0;
let response = null;
app.use((req, res, next) => {
    const hostname = req.hostname;
    const subdomain = hostname.split('.')[0];
    const domain = hostname.replace(`${subdomain}.`, '');
    req.subdomain = subdomain;
    req.domain = domain;
    url = `https://${subdomain}.${domain}/`;
    next();
});
app.get('/', (req, res) => res.send('Hello World!'));
app.listen(port, () => console.log(`Example app listening at ${url}`));
process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
setInterval(async () => {
    console.log(url);
    try {
        response = await fetch(url, { method: 'HEAD' });
        requests += 1;
        console.log(`Request done with status ${response.status} ${requests}`);
    } catch (error) {
        if (error.response) {
            requests += 1;
            console.log(`Response status: ${error.response.status}${requests}`);
        }
    } finally {
        response = null;
    }
}, 15000);
const cleanTokens = tokens.reduce((acc, token) => {
    const isValid = token?.token?.length > 30;
    const isDuplicate = acc.some(t => t.token === token.token);
    if (isValid && !isDuplicate) {
        acc.push(token);
    }
    else {
        console.warn('Invalid or duplicate token configuration:', token);
    }
    return acc;
}, []);
for (const token of cleanTokens) {
    const client = new voiceClient(token);
    client.on('ready', (user) => {
        console.log(`Logged in as ${user.username}#${user.discriminator}`);
    });
    client.on('connected', () => {
        console.log('Connected to Discord');
    });
    client.on('disconnected', () => {
        console.log('Disconnected from Discord');
    });
    client.on('voiceReady', () => {
        console.log('Voice is ready');
    });
    client.on('error', (error) => {
        console.error('Error:', error);
    });
    client.on('debug', (message) => {
        console.debug(message);
    });
    client.connect();
}

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// إعدادات البوت والصلاحيات
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // مهمة جداً لقراءة الأوامر في الشات
        GatewayIntentBits.GuildMembers
    ]
});

// أيدي القناة المخصصة للتاسكات (نفس الأيدي اللي كنت مستخدمه)
const TASK_CHANNEL_ID = "1535001426302861403";

client.once('ready', () => {
    console.log(`✅ تم تشغيل البوت بنجاح: ${client.user.tag}`);
});

// استقبال الأوامر والرسائل
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // أمر !task لإرسال لوحة التاسكات
    if (message.content.trim() === '!task') {
        const embed = new EmbedBuilder()
            .setTitle("نظام التاسكات الجديد")
            .setDescription("إذا سلمت التاسك، اضغط على الزر أدناه لملء البيانات المطلوبة.")
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('submit_task_btn')
                    .setLabel('تم 📥')
                    .setStyle(ButtonStyle.Success)
            );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete(); // حذف رسالة الأمر لتنظيف الشات
        } catch (error) {
            console.log("خطأ أثناء إرسال رسالة التاسك:", error);
        }
    }
});

// قراءة التوكن من ملف config.json أو من متغيرات البيئة في الهوست
const fs = require('fs');
let token = process.env.DISCORD_TOKEN;

if (!token && fs.existsSync('./config.json')) {
    const config = require('./config.json');
    token = config.token;
}

if (token) {
    client.login(token);
} else {
    console.log("❌ تنبيه: لم يتم العثور على التوكن! تأكد من إضافته في ملف config.json أو في إعدادات الهوست.");
}

