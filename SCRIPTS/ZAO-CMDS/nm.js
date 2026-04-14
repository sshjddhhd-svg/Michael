const fs = require("fs-extra");
const path = require("path");

const LOCKS_FILE = path.join(__dirname, "../../data/nm-locks.json");

function loadLocks() {
  try {
    fs.ensureDirSync(path.dirname(LOCKS_FILE));
    if (fs.existsSync(LOCKS_FILE)) {
      const raw = fs.readFileSync(LOCKS_FILE, "utf8");
      const obj = JSON.parse(raw);
      const map = new Map();
      for (const [k, v] of Object.entries(obj)) map.set(k, v);
      return map;
    }
  } catch (_) {}
  return new Map();
}

function saveLocks(locksMap) {
  try {
    fs.ensureDirSync(path.dirname(LOCKS_FILE));
    const obj = {};
    for (const [k, v] of locksMap.entries()) obj[k] = v;
    fs.writeFileSync(LOCKS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (_) {}
}

module.exports.config = {
  name: "nm",
  version: "2.0.0",
  hasPermssion: 2,
  credits: "l7wak",
  description: "قفل اسم المجموعة ومنع تغييره",
  commandCategory: "نظام",
  usages: "تفعيل [الاسم] | ايقاف | قائمة | تنظيف",
  cooldowns: 3
};

module.exports.onLoad = function ({ api }) {
  // Load persisted locks on startup
  global.nameLocks = loadLocks();

  // Clear any stale interval to avoid duplicates on hot-reload
  if (global._nmInterval) {
    clearInterval(global._nmInterval);
    global._nmInterval = null;
  }

  global._nmInterval = setInterval(async () => {
    const botApi = global._botApi || api;
    if (!botApi || global.nameLocks.size === 0) return;

    for (const [threadID, lockedName] of global.nameLocks.entries()) {
      try {
        // Always re-assert the locked name directly.
        // We intentionally skip getThreadInfo here because the API layer
        // caches thread info and would return stale data, making the
        // interval think the name hasn't changed even when it has.
        await botApi.setTitle(lockedName, threadID);
      } catch (e) {
        // setTitle may fail if bot lacks admin rights or group is gone — skip silently
      }
    }
  }, 6000);
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  const action = args[0];

  if (!action) {
    return api.sendMessage(
      "📌 أوامر nm:\n" +
      "• nm تفعيل [الاسم] — قفل اسم المجموعة\n" +
      "• nm ايقاف — إيقاف القفل\n" +
      "• nm قائمة — عرض المجموعات المقفولة\n" +
      "• nm تنظيف — حذف جميع الأقفال",
      threadID, messageID
    );
  }

  if (action === "تفعيل") {
    const name = args.slice(1).join(" ").trim();
    if (!name) {
      return api.sendMessage("⚠️ أدخل الاسم المطلوب.\nمثال: nm تفعيل اسم المجموعة", threadID, messageID);
    }

    try {
      await api.setTitle(name, threadID);
    } catch (e) {
      return api.sendMessage(`❌ فشل تغيير الاسم: ${e.message || e}`, threadID, messageID);
    }

    global.nameLocks.set(threadID, name);
    saveLocks(global.nameLocks);
    return api.sendMessage(`🔒 تم قفل اسم المجموعة:\n"${name}"`, threadID, messageID);
  }

  if (action === "ايقاف") {
    if (!global.nameLocks.has(threadID)) {
      return api.sendMessage("⚠️ لا يوجد قفل مفعل في هذه المجموعة.", threadID, messageID);
    }
    global.nameLocks.delete(threadID);
    saveLocks(global.nameLocks);
    return api.sendMessage("🔓 تم إيقاف قفل اسم المجموعة.", threadID, messageID);
  }

  if (action === "قائمة") {
    if (global.nameLocks.size === 0) {
      return api.sendMessage("📋 لا توجد مجموعات مقفولة حالياً.", threadID, messageID);
    }
    let list = "🔒 المجموعات المقفولة:\n";
    let i = 1;
    for (const [tid, name] of global.nameLocks.entries()) {
      list += `${i}. [${tid}]: "${name}"\n`;
      i++;
    }
    return api.sendMessage(list.trim(), threadID, messageID);
  }

  if (action === "تنظيف") {
    const count = global.nameLocks.size;
    if (count === 0) {
      return api.sendMessage("🗑️ لا توجد بيانات لحذفها.", threadID, messageID);
    }
    global.nameLocks.clear();
    saveLocks(global.nameLocks);
    return api.sendMessage(`🧹 تم حذف جميع الأقفال.\nعدد المجموعات المحذوفة: ${count}`, threadID, messageID);
  }

  return api.sendMessage(
    "📌 أوامر nm:\n" +
    "• nm تفعيل [الاسم] — قفل اسم المجموعة\n" +
    "• nm ايقاف — إيقاف القفل\n" +
    "• nm قائمة — عرض المجموعات المقفولة\n" +
    "• nm تنظيف — حذف جميع الأقفال",
    threadID, messageID
  );
};
