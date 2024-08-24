import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./src/commands.js";
import { checkForUpdatesAll } from "./src/services.js";
import JSONFileHandler from "./src/json-handler.js";

const TOKEN = "7204948449:AAFbSFgZdCYx54vZ_cPUuhBkxsO8BX8A5dc";
const POLLING_INTERVAL = 60000;

const bot = new TelegramBot(TOKEN, { polling: true });
const subscribers = new JSONFileHandler("./data/subscribers.json");

bot.on("message", (msg) => handleMessage(msg, subscribers));
bot.on("channel_post", (msg) => handleMessage(msg, subscribers));

setInterval(checkForUpdatesAll, POLLING_INTERVAL);

export { bot };
