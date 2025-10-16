# MMM-F1

<p style="text-align: center">
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

This module is an extention for the [MagicMirror](https://github.com/MichMich/MagicMirror).

The module is based on the work of [ianperrin](https://github.com/ianperrin/MMM-Formula1) and uses the [jolpi.ca API](http://api.jolpi.ca/ergast/f1/), maintained by [jolpica](https://github.com/jolpica/jolpica-f1).
The curuit layouts are also taken from [ianperrin](https://github.com/ianperrin/MMM-Formula1) and can be found there! :)


### To-Do's
- [ ] Implement fetcher object analog to newsfetcher
- [ ] Update README with new configuration options
- [x] Implement logic to focus on more than a single ~~driver~~ or constructeur

## Installation

Open a terminal session, navigate to your MagicMirror's `modules` folder and execute `git clone https://github.com/jupadin/MMM-F1.git`, such that a new folder called MMM-F1 will be created.

Activate the module by adding it to the `config.js` file of the MagicMirror as shown below.

The table below lists all possible configuration options.

````javascript
cd modules
git clone https://github.com/jupadin/MMM-F1.git
cd MMM-F1
npm install
````

## Using the module
````javascript
    modules: [
        {
            module: "MMM-F1",
            header: "MMM-F1",
            position: "top_left",
            config: {
                animationSpeed: 2000,
                updateInterval: 86400000,
                focusOnDrivers: VER,
                showHeaderAsIcons: false,
                showFooter: true,
            }
        }
    ]
````

## Configuration options

The following configuration options can be set and/or changed:

### Module

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `animationSpeed` | `int` | `2000` | Animation speed to fade in the module on startup [milliseconds] (2 seconds) |
| `updateInterval` | `int` | `86400000` | How often the table shall be updated [milliseconds] (1 day) |
| `focusOnDrivers` | `string` | `false` | Highlight driver (example: `"VER"`) |
| `showHeaderAsIcons`| `bool` |`false` | Display header as icons |
| `showFooter` | `bool` | `true` | Display footer with information about last update |
