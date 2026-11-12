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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// المعرفات الثابتة والصحيحة بدقة تامة
const VACATION_LOG_CHANNEL_ID = "1552576612648624148";
const LEADERBOARD_CHANNEL_ID = "1563202261281144952"; 
const WARN_PANEL_CHANNEL_ID = "1557330614141587586"; // روم اللوحة الأساسية للورنات
const WARN_LOG_CHANNEL_ID = "1534996020092600433";    // روم إرسال رسائل الورن الفردية (إعطاء الورن)
const WEAPONS_CHANNEL_ID = "1561472930670452866";    // روم لوحة الأسلحة الرئيسية
const ALLOWED_ROLE_ID = "1283928161805140022"; 
const WEAPON_SPECIAL_ROLE_ID = "1561471985135910932"; 
const SPECIAL_USER_ID = "1343942987154984974"; 

const ROLE_ID_1 = "1552642469789831168";
const ROLE_ID_2 = "1568516316233465966";

// ملفات البيانات
const DATA_FILE = "tablets_data.json";
const MEMBERS_FILE = "members_list.json";
const STOCK_FILE = "tablets_stock.json";
const MSG_TRACKER_FILE = "show_msg_tracker.json";
const TABLET_PANEL_TRACKER = "tablet_panel_tracker.json";
const TASK_PANEL_TRACKER = "task_panel_tracker.json";
const MONEY_DATA_FILE = "money_system_data.json";
const MONEY_PANEL_TRACKER = "money_panel_tracker.json";
const LEADERBOARD_DATA_FILE = "leaderboard_data.json";
const WARNINGS_FILE = "warnings_data.json";
const STORAGE_FILE = "storage_data.json";
const STORAGE_INVOICES_FILE = "storage_invoices.json";
const STORAGE_MSG_TRACKER = "storage_msg_tracker.json";
const TASK_RESOURCES_FILE = "task_resources_data.json";
const WEAPONS_DATA_FILE = "weapons_system_data.json";

const DEFAULT_MEMBERS = [
    "النمر", "شناوي", "كيموز", "جنزوري", "بسيوني", 
    "منفاخ", "فرفشة", "شبح", "زياد شاهين", "السيد شحاتة", 
    "نوفير", "ديشا", "الشاطر", "ابو هاني", "يوسف المصري", 
    "اورتيجا", "موزا", "مورا", "جوكس الونش", "ايجو", "السيوفي", "نور"
];

function loadMembersList() {
    if (fs.existsSync(MEMBERS_FILE)) {
        try { return JSON.parse(fs.readFileSync(MEMBERS_FILE, 'utf8')); } catch (e) {}
    }
    return [...DEFAULT_MEMBERS];
}
function saveMembersList() {
    try { fs.writeFileSync(MEMBERS_FILE, JSON.stringify(MEMBERS_LIST, null, 4), 'utf8'); } catch (e) {}
}

let MEMBERS_LIST = loadMembersList();

// نظام الأسلحة الموحد
let weapons_data = { "records": [], "tracker": { channel_id: null, message_id: null } };
if (fs.existsSync(WEAPONS_DATA_FILE)) {
    try {
        let loadedWep = JSON.parse(fs.readFileSync(WEAPONS_DATA_FILE, 'utf8'));
        if (typeof loadedWep === 'object') Object.assign(weapons_data, loadedWep);
    } catch (e) {}
}
function saveWeaponsData() {
    fs.writeFileSync(WEAPONS_DATA_FILE, JSON.stringify(weapons_data, null, 2), 'utf8');
    updateWeaponsLivePanel();
}

function buildWeaponsEmbed() {
    let records = weapons_data.records || [];
    let desc = "### 🔫 الأشخاص المسالمين سلاح:\n\n";

    if (records.length === 0) {
        desc += "لا توجد أي عمليات تسليم أو استلام أسلحة مسجلة حتى الآن.";
    } else {
        for (let i = records.length - 1; i >= 0; i--) {
            let r = records[i];
            let typeLabel = r.type === 'give' ? '📤 تسليم سلاح' : '📥 استلام سلاح';
            desc += `• **الحالة:** ${typeLabel}\n`;
            desc += `• **بواسطة:** <@${r.authorId}>\n`;
            desc += `• **الشخص:** ${r.target}\n`;
            desc += `• **التفاصيل:** \`${r.details}\`\n`;
            desc += `• **الوقت:** ${r.time}\n`;
            desc += "─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───\n";
        }
    }

    return new EmbedBuilder()
        .setTitle("🛡️ لوحة الأسلحة الرسمية - WEAPONS SYSTEM")
        .setDescription(desc)
        .setColor(0x2ECC71)
        .setFooter({ text: "xXx WEAPONS SYSTEM", iconURL: client.user?.displayAvatarURL() });
}

function weaponsControlRows() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent_btn_receive_v9').setLabel('استلمت سلاح 📥').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('persistent_btn_give_v9').setLabel('سلمت سلاح 📤').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_clear_weapons_records').setLabel('تصفير السجل 🗑️').setStyle(ButtonStyle.Secondary)
    );
}

async function updateWeaponsLivePanel() {
    let tracker = weapons_data.tracker;
    if (!tracker || !tracker.channel_id || !tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildWeaponsEmbed()], components: [weaponsControlRows()] });
            }
        }
    } catch (e) {}
}

let task_resources_data = {};
if (fs.existsSync(TASK_RESOURCES_FILE)) {
    try { task_resources_data = JSON.parse(fs.readFileSync(TASK_RESOURCES_FILE, 'utf8')); } catch (e) {}
}
function saveTaskResourcesData() {
    fs.writeFileSync(TASK_RESOURCES_FILE, JSON.stringify(task_resources_data, null, 2), 'utf8');
    updateTaskPanelMessage();
}

let money_data = { target_amount: 100000, payments: {} };
if (fs.existsSync(MONEY_DATA_FILE)) {
    try {
        let loadedMoney = JSON.parse(fs.readFileSync(MONEY_DATA_FILE, 'utf8'));
        if (typeof loadedMoney === 'object') Object.assign(money_data, loadedMoney);
    } catch (e) {}
}
function saveMoneyData() {
    fs.writeFileSync(MONEY_DATA_FILE, JSON.stringify(money_data, null, 2), 'utf8');
    updateMoneyLivePanel();
}

let money_tracker = {};
if (fs.existsSync(MONEY_PANEL_TRACKER)) {
    try { money_tracker = JSON.parse(fs.readFileSync(MONEY_PANEL_TRACKER, 'utf8')); } catch (e) {}
}
function saveMoneyTracker(channel_id, message_id) {
    money_tracker = { channel_id, message_id };
    fs.writeFileSync(MONEY_PANEL_TRACKER, JSON.stringify(money_tracker, null, 2), 'utf8');
}

const DEFAULT_STOCK = {
    "TABLET CHOP SHOP": 4,
    "TABLETS HOUSES": 12,
    "TABLET ROBBERY": 0,
    "LAPTOP BOOSTING": 0,
    "TABLET GANGS": 0
};

function loadTabletsData() {
    let saved = {};
    if (fs.existsSync(DATA_FILE)) {
        try { saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
    }
    let res = {};
    for (let name of MEMBERS_LIST) {
        res[name] = saved[name] || "❌ لا يوجد";
    }
    return res;
}
function saveTabletsData() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(tablets_data, null, 4), 'utf8'); } catch (e) {}
}

function loadStock() {
    if (fs.existsSync(STOCK_FILE)) {
        try {
            let saved = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
            for (let k in DEFAULT_STOCK) {
                if (!(k in saved)) saved[k] = DEFAULT_STOCK[k];
            }
            return saved;
        } catch (e) {}
    }
    return { ...DEFAULT_STOCK };
}
function saveStock() {
    try { fs.writeFileSync(STOCK_FILE, JSON.stringify(stock_data, null, 4), 'utf8'); } catch (e) {}
}

function loadShowTracker() {
    if (fs.existsSync(MSG_TRACKER_FILE)) {
        try { return JSON.parse(fs.readFileSync(MSG_TRACKER_FILE, 'utf8')); } catch (e) {}
    }
    return {};
}
function saveShowTracker(channel_id, message_id) {
    try { fs.writeFileSync(MSG_TRACKER_FILE, JSON.stringify({ channel_id, message_id }), 'utf8'); } catch (e) {}
}

function loadTabletPanelTracker() {
    if (fs.existsSync(TABLET_PANEL_TRACKER)) {
        try { return JSON.parse(fs.readFileSync(TABLET_PANEL_TRACKER, 'utf8')); } catch (e) {}
    }
    return {};
}
function saveTabletPanelTracker(channel_id, message_id) {
    try { fs.writeFileSync(TABLET_PANEL_TRACKER, JSON.stringify({ channel_id, message_id }), 'utf8'); } catch (e) {}
}

function loadTaskPanelTracker() {
    if (fs.existsSync(TASK_PANEL_TRACKER)) {
        try { return JSON.parse(fs.readFileSync(TASK_PANEL_TRACKER, 'utf8')); } catch (e) {}
    }
    return {};
}
function saveTaskPanelTracker(channel_id, message_id) {
    try { fs.writeFileSync(TASK_PANEL_TRACKER, JSON.stringify({ channel_id, message_id }), 'utf8'); } catch (e) {}
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
        let loadedData = JSON.parse(fs.readFileSync(LEADERBOARD_DATA_FILE, 'utf8'));
        if (typeof loadedData === 'object') Object.assign(db, loadedData);
    } catch (e) {}
}
function saveLeaderboardData() {
    fs.writeFileSync(LEADERBOARD_DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

let warnings_data = { "warnings_list": {}, "warn_msg_id": null, "warn_channel_id": null };
if (fs.existsSync(WARNINGS_FILE)) {
    try {
        let loaded = JSON.parse(fs.readFileSync(WARNINGS_FILE, 'utf8'));
        if (typeof loaded === 'object') Object.assign(warnings_data, loaded);
    } catch (e) {}
}
function saveWarningsData() {
    fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings_data, null, 2), 'utf8');
}

let storage_items = {};
if (fs.existsSync(STORAGE_FILE)) {
    try { storage_items = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8')); } catch (e) {}
}
function saveStorageItems() { 
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage_items, null, 2), 'utf8'); 
    updateStorageLivePanel();
}

let storage_invoices = {};
if (fs.existsSync(STORAGE_INVOICES_FILE)) {
    try { storage_invoices = JSON.parse(fs.readFileSync(STORAGE_INVOICES_FILE, 'utf8')); } catch (e) {}
}
function saveStorageInvoices() { fs.writeFileSync(STORAGE_INVOICES_FILE, JSON.stringify(storage_invoices, null, 2), 'utf8'); }

let storage_tracker = {};
if (fs.existsSync(STORAGE_MSG_TRACKER)) {
    try { storage_tracker = JSON.parse(fs.readFileSync(STORAGE_MSG_TRACKER, 'utf8')); } catch (e) {}
}
function saveStorageTracker(channel_id, message_id) {
    storage_tracker = { channel_id, message_id };
    fs.writeFileSync(STORAGE_MSG_TRACKER, JSON.stringify(storage_tracker, null, 2), 'utf8');
}

function buildStorageEmbed() {
    let desc = "";
    if (Object.keys(storage_items).length === 0) {
        desc = "المخزون فارغ حالياً.";
    } else {
        let count = 1;
        for (let [item, qty] of Object.entries(storage_items)) {
            desc += `${count++}. **${item}** : \`${qty}\`\n`;
        }
    }
    return new EmbedBuilder()
        .setTitle("مخزون العيلة _ xXx SYSTEM")
        .setDescription(`**المخزون الحالي :**\n\n${desc}`)
        .setColor(0x3498DB)
        .setTimestamp();
}

function storageButtonsRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_storage_item').setLabel('الصنف').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_storage_invoice').setLabel('الفاتورة').setStyle(ButtonStyle.Success)
    );
}

async function updateStorageLivePanel() {
    if (!storage_tracker.channel_id || !storage_tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(storage_tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(storage_tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildStorageEmbed()], components: [storageButtonsRow()] });
            }
        }
    } catch (e) {}
}

function buildMoneyEmbed() {
    let target = money_data.target_amount || 100000;
    let desc = `💰 **المبلغ المطلوب الأساسي :** \`${target}\`\n\n**الاشخاص الي سلموا فلوس :**\n\n`;
    let payments = money_data.payments || {};
    if (Object.keys(payments).length === 0) {
        desc += "لا توجد أي مبالغ مسجلة حتى الآن.";
    } else {
        for (let [name, paid] of Object.entries(payments)) {
            let remaining = target - paid;
            desc += `• **${name}** : سلم ${paid} من (${target}) فاضل (${remaining})\n`;
        }
    }
    return new EmbedBuilder()
        .setTitle("💵 نظام الميزانية والفلوس - MONEY SYSTEM")
        .setDescription(desc)
        .setColor(0x1ABC9C)
        .setFooter({ text: "xXx MONEY SYSTEM", iconURL: client.user?.displayAvatarURL() });
}

function moneyControlRows() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_money_add_payment').setLabel('شخص ما سلم فلوس 💵').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_money_remove_person').setLabel('إزالة شخص 🗑️').setStyle(ButtonStyle.Danger)
    );
}

async function updateMoneyLivePanel() {
    if (!money_tracker.channel_id || !money_tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(money_tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(money_tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildMoneyEmbed()], components: [moneyControlRows()] });
            }
        }
    } catch (e) {}
}

function buildWarningsEmbed() {
    let list = warnings_data.warnings_list || {};
    let totalWarned = Object.keys(list).length;
    let desc = `📊 **إحصائيات الورنات:**\n\n**TOTAL WARNED MEMBERS : ${totalWarned}**\n\n👤 **الأعضاء الحاصلين على ورن:**\n\n`;
    if (totalWarned === 0) {
        desc += "لا يوجد أعضاء عليهم تحذيرات حالياً.";
    } else {
        for (let [userName, data] of Object.entries(list)) {
            desc += `👤 **${userName}** : ⚠️ **ورن ${data.level}**\n`;
        }
    }
    return new EmbedBuilder()
        .setTitle("⚠️ نظام الورنات - WARN SYSTEM")
        .setDescription(desc)
        .setColor(0xE74C3C)
        .setFooter({ text: "xXx WARN SYSTEM", iconURL: client.user?.displayAvatarURL() });
}

async function updateWarningsMessage() {
    let channelId = WARN_PANEL_CHANNEL_ID;
    let msgId = warnings_data.warn_msg_id;
    if (!channelId) return;

    try {
        let channel = await client.channels.fetch(channelId);
        if (!channel) return;

        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_give_warn_main').setLabel('إعطاء ورن ⚠️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_remove_warn_main').setLabel('إزالة ورن 🗑️').setStyle(ButtonStyle.Danger)
        );

        if (msgId) {
            try {
                let msg = await channel.messages.fetch(msgId);
                await msg.edit({ embeds: [buildWarningsEmbed()], components: [row] });
                return;
            } catch (err) {}
        }

        let newMsg = await channel.send({ embeds: [buildWarningsEmbed()], components: [row] });
        warnings_data.warn_msg_id = newMsg.id;
        warnings_data.warn_channel_id = channel.id;
        saveWarningsData();
    } catch (e) {}
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
            `📱 **التابلت الحالية (للأعضاء الحاصلين عليها فقط):**\n\n`
        );
    
    let active_holders = [];
    for (let [name, status] of Object.entries(tablets_data)) {
        if (status && status !== "❌ لا يوجد") {
            active_holders.push(`👤 **${name}** : ${status}`);
        }
    }
    if (active_holders.length === 0) {
        active_holders.push("لا توجد أي أجهزة تابلت مع أي عضو حالياً.");
    }
    embed.setDescription(embed.data.description + active_holders.join('\n'));
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

function tabletsControlRows() {
    let row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_tb_robbery_v20').setLabel('خدت TABLET ROBBERY').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_tb_chopshop_v20').setLabel('خدت TABLET CHOP SHOP 🟠').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_tb_boosting_v20').setLabel('خدت LAPTOP Boosting').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_tb_house_v20').setLabel('HOUSE TABLET 🟢').setStyle(ButtonStyle.Success)
    );
    let row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_tb_gangs_v20').setLabel('خدت TABLET GANGS ⚪').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_add_member').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_remove_member').setLabel('🗑️ إزالة عضو').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_tb_reset_v20').setLabel('🔄 تصفير القائمة').setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
}

function taskControlRows() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('submit_task_main_btn').setLabel('تم تسليم التاسك 📥').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_task_add_member').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_task_remove_member').setLabel('🗑️ إزالة عضو').setStyle(ButtonStyle.Danger)
    );
}

function buildTaskPanelEmbed() {
    let membersText = MEMBERS_LIST.map(n => {
        let res = task_resources_data[n];
        if (res) return `• **${n}** : \`${res}\``;
        return `• **${n}**`;
    }).join('\n');

    return new EmbedBuilder()
        .setTitle("📋 نظام التاسكات الجديد - TASKS SYSTEM")
        .setDescription("إذا قمت بتسليم التاسك، اضغط على زر **تم تسليم التاسك 📥** أدناه لتحديد اسمك وإرسال الموارد للمراجعة.\n\n─── ･ ｡ﾟ☆: *.☽ .* :☆ﾟ. ───\n\n👥 **الأعضاء المسجلين في القائمة:**\n" + membersText)
        .setColor(0x2ECC71)
        .setFooter({ text: "xXx TASKS SYSTEM", iconURL: client.user?.displayAvatarURL() });
}

async function updateTabletPanelMessage() {
    let tracker = loadTabletPanelTracker();
    if (!tracker.channel_id || !tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildTabletsLeaderboardEmbed()], components: tabletsControlRows() });
            }
        }
    } catch (e) {}
}

async function updateTaskPanelMessage() {
    let tracker = loadTaskPanelTracker();
    if (!tracker.channel_id || !tracker.message_id) return;
    try {
        let channel = await client.channels.fetch(tracker.channel_id);
        if (channel) {
            let msg = await channel.messages.fetch(tracker.message_id);
            if (msg) {
                await msg.edit({ embeds: [buildTaskPanelEmbed()], components: [taskControlRows()] });
            }
        }
    } catch (e) {}
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
        new ButtonBuilder().setCustomId("btn_show_change_modal_v2").setLabel("تغيير").setStyle(ButtonStyle.Success)
    );
}

function checkTabletPermissions(interaction) {
    let user = interaction.member;
    if (!user) return false;
    let has_allowed_role = user.roles.cache.has(ALLOWED_ROLE_ID);
    let is_admin = user.permissions.has('Administrator');
    let is_special_user = user.id === SPECIAL_USER_ID;
    return has_allowed_role || is_admin || is_special_user;
}

function checkWeaponPermissions(interaction) {
    let user = interaction.member;
    if (!user) return false;
    let has_allowed_role = user.roles.cache.has(ALLOWED_ROLE_ID);
    let has_weapon_role = user.roles.cache.has(WEAPON_SPECIAL_ROLE_ID);
    let is_admin = user.permissions.has('Administrator');
    let is_special_user = user.id === SPECIAL_USER_ID;
    return has_allowed_role || has_weapon_role || is_admin || is_special_user;
}

function formatVoiceTime(totalSeconds) {
    let days = Math.floor(totalSeconds / (3600 * 24));
    let hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);

    let parts = [];
    if (days > 0) parts.push(`${days} يوم`);
    if (hours > 0 || days > 0) parts.push(`${hours} ساعة`);
    parts.push(`${minutes} دقيقة`);
    return parts.join(' ');
}

function buildVoiceLeaderboardEmbed() {
    let voiceTimeMap = db.voiceTime || {};
    let sortedUsers = Object.entries(voiceTimeMap).sort((a, b) => b[1] - a[1]);

    let desc = "قائمة الوقت في الفويس:\n\n";
    if (sortedUsers.length === 0) {
        desc += "لا توجد أي بيانات مسجلة في الفويس حتى الآن.";
    } else {
        for (let [userId, seconds] of sortedUsers) {
            let formattedTime = formatVoiceTime(seconds);
            desc += `• <@${userId}> : ${formattedTime}\n`;
        }
    }

    return new EmbedBuilder()
        .setTitle("🏆 LEADERBOARD - VOICE TIME")
        .setDescription(desc)
        .setColor(0xF1C40F)
        .setFooter({ text: "xXx VOICE LEADERBOARD", iconURL: client.user?.displayAvatarURL() });
}

async function updateVoiceLeaderboardEmbed() {
    const channel = client.channels.cache.get(LEADERBOARD_CHANNEL_ID);
    if (!channel) return;

    try {
        const embed = buildVoiceLeaderboardEmbed();
        if (db.vc_message_id) {
            const msg = await channel.messages.fetch(db.vc_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.vc_message_id = msg.id;
            saveLeaderboardData();
        }
    } catch (e) {
        try {
            const msg = await channel.send({ embeds: [buildVoiceLeaderboardEmbed()] });
            db.vc_message_id = msg.id;
            saveLeaderboardData();
        } catch (err) {}
    }
}

function buildTaskLeaderboardEmbed() {
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

    await updateVoiceLeaderboardEmbed();

    try {
        const embed = buildTaskLeaderboardEmbed();
        if (db.task_message_id) {
            const msg = await channel.messages.fetch(db.task_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            db.task_message_id = msg.id;
            saveLeaderboardData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildTaskLeaderboardEmbed()] });
        db.task_message_id = msg.id;
        saveLeaderboardData();
    }

    try {
        const embed = buildVacationEmbed();
        if (db.vacation_message_id) {
            const msg = await channel.messages.fetch(db.vacation_message_id);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [buildVacationEmbed()] });
            db.vacation_message_id = msg.id;
            saveLeaderboardData();
        }
    } catch (e) {
        const msg = await channel.send({ embeds: [buildVacationEmbed()] });
        db.vacation_message_id = msg.id;
        saveLeaderboardData();
    }
}

let activeVoiceUsers = new Map();

client.once('ready', async () => {
    console.log(`✅ البوت الموحد اشتغل بنجاح: ${client.user.tag}`);
    await updateLeaderboardEmbeds();
    await updateWarningsMessage();

    client.guilds.cache.forEach(guild => {
        guild.channels.cache.forEach(channel => {
            if (channel.isVoiceBased()) {
                channel.members.forEach(member => {
                    if (!member.user.bot) {
                        activeVoiceUsers.set(member.id, Date.now());
                    }
                });
            }
        });
    });

    setInterval(async () => {
        let now = Date.now();
        let updated = false;
        for (let [userId, joinTime] of activeVoiceUsers.entries()) {
            let elapsedSeconds = Math.floor((now - joinTime) / 1000);
            if (elapsedSeconds >= 30) {
                db.voiceTime[userId] = (db.voiceTime[userId] || 0) + elapsedSeconds;
                activeVoiceUsers.set(userId, now);
                updated = true;
            }
        }
        if (updated) {
            saveLeaderboardData();
            await updateVoiceLeaderboardEmbed();
        }
    }, 30000);
});

client.on('voiceStateUpdate', (oldState, newState) => {
    let userId = newState.member?.id || oldState.member?.id;
    if (!userId || newState.member?.user.bot) return;

    let wasInVoice = oldState.channelId;
    let isInVoice = newState.channelId;

    if (!wasInVoice && isInVoice) {
        activeVoiceUsers.set(userId, Date.now());
    } else if (wasInVoice && !isInVoice) {
        let joinTime = activeVoiceUsers.get(userId);
        if (joinTime) {
            let elapsedSeconds = Math.floor((Date.now() - joinTime) / 1000);
            db.voiceTime[userId] = (db.voiceTime[userId] || 0) + elapsedSeconds;
            saveLeaderboardData();
            activeVoiceUsers.delete(userId);
            updateVoiceLeaderboardEmbed();
        }
    } else if (wasInVoice && isInVoice && wasInVoice !== isInVoice) {
        let joinTime = activeVoiceUsers.get(userId);
        if (joinTime) {
            let elapsedSeconds = Math.floor((Date.now() - joinTime) / 1000);
            db.voiceTime[userId] = (db.voiceTime[userId] || 0) + elapsedSeconds;
            saveLeaderboardData();
            activeVoiceUsers.set(userId, Date.now());
            updateVoiceLeaderboardEmbed();
        }
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    let hadRole = oldMember.roles.cache.has(ROLE_ID_1) || oldMember.roles.cache.has(ROLE_ID_2);
    let hasRole = newMember.roles.cache.has(ROLE_ID_1) || newMember.roles.cache.has(ROLE_ID_2);
    let memberName = newMember.displayName || newMember.user.username;

    if (!hadRole && hasRole) {
        if (!MEMBERS_LIST.includes(memberName)) {
            MEMBERS_LIST.push(memberName);
            tablets_data[memberName] = "❌ لا يوجد";
            saveMembersList();
            saveTabletsData();
            await updateTabletPanelMessage();
            await updateTaskPanelMessage();
            await updateLiveShowMessage();
        }
    } else if (hadRole && !hasRole) {
        MEMBERS_LIST = MEMBERS_LIST.filter(n => n !== memberName);
        delete tablets_data[memberName];
        delete task_resources_data[memberName];
        saveMembersList();
        saveTabletsData();
        saveTaskResourcesData();
        await updateTabletPanelMessage();
        await updateTaskPanelMessage();
        await updateLiveShowMessage();
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const content = message.content.trim();

    if (content.startsWith('!t')) {
        let args = content.split(' ');
        if (args.length > 1) {
            let newTarget = parseInt(args[1]);
            if (!isNaN(newTarget)) {
                money_data.target_amount = newTarget;
                saveMoneyData();
                await message.reply(`✅ تم تحديث المبلغ الأساسي المطلوب إلى: \`${newTarget}\``);
                try { await message.delete(); } catch(e) {}
                return;
            }
        }
    }

    if (content === '!setup-money') {
        let msg = await message.channel.send({ embeds: [buildMoneyEmbed()], components: [moneyControlRows()] });
        saveMoneyTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!setup-task') {
        let msg = await message.channel.send({ embeds: [buildTaskPanelEmbed()], components: [taskControlRows()] });
        saveTaskPanelTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }

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

    if (content === '!setup-weapons') {
        let msg = await message.channel.send({ embeds: [buildWeaponsEmbed()], components: [weaponsControlRows()] });
        weapons_data.tracker = { channel_id: message.channel.id, message_id: msg.id };
        saveWeaponsData();
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!setup-warn') {
        warnings_data.warn_channel_id = message.channel.id;
        saveWarningsData();
        await updateWarningsMessage();
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!setup-storage') {
        let msg = await message.channel.send({ embeds: [buildStorageEmbed()], components: [storageButtonsRow()] });
        saveStorageTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!show' || content === 'عرض' || content === 'الرسالة') {
        let msg = await message.channel.send({ embeds: [buildShowEmbed()], components: [showPanelRow()] });
        saveShowTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }

    if (content === '!tablets' || content === 'تابلت' || content === 'التابلت') {
        let msg = await message.channel.send({ embeds: [buildTabletsLeaderboardEmbed()], components: tabletsControlRows() });
        saveTabletPanelTracker(message.channel.id, msg.id);
        try { await message.delete(); } catch (e) {}
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const cid = interaction.customId;

        if (cid === 'btn_clear_weapons_records') {
            if (!checkWeaponPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للأدمن، الرتبة المحددة، والشخص المخصص فقط.", ephemeral: true });
                return;
            }
            weapons_data.records = [];
            saveWeaponsData();
            await interaction.reply({ content: "🔄 تم تصفير سجل الأسلحة بنجاح!", ephemeral: true });
            return;
        }

        if (cid === 'btn_money_add_payment' || cid === 'btn_money_remove_person') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            if (cid === 'btn_money_add_payment') {
                let modal = new ModalBuilder().setCustomId('money_add_modal').setTitle('تسجيل مبلغ مدفوع');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('payer_name').setLabel('الاسم (مثال: بسيوني)').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('payer_amount').setLabel('سلم كام (مثال: 10000)').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
                return;
            }
            if (cid === 'btn_money_remove_person') {
                let payers = Object.keys(money_data.payments || {});
                if (payers.length === 0) {
                    await interaction.reply({ content: "❌ لا توجد أي أسماء مسجلة في القائمة حالياً.", ephemeral: true });
                    return;
                }
                let options = payers.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
                let select = new StringSelectMenuBuilder()
                    .setCustomId('money_remove_select_person')
                    .setPlaceholder('اختر الشخص لإزالته من القائمة...')
                    .addOptions(options);

                await interaction.reply({ content: 'اختر الشخص المراد حذفه من سجل الفلوس:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
                return;
            }
        }

        if (cid === 'btn_give_warn_main') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let guildMembers = await interaction.guild.members.fetch();
            let eligibleMembers = MEMBERS_LIST.filter(memberName => {
                let found = guildMembers.find(m => m.displayName.includes(memberName) || m.user.username.includes(memberName));
                if (!found) return true;
                return found.roles.cache.has(ROLE_ID_1) || found.roles.cache.has(ROLE_ID_2);
            });

            if (eligibleMembers.length === 0) {
                await interaction.reply({ content: "❌ لا توجد أعضاء تحمل الرولات المطلوبة حالياً.", ephemeral: true });
                return;
            }

            let options = eligibleMembers.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
            let select = new StringSelectMenuBuilder()
                .setCustomId('warn_select_member')
                .setPlaceholder('اختر العضو لإعطائه ورن...')
                .addOptions(options);

            await interaction.reply({ content: 'اختر العضو المراد إعطاؤه ورن:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'btn_remove_warn_main') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let warnedKeys = Object.keys(warnings_data.warnings_list || {});
            if (warnedKeys.length === 0) {
                await interaction.reply({ content: "❌ لا توجد أي تحذيرات مسجلة حالياً لإزالتها.", ephemeral: true });
                return;
            }
            let options = warnedKeys.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
            let select = new StringSelectMenuBuilder()
                .setCustomId('warn_remove_select')
                .setPlaceholder('اختر العضو لإزالة الورن منه ومسح رسالته...')
                .addOptions(options);

            await interaction.reply({ content: 'اختر العضو لإزالة الورن عنه:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'submit_task_main_btn' || cid === 'btn_task_add_member' || cid === 'btn_task_remove_member') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            if (cid === 'submit_task_main_btn') {
                let options = MEMBERS_LIST.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
                let select = new StringSelectMenuBuilder()
                    .setCustomId('task_select_member')
                    .setPlaceholder('اختر اسم الشخص لتسجيل الموارد له...')
                    .addOptions(options);

                await interaction.reply({ content: 'اختر اسم الشخص لتسجيل الموارد له مباشرة:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
                return;
            }
            if (cid === 'btn_task_add_member') {
                let modal = new ModalBuilder().setCustomId('task_modal_add_member').setTitle('إضافة عضو جديد لبوت التاسكات');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_member_name').setLabel('اسم العضو الجديد :').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
                return;
            }
            if (cid === 'btn_task_remove_member') {
                let guildMembers = await interaction.guild.members.fetch();
                let eligibleMembers = MEMBERS_LIST.filter(memberName => {
                    let found = guildMembers.find(m => m.displayName.includes(memberName) || m.user.username.includes(memberName));
                    if (!found) return true;
                    return found.roles.cache.has(ROLE_ID_1) || found.roles.cache.has(ROLE_ID_2);
                });

                if (eligibleMembers.length === 0) {
                    await interaction.reply({ content: "❌ لا يوجد أعضاء مطابقين للرولات المحددة حالياً في القائمة.", ephemeral: true });
                    return;
                }

                let options = eligibleMembers.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
                let select = new StringSelectMenuBuilder()
                    .setCustomId('task_select_remove_member')
                    .setPlaceholder('اختر العضو لحذفه...')
                    .addOptions(options);

                await interaction.reply({ content: 'اختر العضو لحذفه من قائمة التاسكات:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
                return;
            }
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
            if (!checkWeaponPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للأدمن، الرتبة المحددة، والشخص المخصص فقط.", ephemeral: true });
                return;
            }
            const isGive = cid === 'persistent_btn_give_v9';
            const modal = new ModalBuilder().setCustomId(isGive ? 'weapon_give_modal' : 'weapon_receive_modal').setTitle(isGive ? 'تسليم سلاح' : 'استلام سلاح');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_target').setLabel('الشخص (اسم أو منشن):').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('weapon_details').setLabel('التفاصيل (اسم السلاح):').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
            return;
        }

        if (cid === 'btn_storage_item') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let select = new StringSelectMenuBuilder()
                .setCustomId('storage_item_action_select')
                .setPlaceholder('اختر الإجراء المطلوب للصنف...')
                .addOptions([
                    { label: 'إضافة صنف', value: 'add_item', emoji: '➕' },
                    { label: 'إزالة صنف', value: 'remove_item', emoji: '➖' }
                ]);
            await interaction.reply({ content: 'اختر إجراء الصنف:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'btn_storage_invoice') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let select = new StringSelectMenuBuilder()
                .setCustomId('storage_invoice_action_select')
                .setPlaceholder('اختر إجراء الفاتورة...')
                .addOptions([
                    { label: 'طباعة فاتورة لشخص', value: 'print_invoice', emoji: '🖨️' },
                    { label: 'إزالة فاتورة', value: 'remove_invoice', emoji: '🗑️' }
                ]);
            await interaction.reply({ content: 'اختر إجراء الفاتورة:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        if (cid === 'btn_approve_vacation' || cid === 'btn_reject_vacation') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            const isApprove = cid === 'btn_approve_vacation';
            const originalEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setColor(isApprove ? 0x2ECC71 : 0xE74C3C)
                .setTitle(isApprove ? "🌴 تم قبول الإجازة" : "❌ تم رفض الإجازة")
                .addFields({ name: "حالة الطلب:", value: isApprove ? "تمت الموافقة على طلب الإجازة بنجاح." : "تم رفض طلب الإجازة." });

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
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
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

        if (cid === 'btn_add_member') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let modal = new ModalBuilder().setCustomId('modal_add_member').setTitle('إضافة عضو جديد للقائمة');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('new_member_name').setLabel('اسم العضو الجديد :').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'btn_remove_member') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let options = MEMBERS_LIST.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
            let select = new StringSelectMenuBuilder()
                .setCustomId('select_remove_member')
                .setPlaceholder('اختر العضو المراد حذفه من القائمة...')
                .addOptions(options);

            await interaction.reply({ content: 'اختر العضو لحذفه:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
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
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let [tName, tEmoji] = tabletMap[cid];
            let selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`tablet_select_${cid}`)
                .setPlaceholder('اختر اسم الشخص لتحديث جهازه...')
                .addOptions(MEMBERS_LIST.map(name => ({ label: name, value: name, emoji: "👤" })).slice(0, 25));

            await interaction.reply({
                content: `اختر اسم الشخص لتحديث status **${tName}**:`,
                components: [new ActionRowBuilder().addComponents(selectMenu)],
                ephemeral: true
            });
        }

        if (cid === 'btn_tb_reset_v20') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            for (let name of MEMBERS_LIST) tablets_data[name] = "❌ لا يوجد";
            saveTabletsData();
            await updateTabletPanelMessage();
            await updateLiveShowMessage();
            await interaction.reply({ content: "🔄 تم تصفير جميع التابلت بنجاح!", ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu()) {
        let cid = interaction.customId;

        if (cid === 'task_select_member') {
            if (!checkTabletPermissions(interaction)) {
                await interaction.reply({ content: "❌ هذا الإجراء مخصص للإدارة والأدمن فقط.", ephemeral: true });
                return;
            }
            let selectedName = interaction.values[0];
            let modal = new ModalBuilder().setCustomId(`task_delivery_modal_${selectedName}`).setTitle(`تسجيل موارد لـ ${selectedName}`);
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('task_resources')
                        .setLabel('الموارد :')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                )
            );
            await interaction.showModal(modal);
            return;
        }

        if (cid === 'warn_remove_select') {
            let selectedName = interaction.values[0];
            let warnObj = warnings_data.warnings_list[selectedName];

            if (warnObj) {
                try {
                    let ch = await client.channels.fetch(WARN_LOG_CHANNEL_ID);
                    if (ch) {
                        let msg = await ch.messages.fetch(warnObj.messageId);
                        if (msg) await msg.delete();
                    }
                } catch (e) {}
            }

            delete warnings_data.warnings_list[selectedName];
            saveWarningsData();
            await updateWarningsMessage();
            await interaction.update({ content: `🗑️ تم إزالة الورن عن العضو (**${selectedName}**) وحذف رسالته تلقائياً من روم اللوج!`, components: [] });
            return;
        }

        if (cid === 'warn_select_member') {
            let selectedName = interaction.values[0];
            let selectLevel = new StringSelectMenuBuilder()
                .setCustomId(`warn_level_select_${selectedName}`)
                .setPlaceholder('اختر مستوى الورن...')
                .addOptions([
                    { label: 'ورن 1 (يستمر لمدة 10 أيام)', value: '1', emoji: '⚠️' },
                    { label: 'ورن 2 (يستمر لمدة 15 يوم)', value: '2', emoji: '⚠️' },
                    { label: 'ورن 3 (دائم طول الوقت)', value: '3', emoji: '🚨' }
                ]);
            await interaction.update({ content: `اختر مستوى الورن لـ (${selectedName}):`, components: [new ActionRowBuilder().addComponents(selectLevel)] });
        }

        if (cid.startsWith('warn_level_select_')) {
            let selectedName = cid.replace('warn_level_select_', '');
            let level = interaction.values[0];
            
            let modal = new ModalBuilder().setCustomId(`warn_modal_${selectedName}_${level}`).setTitle(`سبب الورن مستوى ${level}`);
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('warn_reason').setLabel('سبب الورن :').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'money_remove_select_person') {
            let personToRemove = interaction.values[0];
            delete money_data.payments[personToRemove];
            saveMoneyData();
            await interaction.update({ content: `🗑️ تم إزالة الشخص (**${personToRemove}**) وتحديث لوحة الميزانية بنجاح!`, components: [] });
            return;
        }

        if (cid === 'task_select_remove_member') {
            let memberToRemove = interaction.values[0];
            MEMBERS_LIST = MEMBERS_LIST.filter(n => n !== memberToRemove);
            delete task_resources_data[memberToRemove];
            saveMembersList();
            saveTaskResourcesData();
            await updateTaskPanelMessage();
            await interaction.update({ content: `🗑️ تم إزالة العضو (**${memberToRemove}**) من قائمة التاسكات وتحديث اللوحة بنجاح!`, components: [] });
        }

        if (cid === 'select_remove_member') {
            let memberToRemove = interaction.values[0];
            MEMBERS_LIST = MEMBERS_LIST.filter(n => n !== memberToRemove);
            delete tablets_data[memberToRemove];
            delete task_resources_data[memberToRemove];
            saveMembersList();
            saveTabletsData();
            saveTaskResourcesData();

            await updateTabletPanelMessage();
            await updateLiveShowMessage();
            await interaction.update({ content: `🗑️ تم إزالة العضو (**${memberToRemove}**) من القائمة بنجاح وتحديث اللوحات!`, components: [] });
        }

        if (cid === 'storage_item_action_select') {
            let choice = interaction.values[0];
            if (choice === 'add_item') {
                let modal = new ModalBuilder().setCustomId('storage_add_item_modal').setTitle('إضافة صنف للمخزون');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel('اسم الصنف :').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_qty').setLabel('الكمية المراد إضافتها :').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
            } else if (choice === 'remove_item') {
                let modal = new ModalBuilder().setCustomId('storage_remove_item_modal').setTitle('إزالة/خصم صنف من المخزون');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel('اسم الصنف المراد خصمه :').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_qty').setLabel('الكمية المراد خصمها :').setStyle(TextInputStyle.Short).setRequired(true))
                );
                await interaction.showModal(modal);
            }
        }

        if (cid === 'storage_invoice_action_select') {
            let choice = interaction.values[0];
            if (choice === 'print_invoice') {
                let options = MEMBERS_LIST.map(name => ({ label: name, value: name, emoji: '👤' })).slice(0, 25);
                let select = new StringSelectMenuBuilder()
                    .setCustomId('storage_print_invoice_select_person')
                    .setPlaceholder('اختر الشخص لطباعة الفاتورة له...')
                    .addOptions(options);

                await interaction.update({ content: 'اختر العضو المراد طباعة فاتورة له:', components: [new ActionRowBuilder().addComponents(select)] });
            } else if (choice === 'remove_invoice') {
                let invoiceHolders = Object.keys(storage_invoices);
                if (invoiceHolders.length === 0) {
                    await interaction.update({ content: '❌ لا توجد أي فواتير مسجلة لإزالتها.', components: [] });
                    return;
                }
                let options = invoiceHolders.map(name => ({ label: name, value: name, emoji: '📄' })).slice(0, 25);
                let select = new StringSelectMenuBuilder()
                    .setCustomId('storage_remove_invoice_select')
                    .setPlaceholder('اختر الشخص لإزالة فواتيره ومسح رسالته...')
                    .addOptions(options);

                await interaction.update({ content: 'اختر الشخص المراد إزالة فواتيره وتراجع مخزونه:', components: [new ActionRowBuilder().addComponents(select)] });
            }
        }

        if (cid === 'storage_print_invoice_select_person') {
            let selectedName = interaction.values[0];
            let modal = new ModalBuilder().setCustomId(`storage_print_invoice_modal_${selectedName}`).setTitle(`فاتورة لـ ${selectedName}`);
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_name').setLabel('اسم الصنف المستلم :').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('item_qty').setLabel('الكمية التي أخذها :').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }

        if (cid === 'storage_remove_invoice_select') {
            let targetName = interaction.values[0];
            let invData = storage_invoices[targetName];

            if (invData) {
                let item = invData.itemName;
                let qty = invData.itemQty || 0;
                storage_items[item] = (storage_items[item] || 0) + qty;
                saveStorageItems();

                if (invData.channelId && invData.messageId) {
                    try {
                        let ch = await client.channels.fetch(invData.channelId);
                        if (ch) {
                            let msg = await ch.messages.fetch(invData.messageId);
                            if (msg) await msg.delete();
                        }
                    } catch(e) {}
                }

                delete storage_invoices[targetName];
                saveStorageInvoices();
                await interaction.update({ content: `🗑️ تم إزالة فاتورة (${targetName}) ومسح رسالته، وإعادة الكمية للمخزون بنجاح!`, components: [] });
            } else {
                await interaction.update({ content: `❌ لم يتم العثور على فاتورة نشطة لهذا الاسم.`, components: [] });
            }
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

            await updateTabletPanelMessage();
            await updateLiveShowMessage();

            await interaction.update({ content: msg, components: [] });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('task_delivery_modal_')) {
            const memberName = interaction.customId.replace('task_delivery_modal_', '');
            const resources = interaction.fields.getTextInputValue('task_resources') || 'لا يوجد';

            task_resources_data[memberName] = resources;
            saveTaskResourcesData();

            await interaction.reply({ content: `✅ تم تسجيل موارد العضو (**${memberName}**) وتحديث اللوحة مباشرة!`, ephemeral: true });
            return;
        }

        if (interaction.customId.startsWith('warn_modal_')) {
            let parts = interaction.customId.split('_');
            let level = parts[parts.length - 1];
            let targetName = parts.slice(2, parts.length - 1).join('_');
            let reason = interaction.fields.getTextInputValue('warn_reason');

            let logChannel = interaction.guild.channels.cache.get(WARN_LOG_CHANNEL_ID);
            if (!logChannel) {
                logChannel = await client.channels.fetch(WARN_LOG_CHANNEL_ID).catch(() => interaction.channel);
            }

            let logEmbed = new EmbedBuilder()
                .setTitle(`⚠️ ورن ${level}`)
                .setDescription(`👤 **العضو:** ${targetName}\n👑 **بواسطة:** ${interaction.user}\n💬 **السبب:** ${reason}\n⏰ **الوقت:** ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})\n⏳ **المدة:** ${level === '1' ? '10 أيام' : level === '2' ? '15 يوم' : 'دائم (طوال الوقت)'}`)
                .setColor(0xE74C3C);
            
            let sentMsg = await logChannel.send({ embeds: [logEmbed] });

            warnings_data.warnings_list[targetName] = { 
                level: level, 
                messageId: sentMsg.id, 
                channelId: logChannel.id 
            };
            saveWarningsData();
            await updateWarningsMessage();

            await interaction.reply({ content: `⚠️ تم إعطاء ورن مستوى (${level}) لـ (${targetName}) بنجاح وإرسال الرسالة لروم الورن المخصص!`, ephemeral: true });

            if (level === '1') {
                setTimeout(async () => {
                    try { await sentMsg.delete(); } catch(e) {}
                    if (warnings_data.warnings_list[targetName]?.level === '1') {
                        delete warnings_data.warnings_list[targetName];
                        saveWarningsData();
                        await updateWarningsMessage();
                    }
                }, 10 * 24 * 60 * 60 * 1000);
            } else if (level === '2') {
                setTimeout(async () => {
                    try { await sentMsg.delete(); } catch(e) {}
                    if (warnings_data.warnings_list[targetName]?.level === '2') {
                        delete warnings_data.warnings_list[targetName];
                        saveWarningsData();
                        await updateWarningsMessage();
                    }
                }, 15 * 24 * 60 * 60 * 1000);
            }
            return;
        }

        if (interaction.customId === 'money_add_modal') {
            let payerName = interaction.fields.getTextInputValue('payer_name').trim();
            let amount = parseInt(interaction.fields.getTextInputValue('payer_amount')) || 0;

            money_data.payments[payerName] = (money_data.payments[payerName] || 0) + amount;
            saveMoneyData();

            await interaction.reply({ content: `✅ تم تسجيل مبلغ (\`${amount}\`) لـ (**${payerName}**) بنجاح وتحديث لوحة الميزانية!`, ephemeral: true });
            return;
        }

        if (interaction.customId === 'task_modal_add_member') {
            let newName = interaction.fields.getTextInputValue('new_member_name').trim();
            if (newName && !MEMBERS_LIST.includes(newName)) {
                MEMBERS_LIST.push(newName);
                saveMembersList();
                await updateTaskPanelMessage();
                await interaction.reply({ content: `✅ تم إضافة العضو (**${newName}**) لقائمة التاسكات بنجاح!`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ هذا الاسم موجود مسبقاً أو فارغ!`, ephemeral: true });
            }
        }

        if (interaction.customId === 'weapon_give_modal' || interaction.customId === 'weapon_receive_modal') {
            const isGive = interaction.customId === 'weapon_give_modal';
            const target = interaction.fields.getTextInputValue('weapon_target');
            const details = interaction.fields.getTextInputValue('weapon_details');

            let recordEntry = {
                type: isGive ? 'give' : 'receive',
                authorId: interaction.user.id,
                target: target,
                details: details,
                time: `${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})`
            };

            weapons_data.records.push(recordEntry);
            saveWeaponsData();

            await interaction.reply({ content: `✅ تم تسجيل العملية بنجاح وتحديث لوحة الأسلحة الرئيسية!`, ephemeral: true });
            return;
        }

        if (interaction.customId === 'vacation_modal') {
            const name = interaction.fields.getTextInputValue('vacation_name');
            const duration = interaction.fields.getTextInputValue('vacation_duration');
            const reason = interaction.fields.getTextInputValue('vacation_reason');

            await interaction.reply({ content: "✅ تم إرسال طلب إجازتك وهو قيد المراجعة!", ephemeral: true });

            const logChannel = interaction.guild.channels.cache.get(VACATION_LOG_CHANNEL_ID) || interaction.channel;
            const embed = new EmbedBuilder()
                .setTitle("🌴 طلب إجازة جديد تحت المراجعة")
                .setDescription(`--- • ° ☆ : . ☽ . : ☆ ° . ---\n\n👤 **العضو:** ${interaction.user}\n🆔 **ID:** \`${interaction.user.id}\`\n\n--- • ° ☆ : . ☽ . : ☆ ° . ---\n\n📝 **الاسم:** ${name}\n📅 **مدة الإجازة:** ${duration}\n💬 **السبب:** ${reason}\n\n--- • ° ☆ : . ☽ . : ☆ ° . ---\n\n⏰ **وقت التقديم:** ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()})`)
                .setColor(0xF1C40F)
                .setThumbnail(interaction.user.displayAvatarURL());

            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_approve_vacation').setLabel('موافقة الإجازة ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reject_vacation').setLabel('رفض الإجازة ❌').setStyle(ButtonStyle.Danger)
            );

            await logChannel.send({ content: `📣 **طلب إجازة جديد من ${interaction.user}:**`, embeds: [embed], components: [adminRow] });
        }

        if (interaction.customId === 'modal_add_member') {
            let newName = interaction.fields.getTextInputValue('new_member_name').trim();
            if (newName && !MEMBERS_LIST.includes(newName)) {
                MEMBERS_LIST.push(newName);
                tablets_data[newName] = "❌ لا يوجد";
                saveMembersList();
                saveTabletsData();

                await updateTabletPanelMessage();
                await updateLiveShowMessage();

                await interaction.reply({ content: `✅ تم إضافة العضو (**${newName}**) للقائمة وتحديث اللوحة بنجاح!`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ هذا الاسم موجود مسبقاً أو فارغ!`, ephemeral: true });
            }
        }

        if (interaction.customId === 'storage_add_item_modal') {
            let itemName = interaction.fields.getTextInputValue('item_name');
            let itemQty = parseInt(interaction.fields.getTextInputValue('item_qty')) || 0;
            
            storage_items[itemName] = (storage_items[itemName] || 0) + itemQty;
            saveStorageItems();
            await interaction.reply({ content: `✅ تم إضافة الصنف (**${itemName}**) بالكمية (\`${itemQty}\`) وتحديث اللوحة الحية!`, ephemeral: true });
        }

        if (interaction.customId === 'storage_remove_item_modal') {
            let itemName = interaction.fields.getTextInputValue('item_name');
            let itemQty = parseInt(interaction.fields.getTextInputValue('item_qty')) || 0;

            storage_items[itemName] = (storage_items[itemName] || 0) - itemQty;
            saveStorageItems();
            await interaction.reply({ content: `🗑️ تم خصم كمية (\`${itemQty}\`) من الصنف (**${itemName}**) (المتبقي: \`${storage_items[itemName]}\`)!`, ephemeral: true });
        }

        if (interaction.customId.startsWith('storage_print_invoice_modal_')) {
            let selectedName = interaction.customId.replace('storage_print_invoice_modal_', '');
            let itemName = interaction.fields.getTextInputValue('item_name');
            let itemQty = parseInt(interaction.fields.getTextInputValue('item_qty')) || 0;

            storage_items[itemName] = (storage_items[itemName] || 0) - itemQty;
            saveStorageItems();

            await interaction.reply({ content: `🖨️ تم طباعة الفاتورة لـ (**${selectedName}**) وخصم كمية تلقائياً من المخزون!`, ephemeral: true });

            let embed = new EmbedBuilder()
                .setTitle("🧾 فاتورة استلام مخزون عائلة _ STORAGE INVOICE")
                .setDescription(`👤 **الشخص المستلم:** ${selectedName}\n📦 **ما تم استلامه:** \`${itemQty}\` من **${itemName}**\n👑 **بواسطة:** ${interaction.user}`)
                .setColor(0x3498DB)
                .setTimestamp();

            let invMsg = await interaction.channel.send({ content: `📢 **فاتورة رسمية لـ:** ${selectedName}`, embeds: [embed] });

            storage_invoices[selectedName] = {
                personName: selectedName,
                itemName: itemName,
                itemQty: itemQty,
                channelId: interaction.channel.id,
                messageId: invMsg.id
            };
            saveStorageInvoices();
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
