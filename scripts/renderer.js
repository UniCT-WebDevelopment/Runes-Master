const $ = require("jquery");
const remote = require("electron").remote;
const ipcRenderer = require("electron").ipcRenderer;

const CacheManager = require("./scripts/cache-manager");

class RunesManager {
	typingTimeout;
	tooltipTimeout;

	activeSession;
	currentPick;

	credentials;

	constructor() {
		ipcRenderer.on("credentials", (event, credentials) => this.credentials = credentials);

		ipcRenderer.on("current-summoner", (event, summoner) => this.updateSummoner(summoner));
		ipcRenderer.on("summoner-icon", (event, icon64) => this.updateSummonerIcon(icon64));

		ipcRenderer.on("current-session-create", (event, lane) => this.sessionCreated(lane));
		ipcRenderer.on("current-session-delete", (event) => this.sessionDeleted());
		ipcRenderer.on("champion-selection", (event, selection) => this.updateSelection(selection));

		ipcRenderer.on("page-save-confirm", (event, loadData) => this.openChampionPick(loadData));
		ipcRenderer.on("saved-pages-update", (event, savedPages) => this.updateSavedPages(savedPages));

		ipcRenderer.on("post-runes-page-error", (event, error) => this.showMessage(error));

		ipcRenderer.on("gui-reset", (event) => this.resetInterface());
		ipcRenderer.on("search-bar-reset", (event) => $("#search-bar").val(""));

		$("#button-quit").on("click", () => ipcRenderer.send("btn-quit-click"));
		$("#button-minimize").on("click", () => ipcRenderer.send("btn-minimize-click"));
		$("#button-import-saves").on("click", (event) => { if($(event.target).hasClass("button")) remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
				filters: [{name: "Pages File", extensions: ["json"]}]
			}).then(result => { if (!result.canceled) ipcRenderer.send("btn-import-click", result.filePaths[0]); })});
		$("#button-export-saves").on("click", (event) => { if($(event.target).hasClass("button")) remote.dialog.showSaveDialog(remote.getCurrentWindow(), {
				defaultPath: "saved-pages",
				properties: ["openDirectory"],
				filters: [{name: "Pages File", extensions: ["json"]}]
			}).then(result => { if (!result.canceled) ipcRenderer.send("btn-export-click", result.filePath); })});
		$("#button-save-page").on("click", (event) => { if($(event.target).hasClass("button")) ipcRenderer.send("btn-save-click"); });

		$("#search-bar").on("input", (event) => {
			clearTimeout(this.typingTimeout);
			this.typingTimeout = setTimeout(() => ipcRenderer.send("search-bar-change", $(event.target).val()), 300);
		});
		
		$("#tooltip").on("mouseover", () => $("#app-title").css("-webkit-app-region", "no-drag"));
		$("#tooltip").on("mouseleave", () => $("#app-title").css("-webkit-app-region", "drag"));

		$("#pages-list").on("mouseover mousemove mouseleave", "li", () => clearTimeout(this.tooltipTimeout));
		$("#pages-list").on("mouseover mousemove ", "li", (event) => this.tooltipTimeout = setTimeout(() => this.showTooltip($(event.currentTarget)), 500));
		$("#pages-list").on("mouseleave", "li", (event) => {
			$("#tooltip").removeClass("visible"); 
			$(event.currentTarget).css("border-color", "")
		});

		$("#pages-list").on("mousedown", "li", (event) => { if(event.button == 0) $(event.currentTarget).css("border-color", "#00b300") });
		$("#pages-list").on("mouseup", "li", (event) => { 
			$(event.currentTarget).css("border-color", "");
			if(event.button == 0) ipcRenderer.send("post-runes-page", $(event.currentTarget).data("runesPage"));
		});

		$("#pages-list").on("mouseover", "li .button-delete-page", (event) => $(event.currentTarget).parent().css("border-color", "#dc0000"));
		$("#pages-list").on("mouseleave", "li .button-delete-page", (event) => $(event.currentTarget).parent().css("border-color", ""));
		$("#pages-list").on("mousedown mouseup", "li .button-delete-page", (event) => event.stopPropagation());
		$("#pages-list").on("click", "li .button-delete-page", (event) => {
			ipcRenderer.send("btn-delete-click", $(event.currentTarget).parent().data("runesPage"));
			event.stopPropagation();
		});
	}

	async showTooltip($item) {
		let $tooltip = $("#tooltip");
		if ($tooltip.hasClass("visible")) return;
		$tooltip.css("top", Math.max($item.position().top - $tooltip[0].offsetHeight - 8, 19))
				.css("left", $item.position().left - $tooltip[0].offsetWidth + $item[0].offsetWidth + 4);

		let perkRequests = [];
		let page = $item.data("runesPage");
		for (let i = 0; i < 11; i++) {
			let perkId = (i < 9 ? page.selectedPerkIds[i] : (i == 9 ? page.primaryStyleId : page.subStyleId));
			if (perkId > 0) {
				let perkInfo = page.selectedPerkInfos.filter(perkInfo => perkInfo.id == perkId)[0];
				perkRequests.push(CacheManager.get(perkInfo.iconName, perkInfo.iconPath, this.credentials).then(icon64 => 
														$tooltip.find("#tooltip-perk-" + i).attr("src", "data:image/png;base64," + icon64)
												   	   									   .attr("title", perkInfo.shortDesc)));
			} else $("#tooltip-perk-" + i).attr("src", "res/default_black.jpg")
										  .attr("title", "");
		}
		Promise.all(perkRequests).then(() =>$tooltip.addClass("visible"));
	}
	
	updateSummoner(summoner) {
		if (summoner) this.setControlsEnabled(true);
		else this.setControlsEnabled(false);
		$("#summoner-name").html(summoner ? summoner.displayName : "Waiting for client...");
		$("#summoner-level").html("Level: " + "<span>"+ (summoner ? summoner.summonerLevel : "") +"</span>");
	}

	updateSummonerIcon(icon64) {
		$("#summoner-icon").attr("src", icon64 ? "data:image/jpg;base64," + icon64 : "res/default_icon.jpg");
	}

	sessionCreated(lane) {
		this.updateSelection();

		if (lane == "") lane = "fill";
		$("#picked-lane-icon").attr("src", "res/icon-position-"+lane+"-blue.png");
		$("#pick-data").animate({
			opacity: 1
		}, 500);

		if (lane != "fill") this.setPicking(lane);
		this.activeSession = true;
	}

	sessionDeleted() {
		$("#pick-data").animate({
			opacity: 0
		 }, 500);

		 this.setPicking("");
		 this.activeSession = false;
	}

	updateSelection(selection) {
		if (!selection) $("#picked-champion-icon").attr("src", "res/default_icon.jpg");
		else {
			$("#picked-champion-icon").attr("src", "data:image/png;base64," + selection.icon);
			
			let pick;
			if (selection.name) pick = selection.name + (selection.lane ? " " + selection.lane : "");
			else if (selection.lane) pick = selection.lane;
			if (this.currentPick != pick) this.setPicking(pick);
		}
	}

	updateSavedPages(savedPages) {
		let $pagesList = $("#pages-list");
		$pagesList.empty();
		savedPages?.forEach(page => { 
			console.log(page);
			let $newItem = $("<li title='"+page.name+"' style='opacity:0' class='small-champion-icon'></li>")
			$newItem.data("runesPage", page);
			$newItem.append("<div class='lane-icon-background small-shadow-item'><img class='lane-icon' src='res/icon-position-"+page.role+"-blue.png'></div>")
			$newItem.append("<i class='button-delete-page'>")
			CacheManager.get((page.champion?.id || "-1")+".png", "/lol-game-data/assets/v1/champion-icons/"+(page.champion?.id || "-1")+".png", this.credentials)
						.then(icon64 => $newItem.css("background-image", "url(data:image/png;base64,"+icon64+")"));
			$newItem.appendTo($pagesList);
			$newItem.animate({opacity: 1}, 200);

		});
		clearTimeout(this.tooltipTimeout);
		$("#tooltip").removeClass("visible");
		if (this.activeSession && savedPages.length == 1) ipcRenderer.send("post-runes-page", savedPages[0]);
	}

	showMessage(message) {
		$("#message span").text(message);
		setTimeout(() => {
			$("#message span").text("");
		}, 2000);
	}

	resetInterface() {
		this.updateSummoner();
		this.updateSummonerIcon();
		this.updateSavedPages();
		this.setPicking("", true);
	}

	setPicking(value, skipUpdate) {
		$("#search-bar").val(value);
		this.currentPick = value;
		if (!skipUpdate) ipcRenderer.send("search-bar-change", value)
	}

	setControlsEnabled(enabled) {
		let $controls = $("#pages-data-controls > div > div")
		if (enabled) $controls.addClass("button");
		else $controls.removeClass("button");
		$("#search-bar").prop("disabled", !enabled)
	}s

	openChampionPick(loadData) {
		let mainWindow = remote.getCurrentWindow();
		let win = new remote.BrowserWindow({
			parent: mainWindow,
			modal: true,
			minimizable: false,
			useContentSize: true,
			width: 550,
			height: 300,
			show: false,
			webPreferences: {
				nodeIntegration: true,
				contextIsolation: false,
				enableRemoteModule: true,
			}
		});
		win.removeMenu();
		win.setPosition(mainWindow.getPosition()[0] + Math.floor((mainWindow.getSize()[0] - win.getSize()[0]) / 2), 
						mainWindow.getPosition()[1] + Math.floor((mainWindow.getSize()[1] - win.getSize()[1] + 30) / 2))
		//win.webContents.openDevTools();
		win.loadFile("champion-pick.html").then(async () => {
			win.send("credentials", this.credentials);
			win.send("load-data", loadData);

			setTimeout(() => win.show(), 500);
		});
	}
}

$(() => new RunesManager());