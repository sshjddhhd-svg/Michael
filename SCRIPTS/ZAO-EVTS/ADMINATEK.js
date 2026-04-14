module.exports.config = {
  name: "0antiout_0",
  eventType: ["log:unsubscribe"],
  version: "1.0.0",
  credits: "DungUwU",
  description: "منع الخروج من المجموعة — يعمل فقط عند التفعيل"
};

module.exports.run = async ({ event, api, Threads, Users }) => {
  let threadRow = await Threads.getData(event.threadID);
  let data = (threadRow && threadRow.data) || {};

  if (data.antiout !== true) return;

  if (event.logMessageData.leftParticipantFbId == api.getCurrentUserID()) return;

  const leftID = event.logMessageData.leftParticipantFbId;
  const name = (global.data && global.data.userName && global.data.userName.get(leftID))
    || await Users.getNameUser(leftID);

  const type = (event.author == leftID) ? "self-separation" : "kicked";

  if (type === "self-separation") {
    api.addUserToGroup(leftID, event.threadID, (error) => {
      if (error) {
        api.sendMessage(`https://www.raed.net/img?id=869907`, event.threadID);
      } else {
        api.sendMessage(
          `🩸 ${name} 🩸\n\n  يـمـنـع الـهـروب فـي حـضـور هـذا الـسـيـد الـشـاب 😈🔥`,
          event.threadID
        );
      }
    });
  }
};
