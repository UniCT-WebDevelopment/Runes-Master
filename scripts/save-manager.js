const {app} = require("electron");
const fs = require("fs");

//https://stackoverflow.com/questions/42946561/how-can-i-push-an-element-into-array-at-a-sorted-index-position/42946562
Array.prototype.pushSorted = function(el, compareFn) {
    this.splice((function(arr) {
        var m = 0;
        var n = arr.length - 1;

        while(m <= n) {
        var k = (n + m) >> 1;
        var cmp = compareFn(el, arr[k]);
        if(cmp > 0) m = k + 1;
            else if(cmp < 0) n = k - 1;
            else return k;
        }
        return m;
    })(this), 0, el);
};
  
class SaveManager {
    static filePath;
    static fileFullPath;
    static fileName = "saved-pages.json";
    
    static savedPages = [];
    static currentFilter = () => true;

    static updateRendererCallback;

    static init(summoner, updateRendererCallback) {
        this.filePath = app.getPath("userData")+"\\Profiles-Saves\\"+summoner.summonerId+"\\"
        this.fileFullPath = app.getPath("userData")+"\\Profiles-Saves\\"+summoner.summonerId+"\\"+this.fileName;
        this.updateRendererCallback = updateRendererCallback;
        console.log(this.fileFullPath);

        if (!fs.existsSync(this.fileFullPath)) {
            fs.mkdirSync(this.filePath, { recursive: true });
            fs.writeFileSync(this.fileFullPath, "[]");
        } else this.savedPages = JSON.parse(fs.readFileSync(this.filePath + this.fileName));
        updateRendererCallback(this.savedPages);
    }

    static applyFilter(matchingChampions, matchingRole) {
        let champFilter = page => !page.champion || matchingChampions.some(champion => champion.name == page.champion.name);
        let roleFilter = page => matchingRole == "none" || page.role == "fill" || page.role == matchingRole;
        
        if (matchingRole == "none") this.currentFilter = champFilter;
        else if (matchingChampions.length == 0) this.currentFilter = roleFilter;
        else this.currentFilter = page => champFilter(page) && roleFilter(page);

        this.updateRendererCallback(this.savedPages.filter(this.currentFilter));
    }

    static resetFilter() {
        this.currentFilter = () => true;
        this.updateRendererCallback(this.savedPages.filter(this.currentFilter));
    }

    static pageIndex(runesPage) {
        return this.savedPages.findIndex((page) => page.name.toLowerCase() == runesPage.name.toLowerCase());
    }

    static savePage(runesPage) {
        let compareFn = (p1, p2) => {
            if(p1.champion == p2.champion) return p1.role.localeCompare(p2.role);
            if (p1.champion == undefined) return 1;
            if (p2.champion == undefined) return -1;
            return p1.champion.name.localeCompare(p2.champion.name);
        }

        let matchingPage = this.pageIndex(runesPage);
        if (matchingPage != -1) this.savedPages.splice(matchingPage, 1);
        this.savedPages.pushSorted(runesPage, compareFn)
        this.save();
    }

    static removePage(runesPage) {
        let index = this.savedPages.map(page => page.name).indexOf(runesPage.name);
        this.savedPages.splice(index, 1);
        this.save();
    }

    static save() {
        fs.writeFileSync(this.fileFullPath, JSON.stringify(this.savedPages));
        this.updateRendererCallback(this.savedPages.filter(this.currentFilter));
    }

    static import(path) {
        this.savedPages = JSON.parse(fs.readFileSync(path));
        this.save();
    }

    static export(path) {
        fs.copyFileSync(this.fileFullPath, path);
    }
};

module.exports = SaveManager;
