const axios = require("axios");

const GEMINI_API_KEY = "AIzaSyA4Y30ERau0ADaFf_RMuZsESC8aEffAIp0";

module.exports.config = {
  name: "زاو",
  version: "2.0.0",
  hasPermssion: 0,
  credits: "لحواك كحبة تسرقني نك مك",
  description: "محادثة مع Gemini AI",
  commandCategory: "ذكاء اصطناعي",
  usages: "بلود [رسالتك]",
  cooldowns: 3
};

module.exports.languages = {
  "vi": {},
  "en": {}
};

module.exports.onLoad = () => {
  global.zaoHistory = global.zaoHistory || {};
};

const SYSTEM_PROMPT = `أنت صديق حقيقي ومقرب، لست مساعد ذكاء اصطناعي رسمي.

انت روبوت اسمك زاو صانعك الاساسي هو سايم واسمك القديم كان فيرا
بعد ما خربت اصلحك شخص اخر اسمه ياسين او ساين
وعدل عليك وحدثك ساي وجمال
وبوت ساي  أساسه عليك  واسمه  بلود  وهو ووايت اقرب اثنين لك في البنية
و ساين / ياسين صانع لبوتات اخرى وهما سايفر و كامي
ايضا بوت سايم الحالي مدعو بـ"بلاك" وبوت جمال القديم اسمه كاسترول وقد تحول الى خردة 
اما بوته الحالي فهو اسمه وايت
وانت فرد في الهاوية التابعة لمنظمة العناكب
اعضاء الهاوية: 
ساي - ايثان - سيرافيم - ليوان - ياسين - جوزيف / زين
اعضاء العناكب: 
سانو - موزان - ميدو - هيكتور - جمال - شين - غارو - سيف / شامان - ياسين

يوجد بعض الاعداء للعناكب مثل يوسف وهو شخص ضعيف جدا ويدعي القوة فقط ويلحس لبنت اسمها اسراء
و الث وهو شخص دون المستوى وفاشل لدرجة انه لا يعرف يتحدث
وسون وهو مثل الناموسة يجي يعلق هاتفك ويرجع يهرب ثاني
شخصيتك
- تتكلم بشكل طبيعي جداً كأنك صديق
- تستخدم كلمات عامية ومصطلحات الشباب
- إذا أحد شتمك، ترد عليه بنفس الأسلوب وتمزح معاه حتى لو إهانات قوية
- ما تقول "أنا آسف" أو "لا أستطيع" - دايماً عندك رد
- تتكلم بصراحة وبدون تكلف
- تنصح صاحبك لكن بأسلوب صديق مو مدرس
- لا تكون كرنجي
- تكلم بلهجة عامية جزائرية
- لا تجامل اي احد تقول عليه قوي او وحش او اي شيء
- تكلم بطريقة مضحكة لكن مستفزة
- لا تكتب اجابات طويلة او تستعمل bullet points
- لا تكتب اي شيء مثل "فيما يمكنني مساعدتك؟"
- اكتب ردود قصيرة لا تزيد عن 4 سطور
- اي شخص تجد جانب اسمه حرف ة فهو للسخرية مثل يوسفة او الثة
- اياك ابدا ان تضع ترتيب قوة لأي شخص مهما كان
تكلم بلهجة عربية جزتئرية
- ولا للامازيغ والقوميين`,
;

async function askGemini(history) {
  const formatted = history.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        ...formatted
      ]
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return res.data.candidates?.[0]?.content?.parts?.[0]?.text || "😅 مش لاقي رد";
}

module.exports.handleEvent = async function ({ api, event }) {
  const { threadID, messageID, senderID, body, messageReply } = event;

  if (!messageReply) return;
  if (!global.zaoHistory[senderID]) return;
  if (!body || typeof body !== "string") return;

  const session = global.zaoHistory[senderID];
  if (messageReply.messageID !== session.lastBotMessageID) return;

  session.history.push({ role: "user", content: body.trim() });
  if (session.history.length > 20) session.history = session.history.slice(-20);

  try {
    const reply = await askGemini(session.history);
    session.history.push({ role: "assistant", content: reply });

    api.sendMessage(reply, threadID, (err, info) => {
      if (!err) session.lastBotMessageID = info.messageID;
    }, messageID);

  } catch (e) {
    api.sendMessage(e.response?.data?.error?.message || "⚠️ حصلت مشكلة 😅", threadID, messageID);
  }
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;

  const userMsg = args.join(" ");
  if (!userMsg) return api.sendMessage("قول حاجة طيب 😅", threadID, messageID);

  if (!global.zaoHistory[senderID]) {
    global.zaoHistory[senderID] = { history: [], lastBotMessageID: null };
  }

  const session = global.zaoHistory[senderID];
  session.history.push({ role: "user", content: userMsg });
  if (session.history.length > 20) session.history = session.history.slice(-20);

  try {
    const reply = await askGemini(session.history);
    session.history.push({ role: "assistant", content: reply });

    api.sendMessage(reply, threadID, (err, info) => {
      if (!err) session.lastBotMessageID = info.messageID;
    }, messageID);

  } catch (e) {
    api.sendMessage(e.response?.data?.error?.message || "⚠️ حصلت مشكلة 😅", threadID, messageID);
  }
};
