const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "ريفرش",
  version: "3.0.0",
  hasPermssion: 2,
  credits: "Yassin",
  description: "تحديث الأوامر + قراءة الجديد + حذف المحذوف",
  commandCategory: "system",
  usages: "[command name]",
  cooldowns: 3
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;

  const commandName = args[0];
  const commandsPath = __dirname;

  try {
    // ✅ تأكد إن events Array
    if (!Array.isArray(global.client.events)) {
      global.client.events = [];
    }

    const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));
    const fileNames = files.map(f => f.replace(".js", ""));

    // 🗑️ حذف الأوامر اللي اتمسحت فعلاً (بمقارنة اسم الملف)
    for (const [name, cmd] of global.client.commands) {
        if (!cmd || (cmd.__filename && !fileNames.includes(cmd.__filename))) {
        global.client.commands.delete(name);

        global.client.events = global.client.events.filter(
          c => c.config?.name !== name
        );

        console.log("🗑️ Removed:", name);
      }
    }

    // 🔹 تحديث أمر واحد
    if (commandName) {
      const filePath = path.join(commandsPath, commandName + ".js");

      if (!fs.existsSync(filePath)) {
        return api.sendMessage("❌ الأمر غير موجود", threadID, messageID);
      }

      delete require.cache[require.resolve(filePath)];

      const command = require(filePath);
      command.__filename = commandName; // 🔥 مهم

      global.client.commands.delete(command.config.name);

      global.client.events = global.client.events.filter(
        cmd => cmd.config?.name !== command.config.name
      );

      global.client.commands.set(command.config.name, command);

      if (command.handleEvent) {
        global.client.events.push(command);
      }

      return api.sendMessage(`✅ تم تحديث الأمر: ${commandName}`, threadID, messageID);
    }

    // 🔄 تحديث كل الأوامر + إضافة الجديد
    let success = 0;
    let failed = 0;
    let added = 0;

    for (const file of files) {
      try {
        const filePath = path.join(commandsPath, file);

        delete require.cache[require.resolve(filePath)];

        const command = require(filePath);
        command.__filename = file.replace(".js", ""); // 🔥 مهم

        const isNew = !global.client.commands.has(command.config.name);

        global.client.commands.delete(command.config.name);

        global.client.events = global.client.events.filter(
          cmd => cmd.config?.name !== command.config.name
        );

        global.client.commands.set(command.config.name, command);

        if (command.handleEvent) {
          global.client.events.push(command);
        }

        if (isNew) {
          added++;
          console.log("🆕 New:", command.config.name);
        }

        success++;

      } catch (err) {
        console.error(`❌ ${file}:`, err.message);
        failed++;
      }
    }

    api.sendMessage(
      `🔄 تم التحديث\n` +
      `✅ نجاح: ${success}\n` +
      `🆕 جديد: ${added}\n` +
      `❌ فشل: ${failed}`,
      threadID,
      messageID
    );

  } catch (err) {
    console.error(err);
    api.sendMessage("⚠️ حصل خطأ أثناء التحديث", threadID, messageID);
  }
};
