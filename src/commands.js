import {
	checkForUpdates,
	exclude,
	include,
	listAllSites,
	myList,
	site_list,
	sendFile,
} from "./services.js";

import { bot } from "../index.js";

const helpMessage = `
**Help Message for "Newwzy" News Update Bot**

This bot monitors news sites for updates and communicates with subscribers based on their preferences. Here’s a guide on how to use the bot and its available commands:

1. **Get the List of All News Sites**
   - Command: /listdb
   - Example: /listdb
   - Description: Prints a list of all available news sites with their IDs and names.

2. **Check for Latest Update for a Specific Site**
   - Command: /update_<Site-ID>
   - Example: /update_1001
   - Description: Checks for the latest updates from a specific site. Replace <Site-ID> with the actual ID of the site you want to check.

3. **Get Your Favorite News Sites**
   - Command: /mylist
   - Example: /mylist
   - Description: Retrieves and sends a list of your favorite news sites. Excludes sites you have marked as not of interest.

4. **Remove Site(s) from Your Favorites**
   - Command: /remove_<Site-ID1,Site-ID2,...>
   - Example: /remove_1000,1001,1002
   - Description: Removes site(s) from your favorites list. Replace <Site-ID1,Site-ID2,...> with the IDs of the sites you wish to remove, separated by commas.

5. **Add Site(s) to Your Favorites**
   - Command: /add_<Site-ID1,Site-ID2,...>
   - Example: /add_1000,1001,1002
   - Description: Adds site(s) to your favorite list. Replace <Site-ID1,Site-ID2,...> with the IDs of the sites you wish to add, separated by commas.

6. **Print This Message**
   - Command: /help
   - Description: Prints This Message.

**Note**: Make sure to replace placeholders (e.g., <Site-ID>) with actual values and ensure your bot has the necessary permissions to send messages and retrieve site data.
`;

export async function handleMessage(msg, subscribers) {
	const chatId = msg.chat.id;
	try {
		const userArray = await subscribers.getElements();
		const user = userArray.find((user) => user.userid === chatId);

		if (!user) {
			await subscribers.addElement({
				userid: chatId,
				username: msg.chat.username,
				exclude: [],
			});
			await bot.sendMessage(
				chatId,
				"Now you are a subscriber.\n Type /help to know more."
			);
		} else {
			await processCommand(msg);
		}
	} catch (error) {
		console.error("Error handling message:", error);
	}
}

async function processCommand(msg) {
	const text = msg.text;
	const chatId = msg.chat.id;

	try {
		if (text.startsWith("/")) {
			if (text.startsWith("/help")) {
				await bot.sendMessage(chatId, helpMessage);
			} else if (text.startsWith("/update_")) {
				const id = text.replace("/update_", "");
				const site = await site_list.getElementById(Number(id));
				if (site) {
					await checkForUpdates(site, chatId);
				} else {
					await bot.sendMessage(
						chatId,
						`Site with ID ${id} not found.`
					);
				}
			} else if (text.startsWith("/remove_")) {
				await handleMultipleIds(text, exclude, chatId);
			} else if (text.startsWith("/add_")) {
				await handleMultipleIds(text, include, chatId);
			} else if (text === "/listdb") {
				await listAllSites(chatId);
			} else if (text === "/mylist") {
				await myList(chatId);
			} else if (text === "/get_stat") {
				await sendFile("./data/sites.json");
				await sendFile("./data/sent_links.json");
				await sendFile("./data/subscribers.json");
			} else {
				await bot.sendMessage(
					chatId,
					"Unknown command. Type /help for a list of commands."
				);
			}
		}
	} catch (error) {
		console.error("Error processing command:", error);
	}
}

async function handleMultipleIds(text, action, chatId) {
	const ids = text.split("_")[1].split(",").map(Number);
	for (const id of ids) {
		await action(chatId, id);
	}
}
