import axios, { all } from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import JSONFileHandler from "../src/json-handler.js";
const site_list = new JSONFileHandler("./data/sites.json");
const sent_links = new JSONFileHandler("./data/sent_links.json");
const subscribers = new JSONFileHandler("./data/subscribers.json");

export { site_list };

async function checkByCheerio(url, selector) {
	const response = await axios.get(url);
	const $ = cheerio.load(response.data);
	const link = $(selector).attr("href");
	if (link) {
		url = new URL(url);
		const fullLink = url.origin + link.replace(url.origin, "");
		return fullLink;
	} else {
		return false;
	}
}

export async function checkForUpdates(elem, bot, chatId) {
	try {
		const fullLink = await checkByCheerio(elem.url, elem.selector);

		if (!fullLink) {
			console.log("Error on", elem.name, elem.section, "\n", fullLink);
		} else {
			const sentLinksArray = await sent_links.getElements();
			if (!sentLinksArray.includes(fullLink)) {
				await sent_links.addElement(fullLink);
				await sendToAllSubscribers(fullLink, elem.id, bot);
				console.log(fullLink);
			}
			if (chatId) {
				console.log(fullLink);
				await bot.sendMessage(chatId, fullLink);
			}
		}
	} catch (error) {
		// console.error("Error fetching data");
	}
}

export async function checkForUpdatesAll(bot) {
	try {
		const sites = await site_list.getElements();
		for (const elem of sites) {
			await checkForUpdates(elem, bot);
		}
	} catch (error) {
		console.error("Error getting sites:", error);
	}
}

export async function sendToAllSubscribers(link, site_id, bot) {
	try {
		const userArray = await subscribers.getElements();
		for (const user of userArray) {
			if (!user.exclude.includes(site_id)) {
				await bot.sendMessage(user.userid, link);
			}
		}
	} catch (error) {
		console.error("Error sending messages:", error);
	}
}

export async function listAllSites(bot, chatId) {
	try {
		const sites = await site_list.getElements();
		let message =
			"List Of All Available News Sites In The Format Of \n\nSite ID: Site Name\n\n";
		for (const element of sites) {
			message += `${element.id}: ${element.name} ${element.section}\n`;
		}
		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error("Error getting sites");
	}
}

export async function myList(bot, chatId) {
	try {
		const sites = await site_list.getElements();
		const userArray = await subscribers.getElements();
		const user = userArray.find((user) => user.userid === chatId);
		const excludes = user.exclude;
		let message =
			"List OF Your Favourite News Sites In The Format Of \n\nSite ID: Site Name\n\n";
		for (const site of sites) {
			if (!excludes.includes(site.id)) {
				message += `${site.id}: ${site.name} ${site.section}\n`;
			}
		}

		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error("Error getting sites");
	}
}

export async function exclude(userid, excludeid, bot) {
	try {
		const userArray = await subscribers.getElements();
		const site = await site_list.getElementById(excludeid);
		const user = userArray.find((user) => user.userid === userid);

		if (typeof site === "object") {
			if (!user.exclude.includes(excludeid)) {
				user.exclude.push(excludeid);
				await subscribers.writeJSONFile(userArray);
				bot.sendMessage(
					userid,
					` ${site.id}:${site.name} ${site.section} Has Been Removed From Your Favorite List.`
				);
				console.log(
					`Updated exclude list for userid ${userid}:`,
					user.exclude
				);
			} else {
				bot.sendMessage(
					userid,
					`${site.id}:${site.name} ${site.section} Is NOT In Your Favorite List.`
				);
				console.log(
					`${excludeid} Is NOT In ${user.id}'s Favorite List.`
				);
			}
		} else {
			bot.sendMessage(userid, `Site With ID "${excludeid}" Not Found.`);
			console.log(`Site With ID "${excludeid}" not found.`);
		}
	} catch (error) {
		bot.sendMessage(userid, "An error occurred");
		console.error("An error occurred");
	}
}

export async function include(userid, includeid, bot) {
	try {
		const userArray = await subscribers.getElements();
		const site = await site_list.getElementById(includeid);
		const user = userArray.find((user) => user.userid === userid);

		if (!(typeof site === "object")) {
			bot.sendMessage(userid, `Site With ID ${includeid} Not Found.`);
			console.log(`Site With ID ${includeid} Not Found.`);
		} else {
			if (user.exclude.includes(includeid)) {
				user.exclude = user.exclude.filter(
					(item) => item !== includeid
				);
				await subscribers.writeJSONFile(userArray);
				bot.sendMessage(
					userid,
					` ${site.id}:${site.name} ${site.section} Has Been Added to Your Favorite List.`
				);
				console.log(
					`Updated exclude list for userid ${userid}:`,
					user.exclude
				);
			} else {
				bot.sendMessage(
					userid,
					`${site.id}:${site.name} ${site.section} Is Already In Favorite List.`
				);
				console.log(
					`Site With ID ${includeid} Is Already In Favorite List OF ${user.id}.`
				);
			}
		}
	} catch (error) {
		console.error("An error occurred:", error);
	}
}

export async function addNewSite(arr, msg, bot) {
	try {
		const sites = await site_list.getElements();
		const url = new URL(arr[2]);
		const site = await site_list.getElementByURL(arr[2]);

		if (arr.length < 4) {
			bot.sendMessage(msg.chat.id, "Not Enough Information");
		} else if (typeof site == "object") {
			await bot.sendMessage(
				msg.chat.id,
				`${site.id}: ${site.name} ${site.section} Is Already In Database.`
			);
		} else {
			if (await checkByCheerio(arr[2], arr[3])) {
				const obj = {
					id: sites[sites.length - 1].id + 1,
					name: arr[0],
					section: arr[1],
					ischeerio: true,
					site: url.origin,
					url: url,
					selector: arr[3],
				};
				await site_list.addElement(obj);
				await bot.sendMessage(
					msg.chat.id,
					`${obj.id}: ${obj.name} ${obj.section} Has Been Added To Database`
				);
			} else {
				await bot.sendMessage(
					msg.chat.id,
					"Error Getting Link, Check Selector OR URL"
				);
			}
		}
	} catch (error) {
		console.error("An error occurred:", error);
	}
}

export async function sendFile(bot, filePath) {
	try {
		await bot.sendDocument(1447379075, fs.createReadStream(filePath));
		console.log("File sent successfully");
	} catch (error) {
		console.error("Error sending file:", error);
	}
}
