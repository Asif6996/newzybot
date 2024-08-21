import fs from "fs";

export default class JSONFileHandler {
	constructor(filePath) {
		this.filePath = filePath;
	}

	// Read JSON file and parse its content
	readJSONFile() {
		return new Promise((resolve, reject) => {
			fs.readFile(this.filePath, "utf8", (err, data) => {
				if (err) {
					reject("Error reading the file:", err);
					return;
				}
				try {
					let jsonArray = JSON.parse(data);
					resolve(jsonArray);
				} catch (err) {
					reject("Error parsing JSON:", err);
				}
			});
		});
	}

	// Write data to JSON file
	writeJSONFile(data) {
		return new Promise((resolve, reject) => {
			fs.writeFile(
				this.filePath,
				JSON.stringify(data, null, 2),
				"utf8",
				(err) => {
					if (err) {
						reject("Error writing to the file:", err);
						return;
					}
					resolve("JSON data has been updated.");
				}
			);
		});
	}

	// Add element to JSON array
	async addElement(newElement) {
		try {
			const jsonArray = await this.readJSONFile();
			jsonArray.push(newElement);
			await this.writeJSONFile(jsonArray);
			console.log("Element added to JSON array.");
		} catch (err) {
			console.error(err);
		}
	}

	// Remove element from JSON array
	async removeElement(element) {
		try {
			let jsonArray = await this.readJSONFile();
			jsonArray = jsonArray.filter((item) => item !== element);
			await this.writeJSONFile(jsonArray);
			console.log("Element removed from JSON array.");
		} catch (err) {
			console.error(err);
		}
	}

	// Get all elements from JSON Array
	async getElements() {
		try {
			const jsonArray = await this.readJSONFile();
			return jsonArray;
		} catch (err) {
			console.error(err);
		}
	}
	// Get element from JSON Array by ID
	async getElementById(id) {
		try {
			const elements = await this.getElements();
			const element = elements.find((el) => el.id === id);

			if (element) {
				return element; // Return the found element
			} else {
				return `No element found with ID: ${id}`; // Return a message if not found
			}
		} catch (error) {
			console.error("Error:", error);
			throw error; // Re-throw the error to be handled by the caller
		}
	}
	async getElementByURL(url) {
		try {
			const elements = await this.getElements();
			const element = elements.find((el) => el.url === url);

			if (element) {
				return element; // Return the found element
			} else {
				return `No element found with url: ${url}`; // Return a message if not found
			}
		} catch (error) {
			console.error("Error:", error);
			throw error; // Re-throw the error to be handled by the caller
		}
	}
}
