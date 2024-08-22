import TelegramBot from "node-telegram-bot-api";
import { handleMessage } from "./src/commands.js";
import { checkForUpdatesAll } from "./src/services.js";
import JSONFileHandler from "./src/json-handler.js";

const TOKEN = "7470726583:AAGdlBnuQ1YVoIZdP-6PTcdlE8kpT7cV-RU";
const POLLING_INTERVAL = 20000;

const bot = new TelegramBot(TOKEN, { polling: true });
const subscribers = new JSONFileHandler("./data/subscribers.json");

bot.on("message", (msg) => handleMessage(msg, subscribers));
bot.on("channel_post", (msg) => handleMessage(msg, subscribers));

setInterval(checkForUpdatesAll, POLLING_INTERVAL);

export { bot };
