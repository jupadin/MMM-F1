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
        showStandings: "both",
        maxDrivers: 4,
        focusOnDrivers: "GAS",
        maxConstructors: 3,
        focusOnConstructors: "Mercedes",
        showNextGP: true,
        showNextGPDetails: true,
        showNextGPMap: true,
        showSchedule: true,
        maxScheduleRows: 2,
        focusOnGP: "Australia",
        grayscale: false,
        fade: true,
        fadePoint: 0.1,
        showHeaderAsIcons: true,
        showFooter: true,
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.generalData = null;
        this.driverData = null;
        this.constructorData = null;
        this.scheduleData = null;

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
        if ((!this.loaded) || this.error) {
            return this.config.header;
        } else {
            return this.config.header + " - " + this.translate("SEASON") + " " + this.generalData.season + " - " + this.generalData.currentRound + " / " + this.generalData.total;
        }
    },

    // Override dom generator.
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-F1";
        wrapper.id = "wrapper";

        // If data is not loaded yet, show loading message.
        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        // If there is an error, show error message.
        if (this.error) {
            wrapper.innerHTML = this.translate("ERROR");
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        // Check if *this.config.showStandings* is in Array of strings ["both", "driver", "constructor"]
        if (!["both", "driver", "constructor"].includes(this.config.showStandings.toLowerCase())) {
            wrapper.innerHTML = this.translate("WRONG_CONFIG");
            wrapper.className = "light small dimmed";
            return wrapper;
        }


        if (this.config.showStandings.toLowerCase() === "both") {
            
            // Driver
            const driverStandingsTable = this.addDriverStandings();
            wrapper.appendChild(driverStandingsTable);

            // Divider
            wrapper.appendChild(this.getDivider());

            // Constructor
            const constructorStandingsTable = this.addConstructorStandings();
            wrapper.appendChild(constructorStandingsTable);

        } else if (this.config.showStandings.toLowerCase() === "driver") {          
            // Driver
            const driverStandingsTable = this.addDriverStandings();
            wrapper.appendChild(driverStandingsTable);

        } else if (this.config.showStandings.toLowerCae() === "constructor") {
            // Driver
            const constructorStandingsTable = this.addConstructorStandings();
            wrapper.appendChild(constructorStandingsTable);
        }

        if (this.config.showNextGP) {
            wrapper.appendChild(this.getDivider());

            // const nextGPWrapper = document.createElement("div");
            // nextGPWrapper.className = "nextGPWrapper";
            
            // If season is over and there are no more races in this season, return.
            if (this.generalData.nextGP === null) {
                nextGPWrapper.innerHTML = this.translate("NO_NEXT_GP");
                return wrapper;
            }

            const nextGP = this.generalData.nextGP;
            // console.log(nextGP);

            const table = document.createElement("table");
            table.className = "nextGPTable";

            // Header
            const nextGPHeader = document.createElement("tr");
            nextGPHeader.className = "header nextGPHeader";

            const header1 = document.createElement("th");
            header1.innerText = `${this.translate("UPCOMING_GP")}: ${this.translate("SEASON")}: ${nextGP.season}, ${this.translate("ROUND")}: ${nextGP.currentRound}`;
            nextGPHeader.appendChild(header1);


            const header2 = document.createElement("th");
            header2.innerText = `${this.translate("TRACK_LAYOUT")}`;
            nextGPHeader.appendChild(header2);

            table.appendChild(nextGPHeader);

            // NextGP: Name
            const nextGPDataRow = document.createElement("tr");
            // nextGPDataRow.className = "nextGPName";
            
            const details = document.createElement("td");
            details.className = "bright";
            details.innerHTML = `${this.generalData.nextGP.raceName}`;
            nextGPDataRow.appendChild(details);

            table.appendChild(nextGPDataRow);

            // NextGP: Track Layout
            const trackLayout = document.createElement("td");
            trackLayout.className = "nextGPTrackLayout";
            trackLayout.innerHTML = `<img src="https://raw.githubusercontent.com/ianperrin/MMM-Formula1/refs/heads/master/trackss/${this.generalData.nextGP.location.country.toLowerCase()}.svg" alt="${this.generalData.nextGP.location.country} Track Layout" height="155">`;
            trackLayout.rowSpan = "6";
            nextGPDataRow.appendChild(trackLayout);

            table.appendChild(nextGPDataRow);

            // Next GP: Ciruit Name and Location
            const nextGPDataRow2 = document.createElement("tr");
            const nextGPData2 = document.createElement("td");
            nextGPData2.className = "nextGPCircuit";
            nextGPData2.innerHTML = `${nextGP.circuitName} (${nextGP.location.locality}, ${nextGP.location.country})`;
            nextGPDataRow2.appendChild(nextGPData2);

            table.appendChild(nextGPDataRow2);

            // Next GP: First Practice 1 (FP1)
            const nextGPDataRow4 = document.createElement("tr");
            // nextGPDataRow4.className = "nextGPDataRow4";
            const nextGPData4 = document.createElement("td");
            nextGPData4.className = "nextGPFP1";
            nextGPData4.innerHTML = `FP1: ${new Date(nextGP.firstPractice.date + " " + nextGP.firstPractice.time).toLocaleString()}`;
            nextGPDataRow4.appendChild(nextGPData4);

            table.appendChild(nextGPDataRow4);

            // Next GP: Second Practice 2 (FP2)
            if (nextGP.secondPractice) {
                const nextGPDataRow5 = document.createElement("tr");
                // nextGPDataRow5.className = "nextGPDataRow5";
                const nextGPData5 = document.createElement("td");
                nextGPData5.className = "nextGPFP2";
                if (nextGP.secondPractice) {
                    const nextGPSecondPractice = new Date(nextGP.secondPractice.date + " " + nextGP.secondPractice.time).toLocaleString();
                    nextGPData5.innerHTML = `FP2: ${nextGPSecondPractice}`;
                } else {
                    nextGPData5.innerHTML = this.translate("NO_FP2");
                }
                nextGPDataRow5.appendChild(nextGPData5);

                table.appendChild(nextGPDataRow5);
            }

            // Next GP: Third Practice 3 (FP3)
            if (nextGP.thirdPractice) {
                const nextGPDataRow6 = document.createElement("tr");
                // nextGPDataRow6.className = "nextGPDataRow6";
                const nextGPData6 = document.createElement("td");
                nextGPData6.className = "nextGPFP3";
                // if (nextGP.thirdPractice) {
                    const nextGPThirdPractice = new Date(nextGP.thirdPractice.date + " " + nextGP.thirdPractice.time).toLocaleString();
                    nextGPData6.innerHTML = `FP3: ${nextGPThirdPractice}`;
                // } else {
                //     nextGPData6.innerHTML = this.translate("NO_FP3");
                // }
                nextGPDataRow6.appendChild(nextGPData6);

                table.appendChild(nextGPDataRow6);
            }

            // Next GP: Sprint Qualifying
            if (nextGP.sprintQualifying) {
                const nextGPDataRow7 = document.createElement("tr");
                // nextGPDataRow7.className = "nextGPDataRow7";
                const nextGPData7 = document.createElement("td");
                // nextGPData7.className = "nextGPData7";
                if (nextGP.sprintQualifying) {
                    const nextGPSprintQualifying = new Date(nextGP.sprintQualifying.date + " " + nextGP.sprintQualifying.time).toLocaleString();
                    nextGPData7.innerHTML = `Sprint Qualifying: ${nextGPSprintQualifying}`;
                } else {
                    nextGPData7.innerHTML = this.translate("NO_SPRINT_QUALIFYING");
                }
                nextGPDataRow7.appendChild(nextGPData7);
                table.appendChild(nextGPDataRow7);
            }

            // Next GP: Sprint
            if (nextGP.sprint) {
                const nextGPDataRow8 = document.createElement("tr");
                // nextGPDataRow8.className = "nextGPDataRow8";
                const nextGPData8 = document.createElement("td");
                // nextGPData8.className = "nextGPData8";
                if (nextGP.sprint) {
                    const nextGPSprint = new Date(nextGP.sprint.date + " " + nextGP.sprint.time).toLocaleString();
                    nextGPData8.innerHTML = `Sprint: ${nextGPSprint}`;
                } else {
                    nextGPData8.innerHTML = this.translate("NO_SPRINT");
                }
                nextGPDataRow8.appendChild(nextGPData8);
                table.appendChild(nextGPDataRow8);
            }

            // Next GP: Qualifying
            const nextGPDataRow9 = document.createElement("tr");
            // nextGPDataRow9.className = "nextGPDataRow9";
            const nextGPData9 = document.createElement("td");
            // nextGPData9.className = "nextGPData9";
            const nextGPQualifying = new Date(nextGP.qualifying.date + " " + nextGP.qualifying.time).toLocaleString();
            nextGPData9.innerHTML = `Qualifying: ${nextGPQualifying}`;
            nextGPDataRow9.appendChild(nextGPData9);

            table.appendChild(nextGPDataRow9);

            // Next GP: Race
            const nextGPDataRow10 = document.createElement("tr");
            // nextGPDataRow10.className = "nextGPDataRow10";
            const nextGPData10 = document.createElement("td");
            nextGPData10.className = "bright";
            const nextGPRace = new Date(nextGP.date + " " + nextGP.time).toLocaleString();
            nextGPData10.innerHTML = `Race: ${nextGPRace}`;
            nextGPDataRow10.appendChild(nextGPData10);

            const nextGPSectors = document.createElement("td");
            nextGPSectors.className = "nextGPSectors";
            nextGPSectors.innerHTML = `
                <span class="xsmall S1">S1</span>
                <span class="xsmall S2">S2</span>
                <span class="xsmall S3">S3</span>
            `

            nextGPDataRow10.appendChild(nextGPSectors);

            table.appendChild(nextGPDataRow10);
            wrapper.appendChild(table);
        }


        // if (this.config.showSchedule) {
        //     const schedule = document.createElement("table");
        //     schedule.className = "table";

        //     // Header
        //     const scheduleHeader = document.createElement("tr");
        //     scheduleHeader.className = "header scheduleHeader";
        // }

        // Create footer
        wrapper.appendChild(this.createFooter());

        // Return the wrapper to the dom.
        return wrapper;
    },

    createHeaderDriver: function() {
        const tableHeader = document.createElement("tr");
        tableHeader.className = "header tableHeaderDriver";

        // Position
        const positionHeader = document.createElement("th");
        positionHeader.className = "header positionHeader name";
        const positionIcon = document.createElement("i");
        positionIcon.className = "fas fa-ranking-star";
        positionHeader.appendChild(positionIcon);

        // Name
        const nameHeader = document.createElement("th");
        nameHeader.className = "header driverHeader driver";
        const driverNameIcon = document.createElement("i");
        driverNameIcon.className = "fas fa-signature";
        nameHeader.appendChild(driverNameIcon);
        // nameHeader.innerHTML = this.translate("DRIVER");

        // Constructor
        const constructorHeader = document.createElement("th");
        constructorHeader.className = "header constructorHeader constructor";
        // constructorHeader.innerHTML = this.translate("CONSTRUCTOR");
        const constructorIcon = document.createElement("i");
        constructorIcon.className = "fas fa-wrench";
        constructorHeader.appendChild(constructorIcon);

        // Nationality
        const nationalityHeader = document.createElement("th");
        nationalityHeader.className = "header nationalityHeader nationality";
        // nationalityHeader.innerHTML = this.translate("NATIONALITY");
        const nationalityHeaderIcon = document.createElement("i");
        nationalityHeaderIcon.className = "fas fa-earth-europe";
        nationalityHeader.appendChild(nationalityHeaderIcon);

        // Points
        const pointsHeader = document.createElement("th");
        pointsHeader.className = "header pointsHeader points";
        const pointsIcon = document.createElement("i");
        pointsIcon.className = "fas fa-trophy";
        pointsHeader.appendChild(pointsIcon);

        // Grand Prix
        const grandPrixHeader = document.createElement("th");
        grandPrixHeader.className = "header winsHeader wins";
        const grandPrixIcon = document.createElement("i");
        grandPrixIcon.className = "fas fa-chart-line";
        grandPrixHeader.appendChild(grandPrixIcon);

        // Add headers to header row
        tableHeader.appendChild(positionHeader);
        tableHeader.appendChild(nameHeader);
        tableHeader.appendChild(constructorHeader);
        tableHeader.appendChild(nationalityHeader);
        tableHeader.appendChild(pointsHeader);
        tableHeader.appendChild(grandPrixHeader);

        return tableHeader;
    },

    createDataRowDriver: function(driverObject) {
        const tableDataRow = document.createElement("tr");
        tableDataRow.className = "tableDataRow";

        const position = document.createElement("td");
        position.className = "positionData position";
        position.innerHTML = driverObject.position + ".";
        
        const name = document.createElement("td");
        name.className = "driverData name";
        name.innerHTML = driverObject.firstName + " " + driverObject.lastName;
        
        const constructor = document.createElement("td");
        constructor.className = "constructorData constructor";
        constructor.innerHTML = driverObject.constructor;

        const nationality = document.createElement("td");
        nationality.className = "nationalityData nationality";
        nationality.innerHTML = driverObject.nationality;

        const wins = document.createElement("td");
        wins.className = "winsData wins";
        wins.innerHTML = driverObject.wins;

        const points = document.createElement("td");
        points.className = "pointsData points";
        points.innerHTML = driverObject.points;

        tableDataRow.appendChild(position);
        tableDataRow.appendChild(name);
        tableDataRow.appendChild(constructor);
        tableDataRow.appendChild(nationality);
        tableDataRow.appendChild(wins);
        tableDataRow.appendChild(points);

        return tableDataRow
    },

    createHeaderConstructor: function() {
        const tableHeader = document.createElement("tr");
        tableHeader.className = "header tableHeaderConstructor";

        // Position
        const positionHeader = document.createElement("th");
        positionHeader.className = "header positionHeader name";
        const positionIcon = document.createElement("i");
        positionIcon.className = "fas fa-ranking-star";
        positionHeader.appendChild(positionIcon);

        // Name
        const nameHeader = document.createElement("th");
        nameHeader.className = "header driverHeader driver";
        const nameHeaderIcon = document.createElement("i");
        nameHeaderIcon.className = "fas fa-signature";
        nameHeader.appendChild(nameHeaderIcon);
        // nameHeader.innerHTML = this.translate("CONSTRUCTOR");

        // Constructor
        const constructorHeader = document.createElement("th");
        constructorHeader.className = "header constructorHeader constructor";
        // constructorHeader.innerHTML = this.translate("CONSTRUCTOR");
        const constructorIcon = document.createElement("i");
        constructorIcon.className = "fas fa-wrench";
        constructorHeader.appendChild(constructorIcon);

        // Nationality
        const nationalityHeader = document.createElement("th");
        nationalityHeader.className = "header nationalityHeader nationality";
        // nationalityHeader.innerHTML = this.translate("NATIONALITY");
        const nationalityHeaderIcon = document.createElement("i");
        nationalityHeaderIcon.className = "fas fa-earth-europe";
        nationalityHeader.appendChild(nationalityHeaderIcon);

        // Points
        const pointsHeader = document.createElement("th");
        pointsHeader.className = "header pointsHeader points";
        const pointsIcon = document.createElement("i");
        pointsIcon.className = "fas fa-trophy";
        pointsHeader.appendChild(pointsIcon);

        // Grand Prix
        const grandPrixHeader = document.createElement("th");
        grandPrixHeader.className = "header winsHeader wins";
        const grandPrixIcon = document.createElement("i");
        grandPrixIcon.className = "fas fa-chart-line";
        grandPrixHeader.appendChild(grandPrixIcon);

        // Add headers to header row
        tableHeader.appendChild(positionHeader);
        tableHeader.appendChild(nameHeader);
        tableHeader.appendChild(constructorHeader);
        tableHeader.appendChild(nationalityHeader);
        tableHeader.appendChild(pointsHeader);
        tableHeader.appendChild(grandPrixHeader);

        return tableHeader;
    },

    createDataRowConstructor: function(constructorObject) {
        const tableDataRow = document.createElement("tr");
        tableDataRow.className = "tableDataRow";

        const position = document.createElement("td");
        // position.className = "positionData position";
        position.innerHTML = constructorObject.position + ".";

        const name = document.createElement("td");
        // constructor.className = "driverData driver";
        name.innerHTML = constructorObject.name;

        // Constructor
        const constructor = document.createElement("td");
        constructor.className = "constructorData constructor";
        constructor.innerHTML = constructorObject.name;

        // Nationality
        const nationality = document.createElement("td");
        nationality.className = "constructorData nationality";
        nationality.innerHTML = constructorObject.nationality;

        // Wins
        const wins = document.createElement("td");
        wins.className = "winsData wins";
        wins.innerHTML = constructorObject.wins;

        // Points
        const points = document.createElement("td");
        points.className = "pointsData points";
        points.innerHTML = constructorObject.points;


        tableDataRow.appendChild(position);
        tableDataRow.appendChild(name);
        tableDataRow.appendChild(constructor);
        tableDataRow.appendChild(nationality);
        tableDataRow.appendChild(wins);
        tableDataRow.appendChild(points);

        return tableDataRow
    },

    addDriverStandings: function() {
        const driverData = this.driverData;
        const table = document.createElement("table");
        table.className = "table";

        // Header
        table.appendChild(this.createHeaderDriver());

        // Driver Data
        // - Fading
        let currentFadeStep = 0;
        let startFade = 0;
        let fadeSteps = 0;

        if (this.config.fade) {
            if (this.config.fadePoint < 0) {
                this.config.fadePoint = 0;
            }
            if (this.config.fadePoint > 1) {
                this.config.fadePoint = 0.75;
            }

            startFade = this.driverData.length * this.config.fadePoint;
            fadeSteps = this.driverData.length - startFade;
        }

        // - Data
        let rowElement = null;
        driverData.forEach((element, index) => {
            rowElement = this.createDataRowDriver(element);
            if (this.config.fade && index >= startFade) {
                currentFadeStep = index - startFade;
                rowElement.style.opacity = 1 - (1 / fadeSteps) * currentFadeStep;
            }

            // If focus_on is given as array
            if (Array.isArray(this.config.focusOnDrivers)) {
                this.config.focusOnDrivers.forEach(e => {
                    if (element.code.includes(e)) {
                        // Either highlight only team name or highlight complete row.
                        // team.className = "bright";
                        rowElement.classList.add("bright");
                        rowElement.style.opacity = 1
                    }
                });
            } else { // focus_on is given as string
                if (element.code.includes(this.config.focusOnDrivers)) {
                    // Either highlight only team name or highlight complete row.
                    // team.className = "bright";
                    rowElement.classList.add("bright");
                    rowElement.style.opacity = 1
                }
            }

            table.appendChild(rowElement);
        });
        return table;
    },

    addConstructorStandings: function() {
        const constructorData = this.constructorData;

        const table = document.createElement("table");
        table.className = "table";

        // Header
        table.appendChild(this.createHeaderConstructor());
        
        // Fading
        currentFadeStep = 0;
        startFade = 0;
        fadeSteps = 0;

        if (this.config.fade && this.config.fadePoint < 1) {
            if (this.config.fadePoint < 0) {
                this.config.fadePoint = 0;
            }
            startFade = this.constructorData.length * this.config.fadePoint;
            fadeSteps = this.constructorData.length - startFade;
        }
        // - Data
        var rowElement = null;
        constructorData.forEach((element, index) => {
            rowElement = this.createDataRowConstructor(element);

            if (this.config.fade && index >= startFade) {
                currentFadeStep = index - startFade;
                rowElement.style.opacity = 1 - (1 / fadeSteps) * currentFadeStep;
            }
            
            // If focus_on is given as array
            if (Array.isArray(this.config.focusOnConstructors)) {
                this.config.focusOnConstructors.forEach(e => {
                    if (element.name.includes(e)) {
                        // Either highlight only team name or highlight complete row.
                        // team.className = "bright";
                        rowElement.classList.add("bright");
                        rowElement.style.opacity = 1
                    }
                });
            } else { // focus_on is given as string
                if (element.name.includes(this.config.focusOnConstructors)) {
                    // Either highlight only team name or highlight complete row.
                    // team.className = "bright";
                    rowElement.classList.add("bright");
                    rowElement.style.opacity = 1
                }
            }
           
            table.appendChild(rowElement);
        });
        return table;
    },

    createFooter: function() {
        const footer = document.createElement("div");
        footer.className = "footer";
        footer.innerHTML = this.translate("UPDATED") + ": " + moment().format("dd, DD.MM.YYYY, HH:mm[h]");
        return footer;
    },

    getDivider: function() {
        const divider = document.createElement("hr");
        
        return divider;
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        // console.log(notification);
        if (notification === "GENERAL") {
            this.generalData = payload;
        } else if (notification === "SCHEDULE") {
            this.scheduleData = payload
        } else if (notification === "DRIVER") {
            this.driverData = payload;
        } else if (notification === "CONSTRUCTOR") {
            this.constructorData = payload;
        } else if (notification == "ERROR") {
            // TODO: Update front-end to display specific error.
            this.error = true;
            this.updateDom(this.config.animationSpeed);
        }

        if ((this.scheduleData && this.driverData && this.constructorData)) {
            let animationSpeed = this.config.animationSpeed;
            if (this.loaded) {
                animationSpeed = 0;
            }
            // this.fetchedData = payload;
            this.loaded = true;
            // Update dom with given animation speed.
            this.updateDom(animationSpeed);
        }
    }
});