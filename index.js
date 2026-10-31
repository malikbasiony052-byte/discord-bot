import { voiceClient } from "./client.js";
import tokens from "./tokens.js";
import express from 'express';
import fs from 'fs';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

// إعداد سرفر الويب للحفاظ على تشغيل البوت (Express)
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

// تشغيل فويس كلينت (Voice Clients)
const cleanTokens = tokens.reduce((acc, token) => {
    const isValid = token?.token?.length > 30;
    const isDuplicate = acc.some(t => t.token === token.token);
    if (isValid && !isDuplicate) {
        acc.push(token);
    } else {
        console.warn('Invalid or duplicate token configuration:', token);
    }
    return acc;
}, []);

for (const tokenConfig of cleanTokens) {
    const vClient = new voiceClient(tokenConfig);
    vClient.on('ready', (user) => {
        console.log(`Logged in as ${user.username}#${user.discriminator}`);
    });
    vClient.on('connected', () => {
        console.log('Connected to Discord');
    });
    vClient.on('disconnected', () => {
        console.log('Disconnected from Discord');
    });
    vClient.on('voiceReady', () => {
        console.log('Voice is ready');
    });
    vClient.on('error', (error) => {
        console.error('Error:', error);
    });
    vClient.on('debug', (message) => {
        console.debug(message);
    });
    vClient.connect();
}

// ==========================================
// 🤖 بوت الأوامر والتاسكات والإجازات والأسلحة
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const TASK_LOG_CHANNEL_ID = "1535001426302861403";
const VACATION_LOG_CHANNEL_ID = "1552576612648624148";
const GANG_ROLE_NAME = "𓆩ɢᴛᴀ𓆪・𝐆𝐀𝐍G";

client.once('ready', () => {
    console.log(`✅ بوت الأوامر والتاسكات اشتغل بنجاح: ${client.user.tag}`);
});

// استقبال الأوامر بالشات
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim();

    // 1. أمر التاسك
    if (content === '!task' || content === '!تاسك') {
        const embed = new EmbedBuilder()
            .setTitle("نظام التاسكات الجديد")
            .setDescription("إذا سلمت التاسك، اضغط على الزر أدناه لملء البيانات المطلوبة.")
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('submit_task_main_btn')
                .setLabel('تم 📥')
                .setStyle(ButtonStyle.Success)
        );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete();
        } catch (error) {
            console.log("خطأ في إرسال التاسك:", error);
        }
    }

    // 2. أمر الإجازات
    if (content === '!vacation' || content === '!إجازة' || content === '!اجازه') {
        const embed = new EmbedBuilder()
            .setTitle("🌴 نظام الإجازات - VACATION SYSTEM")
            .setDescription("الخدمة متاحة لجميع الأعضاء. اضغط على الزر أدناه لتعبئة طلب الإجازة.")
            .setColor(0xE6BE1E);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_main_vacation_app')
                .setLabel('اضغط لتقديم الإجازة 📝')
                .setStyle(ButtonStyle.Primary)
        );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete();
        } catch (error) {
            console.log("خطأ في إرسال الإجازة:", error);
        }
    }

    // 3. أمر الأسلحة
    if (content === '!weapons-panel') {
        const embed = new EmbedBuilder()
            .setTitle("WEAPONS SYSTEM")
            .setDescription("نظام السلاح\nإذا أعطيت أو استلمت سلاح اضغط على الأزرار بالأسفل.")
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('persistent_btn_receive_v9')
                .setLabel('استلمت سلاح')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('persistent_btn_give_v9')
                .setLabel('سلمت سلاح')
                .setStyle(ButtonStyle.Success)
        );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
            await message.delete();
        } catch (error) {
            console.log("خطأ في إرسال الأسلحة:", error);
        }
    }
});

// التعامل مع الأزرار والـ Modals
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'submit_task_main_btn') {
            const modal = new ModalBuilder().setCustomId('task_delivery_modal').setTitle('تسليم التاسك');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_name').setLabel('الاسم :').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_resources').setLabel('الموارد :').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_money').setLabel('الفلوس :').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_delivered_to').setLabel('سلمت لمين :').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_main_vacation_app') {
            const modal = new ModalBuilder().setCustomId('vacation_modal').setTitle('تقديم طلب إجازة');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_name').setLabel('الاسم:').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_duration').setLabel('مدة الإجازة (بالأيام):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_reason').setLabel('سبب الإجازة:').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'persistent_btn_receive_v9' || interaction.customId === 'persistent_btn_give_v9') {
            const isGive = interaction.customId === 'persistent_btn_give_v9';
            const modal = new ModalBuilder().setCustomId(isGive ? 'weapon_give_modal' : 'weapon_receive_modal').setTitle(isGive ? 'سلمت سلاح' : 'استلمت سلاح');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_target').setLabel('الشخص (منشن أو اسمه):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_details').setLabel('التفاصيل :').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'task_delivery_modal') {
            const name = interaction.fields.getTextInputValue('task_name');
            const resources = interaction.fields.getTextInputValue('task_resources') || 'لا يوجد';
            const money = interaction.fields.getTextInputValue('task_money') || 'لا يوجد';
            const deliveredTo = interaction.fields.getTextInputValue('task_delivered_to');

            await interaction.reply({ content: "✅ تم إرسال إثبات تسليم التاسك للإدارة بنجاح!", ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(TASK_LOG_CHANNEL_ID) || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle("📥 إثبات تسليم جديد تحت المراجعة")
                .setDescription(`👤 **العضو:** ${interaction.user}\n👤 **الاسم:** ${name}\n🎒 **الموارد:** \`${resources}\`\n💰 **الفلوس:** \`${money}\`\n🤝 **سلمت لمين:** \`${deliveredTo}\``)
                .setColor(0xF1C40F);

            await logChannel.send({ content: `📢 **إثبات تسليم من ${interaction.user} يتطلب مراجعة الإدارة:**`, embeds: [embed] });
        }

        if (interaction.customId === 'vacation_modal') {
            const name = interaction.fields.getTextInputValue('vacation_name');
            const duration = interaction.fields.getTextInputValue('vacation_duration');
            const reason = interaction.fields.getTextInputValue('vacation_reason');

            await interaction.reply({ content: "✅ تم إرسال طلبك بنجاح وهو قيد المراجعة!", ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(VACATION_LOG_CHANNEL_ID) || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle("📣 طلب إجازة جديد")
                .setDescription(`👤 **العضو:** ${interaction.user}\n📝 **الاسم:** ${name}\n📅 **المدة:** ${duration}\n💬 **السبب:** ${reason}`)
                .setColor(0xE6BE1E);

            await logChannel.send({ content: `📣 **طلب إجازة جديد من ${interaction.user}:**`, embeds: [embed] });
        }
    }
});

// تشغيل بوت الأوامر بنفس التوكن الموجود في tokens.js أو process.env
import tokensList from "./tokens.js";
let botToken = process.env.DISCORD_TOKEN;
if (!botToken && tokensList && tokensList.length > 0) {
    botToken = tokensList[0].token;
}

if (botToken) {
    client.login(botToken);
} else {
    console.log("❌ تنبيه: لم يتم العثور على التوكن الخاص ببوت الأوامر!");
}
