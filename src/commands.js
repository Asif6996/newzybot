import {
	checkForUpdates,
	exclude,
	include,
	listAllSites,
	myList,
	site_list,
	addNewSite,
	sendFile,
} from "./services.js";

const help = `
**Help Message for "Newwzy" News Update Bot**

This bot monitors news sites for updates and communicates with subscribers based on their preferences. Here’s a guide on how to use the bot and its available commands:



1. **Get the List of All News Sites**
   - Command: /listdb
   - Example: /listdb
   - Description: Prints a list of all available news sites with their IDs and names.

2. **Check for Latest Update for a Specific Site**
   - Command: /update_"Site-ID"
   - Example: /update_1001
   - Description: Checks for the latest updates from a specific site. Replace "Site-ID" with the actual ID of the site you want to check.

3. **Get Your Favorite News Sites**
   - Command: /mylist
   - Example: /mylist
   - Description: Retrieves and sends a list of your favorite news sites. Excludes sites you have marked as not of interest.

4. **Remove Site(s) from Your Favorites**
   - Command: /remove_"Site-ID1,Site-ID2,..."
   - Example: /remove_1000,1001,1002
   - Description: Removes site(s) from your favorites list. Replace "Site-ID1,Site-ID2,..." with the IDs of the sites you wish to remove, separated by commas.

5. **Add Site(s) in Your Favorites**
   - Command: /add_"Site-ID1,Site-ID2,..."
   - Example: /add_1000,1001,1002
   - Description: Adds site(s) to your favorite list. Replace ""Site-ID1,Site-ID2,..." with the IDs of the sites you wish to add, separated by commas.

6. **Add a New Site in Database**
   - Command: /new_SiteName,Section,URL,Selector"
   - Example: /new_The Daily Star,Satire,https://www.thedailystar.net/satireday,.card-content a
   - Description: Adds Provided site to Database.

7. **Print This Message**
   - Command: /help
   - Description: Prints This Message.

**Note**: Make sure to replace placeholders (e.g., "Site-ID") with actual values and ensure your bot has the necessary permissions to send messages and retrieve site data.

`;
export async function handleMessage(msg, bot, subscribers) {
	const chatId = msg.chat.id;
	try {
		const userArray = await subscribers.getElements();
		if (!userArray.some((user) => user.userid === chatId)) {
			await subscribers.addElement({
				userid: chatId,
				username: msg.chat.username,
				exclude: [],
			});
			bot.sendMessage(
				chatId,
				"Now you are a subscriber.\n Type /help to know more."
			);
		} else {
			await processCommand(msg, bot);
		}
	} catch (error) {
		console.error("Error handling message:", error);
	}
}

async function processCommand(msg, bot) {
	const text = msg.text;
	if (text.includes("/help")) {
		bot.sendMessage(msg.chat.id, help);
	} else if (text.includes("/update_")) {
		const id = Number(text.replace("/update_", ""));

		await checkForUpdates(
			await site_list.getElementById(id),
			bot,
			msg.chat.id
		);
	} else if (text.includes("/remove_")) {
		const excludeids = text.replace("/remove_", "").split(",").map(Number);
		for (const excludeid of excludeids) {
			await exclude(msg.chat.id, excludeid, bot);
		}
	} else if (text.includes("/add_")) {
		const includeids = text.replace("/add_", "").split(",").map(Number);
		for (const includeid of includeids) {
			await include(msg.chat.id, includeid, bot);
		}
	} else if (text.includes("/listdb")) {
		await listAllSites(bot, msg.chat.id);
	} else if (text.includes("/mylist")) {
		await myList(bot, msg.chat.id);
	} else if (text.includes("/new_")) {
		const arr = text.replace("/new_", "").split(",");
		await addNewSite(arr, msg, bot);
	} else if (text == "/get_stat") {
		await sendFile(bot, "./data/sites.json");
		await sendFile(bot, "./data/sent_links.json");
		await sendFile(bot, "./data/subscribers.json");
	}
}
