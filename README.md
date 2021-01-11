# Runes Master
A simple tool for managing runes pages in the famous game of **League of Legends**.

![App Preview](preview.png)

# How does it work?

The tool communicates **only** with the game client and it does it via WebSockets and HTTPS requests, to get and send any of the required data.

## Saving
- ### Saving a new Runes Page
  - **On the game:** simply create a new page with the runes you like, give it a cool name and click save.
  - **On the app:** then, click ![Save Preview](previews/save.png) to add it to your pages collection.
- ### Saving an existing Runes Page
  - **On the game:** click on the page you want to save, it will become the current active page.
  - **On the app:** click ![Save Preview](previews/save.png) to add the current active page to the collection.

> **Tip:** While saving, Runes Master will scan the **page name** to detect the **champion** and the **lane** you want to save it for.  
> If there is more than one match (or no match at all) manually selecting the saving options will be required.

## Exporting
Simply click ![Export Preview](previews/export.png) to export your amazing collection and share it with some friends.
## Importing
Just click ![Export Preview](previews/import.png) to import your friend's amazing collection.
## More Features
- Runes Master detects when you enter a champion selection screen. It then filters your collection basing on your pick/role and **automatically imports** the runes page if it is the only one out of the filter.
- You can click a runes page in your collection to manually import it in the game, in any moment.
- You can see the content of a page by hovering the mouse on it.
  
# Build & Run

## Requirements

To build the app, download or clone the repository, then download and install [NodeJs](https://nodejs.org/) and exectute the following commands on the shell
- Install [Electron](https://www.electronjs.org/) module globally
    ```cmd
    $ npm install electron -g
    ```
- Install [Electron-Packager](https://github.com/electron/electron-packager) module globally
    ```cmd
    $ npm install electron-packager -g
    ```
- Move to the project folder
    ```cmd
    $ cd runes_master
    ```
- Get the current electron version for the next step
    ```cmd
    $ electron -v
    ```
- Build the app
    ```sh
    $ electron-packager . --electron-version="version"
    ```
- Or just run it
    ```cmd
    $ electron .
    ```
# Dependencies & References
Runes Master is using **[JQuery](https://jquery.com/)** for the UI and **[League-Connect](https://github.com/supergrecko/league-connect)** to communicate with the League of Legends client. Some useful references for the development process are: 
- [HextechDocs](https://www.hextechdocs.dev/lol/riotapi/15.getting-started-with-the-riot-games-api)
- [Rift Explorer](https://github.com/Pupix/rift-explorer)
- [Community Dragon](http://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/)

# Personal Notes
**Runes Master** is a project for the subject *Web programming, Design & Usability* of the *Computer Science* course in the *University of Catania*.