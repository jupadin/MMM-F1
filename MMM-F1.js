/* Magic Mirror
 * Module: MMM-F1
 *
 * By jupadin
 * MIT Licensed.
 */

Module.register("MMM-F1", {
    // Default module config.
    defaults: {
        header: "MMM-F1",
        animationSpeed: 2 * 1000, // 2 seconds
        updateInterval: 24 * 60 * 60 * 1000, // 1 day
        season: "current",
        focus_on: false,
        maxDrivers: 8,
        fade: true,
        fadePoint: 0.75,
        showFooter: true,
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.fetchedData = null;

        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    // Define required styles.
    getStyles: function() {
        return ["MMM-F1.css", "font-awesome.css"];
    },

    // Define required translations.
    getTranslations: function() {
        return {
            de: "translations/de.json",
            en: "translations/en.json",
        }
    },

    // Define required scripts.
    getScripts: function() {
        return ["moment.js"];
    },

    // Define header.
    getHeader: function() {
        if (!this.loaded || this.error) {
            return this.config.header;
        } else {
            return this.config.header + " - " + this.translate("SEASON") + " " + this.fetchedData.season + " - " + this.fetchedData.round + " / " + this.fetchedData.total;
        }
    },

    // Override dom generator.
    getDom: function() {
        const self = this;
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-F1";
        wrapper.id = "wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        if (this.error) {
            wrapper.innerHTML = this.translate("ERROR") + " (" + this.fetchedData + ").";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "table";

        // Create table header row
        table.appendChild(self.createHeader());

        // Limit number of drivers
        if (this.config.maxDrivers) {
            this.fetchedData.table = this.fetchedData.table.slice(0, this.config.maxDrivers);
        }

        // Fading
        let currentFadeStep = 0;
        let startFade;
        let fadeSteps;

        if (this.config.fade && this.config.fadePoint < 1) {
            if (this.config.fadePoint < 0) {
                this.config.fadePoint = 0;
            }
            startFade = this.fetchedData.table.length * this.config.fadePoint;
            fadeSteps = this.fetchedData.table.length - startFade;
        }

        let rowElement = null;
        this.fetchedData.table.forEach((element, index) => {
            rowElement = self.createDataRow(element);
            if (this.config.fade && index >= startFade) {
                currentFadeStep = index - startFade;
                rowElement.style.opacity = 1 - (1 / fadeSteps) * currentFadeStep;
            }
            table.appendChild(rowElement);
        });

        // Create footer
        table.appendChild(self.createFooter());

        wrapper.appendChild(table);

        // Return the wrapper to the dom.
        return wrapper;
    },

    createHeader: function() {
        const tableHeader = document.createElement("tr");
        tableHeader.className = "header tableHeaderRow";

        // Driver
        const driverHeader = document.createElement("th");
        driverHeader.className = "header driverHeader driver";
        driverHeader.setAttribute("colspan", "2");
        driverHeader.innerHTML = this.translate("DRIVER");

        // Constructeur
        const constructorHeader = document.createElement("th");
        constructorHeader.className = "header constructorHeader constructor";
        constructorHeader.innerHTML = this.translate("CONSTRUCTOR");

        // Points
        const pointsHeader = document.createElement("th");
        pointsHeader.className = "header pointsHeader points";
        const pointsIcon = document.createElement("i");
        pointsIcon.className = "fas fa-chart-line";
        pointsHeader.appendChild(pointsIcon);

        // Grand Prix
        const grandPrixHeader = document.createElement("th");
        grandPrixHeader.className = "header grandPrixHeader grandPrix";
        const grandPrixIcon = document.createElement("i");
        grandPrixIcon.className = "fas fa-trophy";
        grandPrixHeader.appendChild(grandPrixIcon);


        tableHeader.appendChild(driverHeader);
        tableHeader.appendChild(constructorHeader);
        tableHeader.appendChild(pointsHeader);
        tableHeader.appendChild(grandPrixHeader);

        return tableHeader;
    },

    createDataRow: function(data) {
        const tableDataRow = document.createElement("tr");
        tableDataRow.className = "tableDataRow";

        const position = document.createElement("td");
        position.className = "positionData position";
        position.innerHTML = data.position + ".";

        const driver = document.createElement("td");
        driver.className = "driverData driver";

        const driverName = data.Driver.givenName + " " + data.Driver.familyName;
        

        // If focus_on is given as array
        if (Array.isArray(this.config.focus_on)) {
            this.config.focus_on.forEach(element => {
                if (driverName.includes(element)) {
                    // Either highlight only team name or highlight complete row.
                    // team.className = "bright";
                    tableDataRow.classList.add("bright");
                }
            });
        } else { // focus_on is given as string
            if (driverName.includes(this.config.focus_on)) {
                // Either highlight only team name or highlight complete row.
                // team.className = "bright";
                tableDataRow.classList.add("bright");
            }
        }

        driver.innerHTML = driverName;

        const constructor = document.createElement("td");
        constructor.className = "constructorData constructor";
        constructor.innerHTML = data.Constructors[0].name;

        const points = document.createElement("td");
        points.className = "pointsData points";
        points.innerHTML = data.points;

        const wins = document.createElement("td");
        wins.className = "winsData wins";
        wins.innerHTML = data.wins;

        tableDataRow.appendChild(position);
        tableDataRow.appendChild(driver);
        tableDataRow.appendChild(constructor);
        tableDataRow.appendChild(points);
        tableDataRow.appendChild(wins);

        return tableDataRow
    },

    createFooter: function() {
        const footerRow = document.createElement("tr");
        footerRow.className = "footerRow";

        const footer = document.createElement("td");
        footer.className = "footer";
        footer.setAttribute("colspan", "5");
        footer.innerHTML = this.translate("UPDATED") + ": " + moment().format("dd, DD.MM.YYYY, HH:mm[h]");

        footerRow.appendChild(footer);

        return footerRow;
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification == "DATA") {
            var animationSpped = this.config.animationSpeed;
            if (this.loaded) {
                animationSpped = 0;
            }
            this.fetchedData = payload;
            this.loaded = true;
            // Update dom with given animation speed.
            this.updateDom(animationSpped);
        } else if (notification == "ERROR") {
            // TODO: Update front-end to display specific error.
        }
    }
});