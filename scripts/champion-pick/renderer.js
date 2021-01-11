const $ = require("jquery");
const ipcRenderer = require("electron").ipcRenderer;
const remote = require("electron").remote;
const CacheManager = require("./scripts/cache-manager");

class ChampionPick {
    credentials;
    runesPage;

    constructor() {
        ipcRenderer.on("credentials", (event, credentials) => this.credentials = credentials);
        ipcRenderer.on("load-data", (event, loadData) => {
            this.runesPage = loadData.page;
            
            this.loadLane(loadData.page.role)
            this.loadChampion(loadData.page.champion);
            this.loadAllChampions(loadData.champions.sort((c1,c2) => {
                    if (c1.name == "None") return -1;
                    if (c2.name == "None") return 1;
                    return c1.name.localeCompare(c2.name);
				}));
            
            $(".dropdown .dropdown-content").on("mousewheel", (event) => {
                let step = 50;
                $(event.currentTarget).scrollTop($(event.currentTarget).scrollTop() + (event.originalEvent.deltaY > 0 ? step : -step));
                event.preventDefault();
            });
            $("#btn-confirm").on("click", () => {
                ipcRenderer.send("page-save-confirm", this.runesPage);
                remote.getCurrentWindow().close();
            });

            $(".btn-champion").on("click", (event) => this.loadChampion($(event.currentTarget).data("champion")));
            $(".btn-lane").on("click", (event) => this.loadLane($(event.currentTarget).attr("lane")));
        });
    }

    loadLane(lane) {
        this.runesPage.role = lane;

        $("#lane").attr("src", "res/icon-position-"+lane+"-blue.png");
        if (lane == "fill") lane = "Any Lane"
        $("#lane-name").text(lane.charAt(0).toUpperCase() + lane.slice(1))
    }

    loadChampion(champion) {
        if (champion?.name == "None") champion = undefined;
        this.runesPage.champion = champion;

        CacheManager.get((champion?.id || "-1")+".png", "/lol-game-data/assets/v1/champion-icons/"+(champion?.id || "-1")+".png", this.credentials)
                    .then(icon64 => $("#champion").css("background-image", "url(data:image/png;base64,"+icon64+")"));
        $("#champion-name").text(champion?.name || "Any Champion")
    }

    loadAllChampions(champions) {
        let $content = $("#champions-dropdown .dropdown-content");

        champions.forEach(champion => {
            let $newItem = $("<div class='btn-champion sharp-item'></div>")
            let $champion = $("<span class='content-champion-icon'></span>")
            let $champion_name = $("<span class='name regular-text'></span>");

            CacheManager.get((champion?.id || "-1")+".png", "/lol-game-data/assets/v1/champion-icons/"+(champion?.id || "-1")+".png", this.credentials)
                        .then(icon64 => $champion.css("background-image", "url(data:image/png;base64,"+icon64+")"));
            $champion_name.text(champion.name == "None" ? "Any Champion" : champion.name);
            $newItem.data("champion", champion);
            
            
            $champion.appendTo($newItem);
            $champion_name.appendTo($newItem);
            $newItem.appendTo($content);
        });
    }
}


$(() => new ChampionPick())
