import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { bot } from "../index.js";

import JSONFileHandler from "../src/json-handler.js";
const site_list = new JSONFileHandler("./data/sites.json");
const sent_links = new JSONFileHandler("./data/sent_links.json");
const subscribers = new JSONFileHandler("./data/subscribers.json");

export { site_list, subscribers };

async function getLinkByCheerio(url, selectors) {
	try {
		const { data } = await axios.get(url);
		const $ = cheerio.load(data);
		const [linkSelector, titleSelector, descriptionSelector] = selectors;
		const link = $(linkSelector).attr("href");
		if (!link) return false;
		const { origin } = new URL(url);
		const fullLink = link.startsWith("http") ? link : `${origin}${link}`;
		const title = $(titleSelector).first().text();
		const description = descriptionSelector
			? $(descriptionSelector).first().text()
			: "";
		return [
			`${
				description ? `${description}\n\n` : ""
			}<a href="${fullLink}">${title}</a>`,
			fullLink,
		];
	} catch (error) {
		console.error(`Error fetching or processing the URL: ${error.message}`);
		return false;
	}
}

async function getLinkByFetch(url, selectors) {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Network response was not ok: ${response.statusText}`
			);
		}
		let data;
		try {
			data = await response.json();
		} catch (jsonError) {
			throw new Error("Failed to parse JSON");
		}
		const [
			traverseSelectors,
			titleSelector,
			descriptionSelector,
			linkSelector,
		] = selectors;
		for (const selector of traverseSelectors) {
			data = data?.[selector];
			if (!data) return null; // Early exit if data is undefined or null
		}
		const link = data?.[linkSelector];
		if (!link) return null;
		const fullLink = link.startsWith("http")
			? link
			: new URL(link, url).href;
		const description = data?.[descriptionSelector] || "";
		const title = data?.[titleSelector] || "";

		return [
			`${description}\n\n<a href="${fullLink}"><em>${title}</em></a>`,
			fullLink,
		];
	} catch (error) {
		console.error("Error:", error.message);
		return false;
	}
}

export async function checkForUpdates(elem, chatId) {
	try {
		const { type, url, selector, name, section, id } = elem;
		const fullLink = await (type === "StaticWeb"
			? getLinkByCheerio(url, selector)
			: getLinkByFetch(url, selector));
		if (!fullLink) {
			console.error(`Error on ${name} ${section}: No link found.`);
			return;
		}
		const sentLinksArray = await sent_links.getElements();

		if (!sentLinksArray.includes(fullLink[1])) {
			// Add the link to the list and notify subscribers
			await Promise.all([
				// Add the link to the list in the queue
				sent_links.writeJSONFile([...sentLinksArray, fullLink[1]]),
				// Notify all subscribers
				sendToAllSubscribers(
					`<b>${name} ${section}:\n\n${fullLink[0]}</b>`,
					id
				),
			]);
			console.log(fullLink[1]);
		}

		if (chatId) {
			console.log(fullLink);
			await bot.sendMessage(
				chatId,
				`<b>${name} ${section}:\n\n${fullLink[0]}</b>`,
				{ parse_mode: "HTML" }
			);
		}
	} catch (error) {
		console.error(
			`Error checking for updates on ${elem.name}: ${error.message}`
		);
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// Usage with async/await



export async function checkForUpdatesAll() {
	try {
		const sites = await site_list.getElements();
		for (const elem of sites) {
			await checkForUpdates(elem);
		}
	} catch (error) {
		console.error("Error getting sites:", error.message);
	}
}


export async function sendToAllSubscribers(link, site_id) {
	try {
		const userArray = await subscribers.getElements();
		const usersToSend = userArray.filter(
			(user) => !user.exclude.includes(site_id)
		);
		await Promise.all(
			usersToSend.map((user) =>
				bot.sendMessage(user.userid, link, { parse_mode: "HTML" })
			)
		);
	} catch (error) {
		console.error("Error sending messages:", error.message);
	}
}

export async function listAllSites(chatId) {
	try {
		const sites = await site_list.getElements();
		const message = [
			"List Of All Available News Sites In The Format Of \n\nSite ID: Site Name\n",
			...sites.map((site) => `${site.id}: ${site.name} ${site.section}`),
		].join("\n");

		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error(
			`Error getting sites for chatId ${chatId}:`,
			error.message
		);
	}
}

export async function myList(chatId) {
	try {
		const [sites, userArray] = await Promise.all([
			site_list.getElements(),
			subscribers.getElements(),
		]);

		const user = userArray.find((user) => user.userid === chatId);
		const excludes = user?.exclude || [];

		const message = [
			"List OF Your Favourite News Sites In The Format Of \n\nSite ID: Site Name\n",
			...sites
				.filter((site) => !excludes.includes(site.id))
				.map((site) => `${site.id}: ${site.name} ${site.section}`),
		].join("\n");

		await bot.sendMessage(chatId, message);
	} catch (error) {
		console.error(
			`Error getting user's site list for chatId ${chatId}:`,
			error.message
		);
	}
}

export async function exclude(userid, excludeid) {
	try {
		const [userArray, site] = await Promise.all([
			subscribers.getElements(),
			site_list.getElementById(excludeid),
		]);

		const user = userArray.find((user) => user.userid === userid);

		if (!site || typeof site !== "object") {
			await bot.sendMessage(
				userid,
				`Site With ID "${excludeid}" Not Found.`
			);
			console.log(`Site With ID "${excludeid}" not found.`);
			return;
		}

		if (!user.exclude.includes(excludeid)) {
			user.exclude.push(excludeid);
			await subscribers.writeJSONFile(userArray);
			await bot.sendMessage(
				userid,
				`${site.id}:${site.name} ${site.section} Has Been Removed From Your Favorite List.`
			);
			console.log(
				`Updated exclude list for userid ${userid}:`,
				user.exclude
			);
		} else {
			await bot.sendMessage(
				userid,
				`${site.id}:${site.name} ${site.section} Is NOT In Your Favorite List.`
			);
			console.log(`${excludeid} Is NOT In ${userid}'s Favorite List.`);
		}
	} catch (error) {
		await bot.sendMessage(userid, "An error occurred");
		console.error(
			`Error excluding site ${excludeid} for userid ${userid}:`,
			error.message
		);
	}
}

export async function include(userid, includeid) {
	try {
		const [userArray, site] = await Promise.all([
			subscribers.getElements(),
			site_list.getElementById(includeid),
		]);

		const user = userArray.find((user) => user.userid === userid);

		if (!site || typeof site !== "object") {
			await bot.sendMessage(
				userid,
				`Site With ID "${includeid}" Not Found.`
			);
			console.log(`Site With ID "${includeid}" not found.`);
			return;
		}

		if (user.exclude.includes(includeid)) {
			user.exclude = user.exclude.filter((item) => item !== includeid);
			await subscribers.writeJSONFile(userArray);
			await bot.sendMessage(
				userid,
				`${site.id}:${site.name} ${site.section} Has Been Added to Your Favorite List.`
			);
			console.log(
				`Updated exclude list for userid ${userid}:`,
				user.exclude
			);
		} else {
			await bot.sendMessage(
				userid,
				`${site.id}:${site.name} ${site.section} Is Already In Favorite List.`
			);
			console.log(
				`Site With ID ${includeid} Is Already In Favorite List Of ${userid}.`
			);
		}
	} catch (error) {
		await bot.sendMessage(userid, "An error occurred");
		console.error(
			`Error including site ${includeid} for userid ${userid}:`,
			error.message
		);
	}
}

export async function sendFile(filePath) {
	try {
		await bot.sendDocument(1447379075, fs.createReadStream(filePath), {
			contentType: "application/json",
		});
		console.log("File sent successfully:", filePath);
	} catch (error) {
		console.error(`Error sending file "${filePath}":`, error.message);
	}
}
