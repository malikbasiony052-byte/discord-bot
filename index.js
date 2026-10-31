import { voiceClient } from "./client.js";
import tokens from "./tokens.js";
import express from 'express';
import fs from 'fs';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';

// ==========================================
// 🌐 إعداد سيرفر الويب للحفاظ على تشغيل البوت (Express)
// ==========================================
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
    } catch (error) {
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
    }
    return acc;
}, []);

for (const tokenConfig of cleanTokens) {
    const vClient = new voiceClient(tokenConfig);
    vClient.connect();
}

// ==========================================
// 🤖 العميل الرئيسي الموحد لجميع أنظمة ديسكورد
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// المعرفات والثوابت المشتركة
const TASK_LOG_CHANNEL_ID = "1535001426302861403";
const VACATION_LOG_CHANNEL_ID = "1552576612648624148";
const LEADERBOARD_CHANNEL_ID = "1563202261281144952";
const ALLOWED_ROLE_ID = 1283928161805140022;

// ملفات البيانات
const DATA_FILE = "tablets_data.json";
const STOCK_FILE = "tablets_stock.json";
const MSG_TRACKER_FILE = "show_msg_tracker.json";
const LEADERBOARD_DATA_FILE = "leaderboard_data.json";
const WARNINGS_FILE = "warnings_data.json";
const STORAGE_FILE = "storage_data.json";
const STORAGE_INVOICES_FILE = "storage_invoices.json";

// قوائم وأسماء التابلت المحدثة
const MEMBERS_LIST = [
    "النمر", "شناوي", "كيموز", "جنزوري", "بسيوني", 
    "منفاخ", "فرفشة", "شبح", "زياد شاهين", "السيد شحاتة", 
    "نوفير", "ديشا", "الشاطر", "ابو هاني", "يوسف المصري", 
    "اورتيجا", "موزا", "مورا", "جوكس الونش", "ايجو", "السيوفي"
];

const DEFAULT_STOCK = {
    "TABLET CHOP SHOP": 4,
    "TABLETS HOUSES": 12,
    "TABLET ROBBERY": 0,
    "LAPTOP BOOSTING": 0,
    "TABLET GANGS": 0
};

// تحميل وإدارة بيانات التابلت والتحذيرات والمخزون
function loadTabletsData() {
    if (fs.existsSync(DATA_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            let res = {};
            for (let name of MEMBERS_LIST) {
                res[name] = saved[name] || "❌ لا يوجد";
            }
            return res;
        } catch (e) {}
    }
    let res = {};
    for (let name of MEMBERS_LIST) res[name] = "❌ لا يوجد";
    return res;
}

function saveTabletsData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(tablets_data, null, 4), 'utf8');
    } catch (e) {}
}

function loadStock() {
    if (fs.existsSync(STOCK_FILE)) {
        try {
            const saved = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
            for (let k in DEFAULT_STOCK) {
                if (!(k in saved)) saved[k] = DEFAULT_STOCK[k];
            }
            return saved;
        } catch (e) {}
    }
    return { ...DEFAULT_STOCK };
}

function saveStock() {
    try {
        fs.writeFileSync(STOCK_FILE, JSON.stringify(stock_data, null, 4), 'utf8');
    } catch (e) {}
}

function loadShowTracker() {
    if (fs.existsSync(MSG_TRACKER_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(MSG_TRACKER_FILE, 'utf8'));
        } catch (e) {}
    }
    return {};
}

function saveShowTracker(channel_id, message_id) {
    try {
        fs.writeFileSync(MSG_TRACKER_FILE, JSON.stringify({ channel_id, message_id }), 'utf8');
    } catch (e) {}
}

let tablets_data = loadTabletsData();
let stock_data = loadStock();

let db = {
    "voiceTime": {},
    "resources": {},
    "vacations": {},
    "vc_message_id": null,
    "task_message_id": null,
    "vacation_message_id": null
};

if (fs.existsSync(LEADERBOARD_DATA_FILE)) {
    try {
        const loadedData = JSON.parse(fs.readFileSync(LEADERBOARD_DATA_FILE, 'utf8'));
        if (typeof loadedData === 'object') Object.assign(db, loadedData);
    } catch (e) {}
}

function saveLeaderboardData() {
    fs.writeFileSync(LEADERBOARD_DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// بيانات مخزون العيلة (STORAGE)
let storage_items = {};
if (fs.existsSync(STORAGE_FILE)) {
    try {
        storage_items = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    } catch (e) {}
}
function saveStorageItems() {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage_items, null, 2), 'utf8');
}

let storage_invoices = {};
if (fs.existsSync(STORAGE_INVOICES_FILE)) {
    try {
        storage_invoices = JSON.parse(fs.readFileSync(STORAGE_INVOICES_FILE, 'utf8'));
    } catch (e) {}
}
function saveStorageInvoices() {
    fs.writeFileSync(STORAGE_INVOICES_FILE, JSON.stringify(storage_invoices, null, 2), 'utf8');
}

function buildStorageEmbed() {
    let desc = "";
    if (Object.keys(storage_items).length === 0) {
        desc = "المخزون فارغ حالياً.";
    } else {
        for (let [item, qty] of Object.entries(storage_items)) {
            desc += `• **${item}** : \`${qty}\`\n`;
        }
    }
    return new EmbedBuilder()
        .setTitle("مخزون العيلة _ xXx SYSTEM")
        .setDescription(`**المخزون الحالي :**\n\n${desc}`)
        .setColor(0x3498DB)
        .setTimestamp();
}

function parseChangeInput(current_val, input_str) {
    if (!input_str || !input_str.trim()) return current_val;
    let text = input_str.trim();
    let numbers = text.match(/\d+/g);
    if (!numbers) return current_val;
    let num = parseInt(numbers[0]);
    if (text.includes("إزالة") || text.includes("خصم") || text.includes("طرح") || text.startsWith("-")) {
        return Math.max(0, current_val - num);
    } else if (text.includes("إضافة") || text.includes("زود") || text.includes("زيادة") || text.startsWith("+")) {
        return current_val + num;
    } else {
        return num;
    }
}

function buildShowEmbed() {
    let embed = new EmbedBuilder()
        .setTitle("TABLETS SYSTEM _ نظام التابلت")
        .setColor(0x5865F2)
        .setDescription(
            `**TABLETS CHOP SHOP** : ${stock_data["TABLETS CHOP SHOP"] || 0}\n` +
            `**TABLETS HOUSES** : ${stock_data["TABLETS HOUSES"] || 0}\n` +
            `**TABLET ROBBERY** : ${stock_data["TABLET ROBBERY"] || 0}\n` +
            `**LAPTOP BOOSTING** : ${stock_data["LAPTOP BOOSTING"] || 0}\n` +
            `**TABLET GANGS** : ${stock_data["TABLET GANGS"] || 0}\n\n` +
            `📱 **التابلت الحالية:**\n\n`
        );
    
    let active_holders = [];
    for (let [name, status] of Object.entries(tablets_data)) {
        if (status !== "❌ لا يوجد") {
            active_holders.push(`👤 **${name}** : ${status}`);
        }
    }
    
    if (active_holders.length > 0) {
        embed.setDescription(embed.data.description + active_holders.join('\n'));
    } else {
        embed.setDescription(embed.data.description + "لا يوجد أحد يحمل تابلت حالياً.");
    }
    embed.setFooter({ text: "xXx TABLETS SYSTEM", iconURL: client.user?.displayAvatarURL() });
    return embed;
}

function buildTabletsLeaderboardEmbed() {
    let description_text = "### 📊 قائمة الاستحواذ الحالية على التابلت:\n\n";
    for (let name of MEMBERS_LIST) {
        let status = tablets_data[name] || "❌ لا يوجد";
        description_text += `👤 **${name}** : ${status}\n`;
    }
    description_text += "\n─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───\n";
    description_text += "👇 **اختر اسم العضو لتسجيل التابلت له (أو الضغط على نفس التابلت لإرجاعه):**";

    return new EmbedBuilder()
        .setTitle("📱 نظام التابلت - xXx TABLETS SYSTEM")
        .setDescription(description_text)
        .setColor(0x2B2D31)
        .setFooter({ text: "xXx TABLETS SYSTEM • Role Authorized Verification", iconURL: client.user?.displayAvatarURL() });
}

async function updateLiveShowMessage() {
    let tracker = loadShowTracker();
    if (!tracker.channel_id || !tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildShowEmbed()], components: [showPanelRow()] });
            }
        }
    } catch (e) {}
}

function showPanelRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("btn_show_change_modal_v2").setLabel("تغيير").setStyle(ButtonStyle.Primary)
    );
}

function checkTabletPermissions(interaction) {
    let user = interaction.member;
    let has_allowed_role = user && user.roles.cache.has(ALLOWED_ROLE_ID.toString());
    let is_admin = user && user.permissions.has('Administrator');
    return has_allowed_role || is_admin;
}

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
            desc += `• ${vkey} : **${vval}**\n`;
        }
    }
    return new EmbedBuilder().setTitle("🏖️ LEADERBOARD - VACATION").setDescription(desc).setColor(0x2ECC71);
}

async function updateLeaderboardEmbeds() {
    const channel = client.channels.cache.get(LEADERBOARD_CHANNEL_ID);
    if (!channel) return;

    try {
        const embed = buildTaskEmbed();
        if (db.task_message_id) {
            const msg = await channel.messages.fetch(db.task_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.task_message_id = msg.id;
            saveLeaderboardData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildTaskEmbed()] });
        db.task_message_id = msg.id;
        saveLeaderboardData();
    }

    try {
        const embed = buildVacationEmbed();
        if (db.vacation_message_id) {
            const msg = await channel.messages.fetch(db.vacation_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.vacation_message_id = msg.id;
            saveLeaderboardData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildVacationEmbed()] });
        db.vacation_message_id = msg.id;
        saveLeaderboardData();
    }
}

client.once('ready', async () => {
    console.log(`✅ البوت الموحد اشتغل بنجاح: ${client.user.tag}`);
    await updateLeaderboardEmbeds();
});

// استقبال الأوامر بالشات
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

    // 4. لوحة الورنات
    if (content === '!setup-warn') {
        const embed = new EmbedBuilder()
            .setTitle("⚠️ WARNING SYSTEM - نظام التحذيرات")
            .setDescription("اضغط على الزر أدناه لإعطاء تحذير أو إنذار لعضو.")
            .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_give_warn_main').setLabel('إعطاء تحذير ⚠️').setStyle(ButtonStyle.Danger)
        );
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch (e) {}
    }

    // 5. لوحة تخزين العيلة (STORAGE SYSTEM) بزرارين فقط (الصنف، الفاتورة)
    if (content === '!setup-storage') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_storage_item').setLabel('الصنف').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_storage_invoice').setLabel('الفاتورة').setStyle(ButtonStyle.Success)
        );
        await message.channel.send({ embeds: [buildStorageEmbed()], components: [row] });
        try { await message.delete(); } catch (e) {}
    }

    // 6. أوامر التابلت
    if (content === '!show' || content === 'عرض' || content === 'الرسالة') {
        let msg = await message.channel.send({ embeds: [buildShowEmbed()], components: [new ShowPanelView()] });
        saveShowTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!tablets' || content === 'تابلت' || content === 'التابلت') {
        let row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_tb_robbery_v20').setLabel('خدت TABLET ROBBERY').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_tb_chopshop_v20').setLabel('خدت TABLET CHOP SHOP 🟠').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_tb_boosting_v20').setLabel('خدت LAPTOP Boosting').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_tb_house_v20').setLabel('خدت HOUSE TABLET').setStyle(ButtonStyle.Success)
        );
        let row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_tb_gangs_v20').setLabel('خدت TABLET GANGS ⚪').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_tb_reset_v20').setLabel('🔄 تصفير القائمة (للإدارة)').setStyle(ButtonStyle.Secondary)
        );
        await message.channel.send({ embeds: [buildTabletsLeaderboardEmbed()], components: [row1, row2] });
        try { await message.delete(); } catch (e) {}
    }
});

// التعامل مع التفاعلات والأزرار
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const cid = interaction.customId;

        if (cid === 'submit_task_main_btn') {
            const modal = new ModalBuilder().setCustomId('task_delivery_modal').setTitle('تسليم التاسك');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_name').setLabel('الاسم :').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_resources').setLabel('الموارد :').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_money').setLabel('الفلوس :').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('task_delivered_to').setLabel('سلمت لمين :').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'btn_main_vacation_app') {
            const modal = new ModalBuilder().setCustomId('vacation_modal').setTitle('تقديم طلب إجازة');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_name').setLabel('الاسم:').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_duration').setLabel('مدة الإجازة (بالأيام):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('vacation_reason').setLabel('سبب الإجازة:').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'persistent_btn_receive_v9' || cid === 'persistent_btn_give_v9') {
            const isGive = cid === 'persistent_btn_give_v9';
            const modal = new ModalBuilder().setCustomId(isGive ? 'weapon_give_modal' : 'weapon_receive_modal').setTitle(isGive ? 'سلمت سلاح' : 'استلمت سلاح');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_target').setLabel('الشخص (منشن أو اسمه):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_details').setLabel('التفاصيل :').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'btn_give_warn_main') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة فقط.", ephemeral: true });
                return;
            }
            const modal = new ModalBuilder().setCustomId('warn_submit_modal').setTitle('إعطاء تحذير');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('warn_target').setLabel('منشن العضو أو اسمه/ID:').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('warn_reason').setLabel('سبب التحذير:').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        // تفاعلات بوت STORAGE (زر الصنف وزر الفاتورة)
        if (cid === 'btn_storage_item') {
            let select = new StringSelectMenuBuilder()
                .setCustomId('storage_item_action_select')
                .setPlaceholder('اختر الإجراء المطلوبة للصنف...')
                .addOptions([
                    { label: 'إضافة صنف', value: 'add_item', emoji: '➕' },
                    { label: 'إزالة صنف', value: 'remove_item', emoji: '➖' }
                ]);
            await interaction.reply({ content: 'اختر إجراء الصنف:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'btn_storage_invoice') {
            let select = new StringSelectMenuBuilder()
                .setCustomId('storage_invoice_action_select')
                .setPlaceholder('اختر إجراء الفاتورة...')
                .addOptions([
                    { label: 'طباعة فاتورة ل شخص', value: 'print_invoice', emoji: '🖨️' },
                    { label: 'إزالة فاتورة', value: 'remove_invoice', emoji: '🗑️' }
                ]);
            await interaction.reply({ content: 'اختر إجراء الفاتورة:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'approve_task_btn' || cid === 'reject_task_btn') {
            const isApprove = cid === 'approve_task_btn';
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApprove ? 0x2ECC71 : 0xE74C3C)
                .setTitle(isApprove ? "TASK APPROVED ✅" : "لا لم يسلم الموارد");

            await interaction.update({ embeds: [updatedEmbed], components: [] });

            if (isApprove) {
                const userKey = `<@${interaction.user.id}>`;
                db.resources[userKey] = (db.resources[userKey] || 0) + 1;
                saveLeaderboardData();
                await updateLeaderboardEmbeds();
            }
        }

        if (cid === 'btn_approve_vacation' || cid === 'btn_reject_vacation') {
            const isApprove = cid === 'btn_approve_vacation';
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApprove ? 0x2ECC71 : 0xE74C3C)
                .setTitle(isApprove ? "🌴 تم قبول الإجازة" : "❌ تم رفض الإجازة");

            await interaction.update({ embeds: [updatedEmbed], components: [] });

            if (isApprove) {
                const userKey = `<@${interaction.user.id}>`;
                db.vacations[userKey] = "مقبولة";
                saveLeaderboardData();
                await updateLeaderboardEmbeds();
            }
        }

        if (cid === 'btn_show_change_modal_v2') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للرتب المصرح لها فقط.", ephemeral: true });
                return;
            }
            let modal = new ModalBuilder().setCustomId('change_stock_modal_custom').setTitle('تقديم طلب تغيير');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('robbery_input').setLabel('TABLET ROBBERY').setValue(String(stock_data["TABLET ROBBERY"] || 0)).setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('chopshop_input').setLabel('TABLETS CHOP SHOP').setValue(String(stock_data["TABLETS CHOP SHOP"] || 0)).setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('houses_input').setLabel('TABLETS HOUSES').setValue(String(stock_data["TABLETS HOUSES"] || 0)).setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('boosting_input').setLabel('LAPTOP BOOSTING').setValue(String(stock_data["LAPTOP BOOSTING"] || 0)).setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gangs_input').setLabel('TABLET GANGS').setValue(String(stock_data["TABLET GANGS"] || 0)).setStyle(TextInputStyle.Short).setRequired(false))
            );
            await interaction.showModal(modal);
        }

        let tabletMap = {
            'btn_tb_robbery_v20': ["TABLET ROBBERY", "🔴"],
            'btn_tb_chopshop_v20': ["TABLET CHOP SHOP", "🟠"],
            'btn_tb_boosting_v20': ["LAPTOP Boosting", "🟣"],
            'btn_tb_house_v20': ["HOUSE TABLET", "🟢"],
            'btn_tb_gangs_v20': ["TABLET GANGS", "⚪"]
        };

        if (tabletMap[cid]) {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص لأصحاب الرتبة المصرح لها فقط.", ephemeral: true });
                return;
            }
            let [tName, tEmoji] = tabletMap[cid];
            let selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`tablet_select_${cid}`)
                .setPlaceholder('اختر اسم الشخص لتحديث جهازه...')
                .addOptions(MEMBERS_LIST.map(name => ({ label: name, value: name, emoji: "👤" })));

            await interaction.reply({
                content: `اختر اسم الشخص لتحديث status **${tName}**[cite: 12]:`,
                components: [new ActionRowBuilder().addComponents(selectMenu)],
                ephemeral: true
            });
        }

        if (cid === 'btn_tb_reset_v20') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للرتب المصرح لها فقط.", ephemeral: true });
                return;
            }
            for (let name of MEMBERS_LIST) tablets_data[name] = "❌ لا يوجد";
            saveTabletsData();
            await interaction.message.edit({ embeds: [buildTabletsLeaderboardEmbed()] });
            await updateLiveShowMessage();
            await interaction.reply({ content: "🔄 تم تصفير جميع التابلت بنجاح!", ephemeral: true });
        }
    }

    // القوائم المنسدلة (Select Menus)
    if (interaction.isStringSelectMenu()) {
        let cid = interaction.customId;

        if (cid === 'storage_item_action_select') {
            let choice = interaction.values[0];
            if (choice === 'add_item') {
                let modal = new ModalBuilder().setCustomId('storage_add_item_modal').setTitle('إضافة صنف للمخزون');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel('اسم الصنف :').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_qty').setLabel('كمية الصنف :').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
            } else if (choice === 'remove_item') {
                let modal = new ModalBuilder().setCustomId('storage_remove_item_modal').setTitle('إزالة صنف من المخزون');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel('اسم الصنف الذي تريد حذفه :').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }

        if (cid === 'storage_invoice_action_select') {
            let choice = interaction.values[0];
            if (choice === 'print_invoice') {
                let modal = new ModalBuilder().setCustomId('storage_print_invoice_modal').setTitle('طباعة فاتورة');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('person_name').setLabel('اسم الشخص :').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('invoice_details').setLabel('ماذا استلم الشخص :').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                await interaction.showModal(modal);
            } else if (choice === 'remove_invoice') {
                // إظهار قائمة منسدلة بجميع أعضاء السيرفر لإزالة فاتورتهم
                let members = await interaction.guild.members.fetch();
                let options = members.map(m => ({ label: m.displayName.substring(0, 25), value: m.id, emoji: '👤' })).slice(0, 25);
                
                let select = new StringSelectMenuBuilder()
                    .setCustomId('storage_remove_invoice_select')
                    .setPlaceholder('اختر الشخص لإزالة فواتيره...')
                    .addOptions(options);

                await interaction.reply({ content: 'اختر العضو المراد حذف فاتورته:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
            }
        }

        if (cid === 'storage_remove_invoice_select') {
            let targetId = interaction.values[0];
            delete storage_invoices[targetId];
            saveStorageInvoices();
            await interaction.update({ content: `🗑️ تم إزالة فواتير العضو بنجاح!`, components: [] });
        }

        let mapping = {
            'tablet_select_btn_tb_robbery_v20': ["TABLET ROBBERY", "🔴"],
            'tablet_select_btn_tb_chopshop_v20': ["TABLET CHOP SHOP", "🟠"],
            'tablet_select_btn_tb_boosting_v20': ["LAPTOP Boosting", "🟣"],
            'tablet_select_btn_tb_house_v20': ["HOUSE TABLET", "🟢"],
            'tablet_select_btn_tb_gangs_v20': ["TABLET GANGS", "⚪"]
        };

        if (mapping[cid]) {
            let [tablet_name, emoji] = mapping[cid];
            let selected_name = interaction.values[0];
            let item_entry = `${emoji} **${tablet_name}**`;
            let current_status = tablets_data[selected_name] || "❌ لا يوجد";

            let items_list = current_status === "❌ لا يوجد" ? [] : current_status.split(" - ").map(x => x.trim()).filter(Boolean);

            let msg = "";
            if (items_list.includes(item_entry)) {
                items_list = items_list.filter(x => x !== item_entry);
                msg = `🔴 تم إرجاع **${tablet_name}** من **${selected_name}**!`;
            } else {
                items_list.push(item_entry);
                msg = `✅ تم إضافة **${tablet_name}** لـ **${selected_name}** بنجاح!`;
            }

            tablets_data[selected_name] = items_list.length > 0 ? items_list.join(" - ") : "❌ لا يوجد";
            saveTabletsData();

            await updateLiveShowMessage();
            await interaction.update({ content: msg, components: [] });
        }
    }

    // النماذج (Modals)
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
                .setDescription(`👤 **العضو:** ${interaction.user}\n🆔 **ID:** \`${interaction.user.id}\`\n\n👤 **الاسم:** ${name}\n🎒 **الموارد:** \`${resources}\`\n💰 **الفلوس:** \`${money}\`\n🤝 **سلمت لمين:** \`${deliveredTo}\``)
                .setColor(0xF1C40F)
                .setThumbnail(interaction.user.displayAvatarURL());

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

            await interaction.reply({ content: "✅ تم إرسال طلب إجازتك وهو قيد المراجعة!", ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(VACATION_LOG_CHANNEL_ID) || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle("🌴 طلب إجازة جديد تحت المراجعة")
                .setDescription(`👤 **العضو:** ${interaction.user}\n🆔 **ID:** \`${interaction.user.id}\`\n\n📝 **الاسم:** ${name}\n📅 **مدة الإجازة:** ${duration}\n💬 **السبب:** ${reason}`)
                .setColor(0xF1C40F)
                .setThumbnail(interaction.user.displayAvatarURL());

            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_approve_vacation').setLabel('موافقة الإجازة ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reject_vacation').setLabel('رفض الإجازة ❌').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ content: `📣 **طلب إجازة جديد من ${interaction.user}:**`, embeds: [embed], components: [adminRow] });
        }

        // مودال إضافة صنف للمخزون
        if (interaction.customId === 'storage_add_item_modal') {
            let itemName = interaction.fields.getTextInputValue('item_name');
            let itemQty = parseInt(interaction.fields.getTextInputValue('item_qty')) || 0;
            storage_items[itemName] = (storage_items[itemName] || 0) + itemQty;
            saveStorageItems();
            await interaction.reply({ content: `✅ تم إضافة الصنف (${itemName}) بالكمية (${itemQty}) بنجاح!`, ephemeral: true });
        }

        // مودال إزالة صنف من المخزون
        if (interaction.customId === 'storage_remove_item_modal') {
            let itemName = interaction.fields.getTextInputValue('item_name');
            if (storage_items[itemName]) {
                delete storage_items[itemName];
                saveStorageItems();
                await interaction.reply({ content: `🗑️ تم حذف الصنف (${itemName}) من المخزون بنجاح!`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ هذا الصنف غير موجود في المخزون!`, ephemeral: true });
            }
        }

        // مودال طباعة الفاتورة (Embed أزرق يوحي بأن الشخص استلم شيء)
        if (interaction.customId === 'storage_print_invoice_modal') {
            let personName = interaction.fields.getTextInputValue('person_name');
            let invoiceDetails = interaction.fields.getTextInputValue('invoice_details');

            storage_invoices[interaction.user.id] = { personName, invoiceDetails };
            saveStorageInvoices();

            await interaction.reply({ content: `🖨️ تم طباعة وإرسال الفاتورة بنجاح!`, ephemeral: true });

            let embed = new EmbedBuilder()
                .setTitle("🧾 فاتورة استلام مخزون عائلة _ STORAGE INVOICE")
                .setDescription(`👤 **الشخص المستلم:** ${personName}\n📦 **ما تم استلامه:**\n\`\`\`text\n${invoiceDetails}\n\`\`\`\n👑 **بواسطة:** ${interaction.user}`)
                .setColor(0x3498DB)
                .setTimestamp();

            await interaction.channel.send({ embeds: [embed] });
        }

        if (interaction.customId === 'warn_submit_modal') {
            const target = interaction.fields.getTextInputValue('warn_target');
            const reason = interaction.fields.getTextInputValue('warn_reason');

            await interaction.reply({ content: `⚠️ تم تسجيل التحذير لـ ${target} بنجاح!`, ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("⚠️ WARNING SYSTEM - تحذير جديد")
                .setDescription(`👤 **العضو المستهدف:** ${target}\n👑 **بواسطة الإداري:** ${interaction.user}\n💬 **السبب:** ${reason}`)
                .setColor(0xE74C3C)
                .setTimestamp();

            await interaction.channel.send({ embeds: [embed] });
        }

        if (interaction.customId === 'change_stock_modal_custom') {
            stock_data["TABLET ROBBERY"] = parseChangeInput(stock_data["TABLET ROBBERY"] || 0, interaction.fields.getTextInputValue('robbery_input'));
            stock_data["TABLETS CHOP SHOP"] = parseChangeInput(stock_data["TABLETS CHOP SHOP"] || 0, interaction.fields.getTextInputValue('chopshop_input'));
            stock_data["TABLETS HOUSES"] = parseChangeInput(stock_data["TABLETS HOUSES"] || 0, interaction.fields.getTextInputValue('houses_input'));
            stock_data["LAPTOP BOOSTING"] = parseChangeInput(stock_data["LAPTOP BOOSTING"] || 0, interaction.fields.getTextInputValue('boosting_input'));
            stock_data["TABLET GANGS"] = parseChangeInput(stock_data["TABLET GANGS"] || 0, interaction.fields.getTextInputValue('gangs_input'));

            saveStock();
            await updateLiveShowMessage();
            await interaction.reply({ content: "✅ تم تحديث الأرقام بنجاح!", ephemeral: true });
        }
    }
});

// تشغيل البوت بالتوكن الأساسي
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
