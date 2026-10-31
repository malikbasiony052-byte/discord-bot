import { voiceClient } from "./client.js";
import tokens from "./tokens.js";
import express from 'express';
import fs from 'fs';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

// إعداد سرفر الويب للحفاظ على تشغيل البوت (Express)
const app = express();
const port = 3000;
let url = "";
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
// 🤖 بوت الأوامر واللوحات الثابتة والليدربورد
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
const LEADERBOARD_CHANNEL_ID = "1563202261281144952";
const GANG_ROLE_NAME = "𓆩ɢᴛᴀ𓆪・𝐆𝐀𝐍G";

const DATA_FILE = "leaderboard_data.json";
let db = {
    "voiceTime": {},
    "resources": {},
    "vacations": {},
    "vc_message_id": null,
    "task_message_id": null,
    "vacation_message_id": null
};

if (fs.existsSync(DATA_FILE)) {
    try {
        const loadedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (typeof loadedData === 'object') Object.assign(db, loadedData);
    } catch (e) {}
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// دوال بناء ليدربورد
function buildTaskEmbed() {
    let desc = "**📋 سجل تسليم التاسك والموارد:**\n\n";
    if (!db.resources || Object.keys(db.resources).length === 0) {
        desc += "لا يوجد تسليمات مسجلة حتى الآن.";
    } else {
        for (const [ukey, val] of Object.entries(db.resources)) {
            desc += `${ukey} : ${val}\n`;
        }
    }
    return new EmbedBuilder().setTitle("📦 LEADERBOARD - TASKS").setDescription(desc).setColor(0xE67E22);
}

function buildVacationEmbed() {
    let desc = "**🌴 سجل الإجازات المقبولة:**\n\n";
    if (!db.vacations || Object.keys(db.vacations).length === 0) {
        desc += "لا توجد إجازات مقبولة حتى الآن.";
    } else {
        for (const [vkey, vval] of Object.entries(db.vacations)) {
            desc += `• ${vkey} : **{vval}**\n`;
        }
    }
    return new EmbedBuilder().setTitle("🏖️ LEADERBOARD - VACATION").setDescription(desc).setColor(0x2ECC71);
}

async function updateLeaderboardEmbeds() {
    const channel = client.channels.cache.get(LEADERBOARD_CHANNEL_ID);
    if (!channel) return;

    // تحديث تاسكات ليدربورد
    try {
        const embed = buildTaskEmbed();
        if (db.task_message_id) {
            const msg = await channel.messages.fetch(db.task_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.task_message_id = msg.id;
            saveData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildTaskEmbed()] });
        db.task_message_id = msg.id;
        saveData();
    }

    // تحديث إجازات ليدربورد
    try {
        const embed = buildVacationEmbed();
        if (db.vacation_message_id) {
            const msg = await channel.messages.fetch(db.vacation_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.vacation_message_id = msg.id;
            saveData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildVacationEmbed()] });
        db.vacation_message_id = msg.id;
        saveData();
    }
}

client.once('ready', async () => {
    console.log(`✅ البوت اشتغل بنجاح: ${client.user.tag}`);
    await updateLeaderboardEmbeds();
});

// استقبال الأوامر لتوليد الأزرار الثابتة في القنوات (SETUP PANELS)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim();

    // 1. لوحة التاسكات الثابتة
    if (content === '!setup-task') {
        const embed = new EmbedBuilder()
            .setTitle("نظام التاسكات الجديد")
            .setDescription("إذا سلمت التاسك، اضغط على الزر أدناه لملء البيانات المطلوبة.")
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('submit_task_main_btn').setLabel('تم 📥').setStyle(ButtonStyle.Success)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch (e) {}
    }

    // 2. لوحة الإجازات الثابتة
    if (content === '!setup-vacation') {
        const embed = new EmbedBuilder()
            .setTitle("🌴 نظام الإجازات - VACATION SYSTEM")
            .setDescription("الخدمة متاحة لجميع الأعضاء. اضغط على الزر أدناه لتعبئة طلب الإجازة.")
            .setColor(0xE6BE1E);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_main_vacation_app').setLabel('اضغط لتقديم الإجازة 📝').setStyle(ButtonStyle.Primary)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch (e) {}
    }

    // 3. لوحة الأسلحة الثابتة
    if (content === '!setup-weapons') {
        const embed = new EmbedBuilder()
            .setTitle("WEAPONS SYSTEM")
            .setDescription("نظام السلاح\nإذا أعطيت أو استلمت سلاح اضغط على الأزرار بالأسفل.")
            .setColor(0x2ECC71);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('persistent_btn_receive_v9').setLabel('استلمت سلاح').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('persistent_btn_give_v9').setLabel('سلمت سلاح').setStyle(ButtonStyle.Success)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch (e) {}
    }
});

// التفاعل مع الأزرار والـ Modals واعتماد الإدارة
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

        if (interaction.customId === 'approve_task_btn' || interaction.customId === 'reject_task_btn') {
            const isApprove = interaction.customId === 'approve_task_btn';
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApprove ? 0x2ECC71 : 0xE74C3C)
                .setTitle(isApprove ? "TASK APPROVED ✅" : "TASK REJECTED ❌");

            await interaction.update({ embeds: [updatedEmbed], components: [] });

            if (isApprove) {
                const userKey = `<@${interaction.user.id}>`;
                db.resources[userKey] = (db.resources[userKey] || 0) + 1;
                saveData();
                await updateLeaderboardEmbeds();
            }
        }

        if (interaction.customId === 'btn_approve_vacation' || interaction.customId === 'btn_reject_vacation') {
            const isApprove = interaction.customId === 'btn_approve_vacation';
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApprove ? 0x2ECC71 : 0xE74C3C)
                .setTitle(isApprove ? "🌴 تم قبول الإجازة" : "❌ تم رفض الإجازة");

            await interaction.update({ embeds: [updatedEmbed], components: [] });

            if (isApprove) {
                const userKey = `<@${interaction.user.id}>`;
                db.vacations[userKey] = "مقبولة";
                saveData();
                await updateLeaderboardEmbeds();
            }
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

            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('approve_task_btn').setLabel('نعم سلم التاسك').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reject_task_btn').setLabel('لا لم يسلم التاسك').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ content: `📢 **إثبات تسليم من ${interaction.user} يتطلب مراجعة الإدارة:**`, embeds: [embed], components: [adminRow] });
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

            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_approve_vacation').setLabel('موافقة الإجازة ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reject_vacation').setLabel('رفض الإجازة ❌').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ content: `📣 **طلب إجازة جديد من ${interaction.user}:**`, embeds: [embed], components: [adminRow] });
        }
    }
});

// تسجيل الدخول للبوت
import tokensList from "./tokens.js";
let botToken = process.env.DISCORD_TOKEN;
if (!botToken && tokensList && tokensList.length > 0) {
    botToken = tokensList[0].token;
}

if (botToken) {
    client.login(botToken);
} else {
    console.log("❌ تنبيه: لم يتم العثور على التوكن الخاص بالبوت!");
}
