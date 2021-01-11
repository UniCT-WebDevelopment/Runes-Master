class SessionManager {
    static renderer;
    static webSocket;
	static requestManager;
	
    static lastSessionCellID;
    
    static init(renderer, webSocket, requestManager) {
        this.renderer = renderer;
        this.webSocket = webSocket;
        this.requestManager = requestManager;
    }

	static async loadChampSelection(champ_selection) {
		let championId = champ_selection.championIconStyle.match("([0-9]+).png")?.[1];
		if (championId == undefined) return this.renderer.send("champion-selection");

		this.requestManager.tryRequest("GET","/lol-game-data/assets/v1/champions/"+championId+".json").then(champion => {
			this.requestManager.tryRequestImage("/lol-game-data/assets/v1/champion-tiles/"+championId+"/"+champion.skins[0].id+".jpg").then(icon64 => {
				this.renderer.send("champion-selection", {"name":champion.name, "lane":champ_selection.assignedPosition, "icon":icon64});
			});
		});
	}

	static async loadSession(session) {
        if (session.gameId == undefined) return;
        
		this.lastSessionCellID = session.localPlayerCellId % 5;

		this.webSocket.subscribe("/lol-champ-select/v1/summoners/"+this.lastSessionCellID, (champ_selection, event) => this.loadChampSelection(champ_selection));
		
		let champ_selection = await this.requestManager.tryRequest("GET", "lol-champ-select/v1/summoners/"+this.lastSessionCellID);
		this.loadChampSelection(champ_selection);
		this.renderer.send("current-session-create", champ_selection.assignedPosition);
	}

	static async unloadSession() {
		this.webSocket.unsubscribe("/lol-champ-select/v1/summoners/"+this.lastSessionCellID)
		this.renderer.send("current-session-delete");
	}
}

module.exports = SessionManager;