import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./src/commands.js";
import { checkForUpdatesAll } from "./src/services.js";
import JSONFileHandler from "./src/json-handler.js";

const bot = new TelegramBot("7204948449:AAFbSFgZdCYx54vZ_cPUuhBkxsO8BX8A5dc", {
	polling: true,
});
const subscribers = new JSONFileHandler("./data/subscribers.json");

bot.on("message", (msg) => handleMessage(msg, bot, subscribers));
bot.on("channel_post", (msg) => handleMessage(msg, bot, subscribers));

setInterval(() => {
	checkForUpdatesAll(bot);
}, 15000);
