const { app, dialog, BrowserWindow } = require("electron");
const { ipcMain } = require("electron");
const { connect, authenticate, LeagueClient } = require("league-connect");

const RequestManager = require("./scripts/request-manager");
const SessionManager = require("./scripts/session-manager");
const SaveManager = require("./scripts/save-manager");
const CacheManager = require("./scripts/cache-manager");

const roles = ["top", "middle", "bottom", "utility", "jungle", "fill"];
const rolesMap = [["top"], ["mid", "middle"], ["bot", "adc", "bottom"], ["supp", "assist", "utility"], ["jng", "jung", "jungler"]];

const signature = "RM: ";
String.prototype.withSignature = function() { return signature + this};
String.prototype.withoutSignature = function() {return this.replace(signature, "")};

async function loadSummoner(renderer, summoner) {
	if (!summoner) summoner = await RequestManager.pollRequest("GET", "/lol-summoner/v1/current-summoner", 2000);
	icon64 = await RequestManager.tryRequestImage("/lol-game-data/assets/v1/profile-icons/"+summoner.profileIconId+".jpg");
	renderer.send("current-summoner", summoner);
	renderer.send("summoner-icon", icon64);
	return summoner;
}

async function loadRunesInfo(primaryStyleId, subStyleId, selectedPerkIds) {
	return RequestManager.tryRequest("GET","/lol-game-data/assets/v1/perks.json").then(perksInfo => {
		return RequestManager.tryRequest("GET","/lol-game-data/assets/v1/perkstyles.json").then(perkstylesInfo => {
			return perkstylesInfo.styles.concat(perksInfo)
								 .filter(perk => perk.id == primaryStyleId || perk.id == subStyleId || selectedPerkIds.includes(perk.id))
								 .map(perk => { return {id:perk.id, 
														name:perk.name, 
														iconName:perk.iconPath.match("([\\w-_]+).png")[0],
														iconPath:perk.iconPath, 
														shortDesc:(perk.shortDesc || perk.tooltip).replace(/<[^<>]+>/g, "")} });
		});
	});
}

async function clientPostRunesPage(renderer, runesPage) {
	customPerksPage = (await RequestManager.tryRequest("GET", "/lol-perks/v1/pages/")).filter(page => page.name.includes(signature))[0];
	if (customPerksPage) await RequestManager.tryRequest("DELETE", "/lol-perks/v1/pages/"+customPerksPage.id);

	runesPage.name = runesPage.name.withSignature();
	RequestManager.tryRequest("POST", "/lol-perks/v1/pages/", runesPage).then((response) => {
		if (response.errorCode) renderer.send("post-runes-page-error", response.message)
	});
	runesPage.name = runesPage.name.withoutSignature();
}

async function findChampionsMatch(text) {
	let championsList = await RequestManager.tryRequest("GET", "/lol-game-data/assets/v1/champion-summary.json");
	let match = text.toLowerCase().trimLeft().trimRight().split(" ")
														 .map(word => 
															championsList.filter(champion => word != "" && 
																				(word.includes(champion.name.toLowerCase()) || 
																				champion.name.toLowerCase().includes(word))))
														 .reduce((a, c) => Array.from(new Set(a.concat(c)))) || [];
	return {fullList:championsList, match:match};
}

function findLaneMatch(text) {
	return roles[rolesMap.findIndex((roleAliases) => roleAliases.some((alias) => text.toLowerCase().includes(alias)))];
}

ipcMain.on("btn-quit-click", (event) => event.sender.getOwnerBrowserWindow().close());
ipcMain.on("btn-minimize-click", (event) => event.sender.getOwnerBrowserWindow().minimize());
ipcMain.on("btn-delete-click", (event, runesPage) => SaveManager.removePage(runesPage));
ipcMain.on("post-runes-page", (event, runesPage) => clientPostRunesPage(event.sender, runesPage));
ipcMain.on("btn-export-click", (event, validPath) => SaveManager.export(validPath));
ipcMain.on("btn-import-click", (event, validPath) => {
	SaveManager.import(validPath)
	event.sender.send("search-bar-reset");
});

ipcMain.on("btn-save-click",(event) => { 
	RequestManager.tryRequest("GET", "/lol-perks/v1/currentpage").then( async runesPage => {
		runesPage.name = runesPage.name.withoutSignature();
		let champions = await findChampionsMatch(runesPage.name);

		runesPage["champion"] = champions.match[0];
		runesPage["role"] = findLaneMatch(runesPage.name) || "fill";
		runesPage["selectedPerkInfos"] = await loadRunesInfo(runesPage.primaryStyleId, runesPage.subStyleId, runesPage.selectedPerkIds);
		
		if (champions.match.length != 1 || runesPage.role == "fill")
			event.sender.send("page-save-confirm", {page:runesPage, champions:champions.fullList});
		else if (SaveManager.savePage(runesPage)) event.sender.send("search-bar-reset");
	});
});

ipcMain.on("page-save-confirm", (event, runesPage) => { if (SaveManager.savePage(runesPage)) event.sender.send("search-bar-reset"); });

ipcMain.on("search-bar-change", async (event, text) => {
	if (text == "" || !text.trim().length) return SaveManager.resetFilter();
	SaveManager.applyFilter((await findChampionsMatch(text)).match, findLaneMatch(text) || "none");
});


async function init(credentials, mainWindow) {
	mainWindow.send("credentials", credentials);
	
	RequestManager.init(credentials);
	SaveManager.init(await loadSummoner(mainWindow), (updatedPages) => mainWindow.send("saved-pages-update", updatedPages));

	connect(credentials).then(webSocket => {
		SessionManager.init(mainWindow, webSocket, RequestManager);
		RequestManager.tryRequest("GET", "/lol-champ-select/v1/session").then((session) => SessionManager.loadSession(session));

		webSocket.subscribe("/lol-summoner/v1/current-summoner", (summoner, event) => loadSummoner(renderer, summoner));
		webSocket.subscribe("/lol-champ-select/v1/session", (session, event) => {
			if (event.eventType == "Create") SessionManager.loadSession(session);
			else if (event.eventType == "Delete") SessionManager.unloadSession();
		});
	});
}

function reset(renderer) { renderer.send("gui-reset"); }

app.on("ready", () => {
	let mainWindow = new BrowserWindow({
		width: 900,
		height: 400,
		minWidth: 900,
		minHeight: 400,
		useContentSize: true,
		frame:false,
		show:false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
		}
	});

	dialog.showErrorBox = (title, content) => {
		console.log(title+"\n"+content);
	}

	//mainWindow.webContents.openDevTools();
	mainWindow.loadFile("index.html").then(() => {
		setTimeout(() => mainWindow.show(), 1000);
		authenticate({awaitConnection:true, pollInterval:5000}).then(credentials => {
			init(credentials, mainWindow);
 
			let client = new LeagueClient(credentials);
			client.on("connect", newCredentials => init(newCredentials, mainWindow));
			client.on("disconnect", () => reset(mainWindow));
			client.start();
		});
	});
});

app.on("before-quit", () => CacheManager.clearCache());