/* Magic Mirror
 * Module: MMM-F1
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('logger');
const DataFetcher = require('./datafetcher.js');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.fetchers = [];
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;
        }

        // Retrieve data from Server...
        this.getData();
    },

    /**
     * getData
     */
    getData: function() {
        Log.info(`${this.name}: Start fetching data from F1-Server...`);

        const season = this.config.season === "current" ? new Date().getFullYear() : this.config.season;
        const f1URL = `https://api.jolpi.ca/ergast/f1/${season}`;

        const generalURL = `${f1URL}.json`;
        const driverURL = `${f1URL}/driverStandings.json`;
        const constructorURL = `${f1URL}/constructorStandings.json`;

        this.fetchGeneralData(generalURL);

        if (this.config.showStandings.toLowerCase() === "both") {
            // Fetch driver standings
            this.fetchDriverStandings(driverURL);
            // Fetch constructor standings
            this.fetchConstructorStandings(constructorURL);
        } else if (this.config.showStandings.toLowerCase() === 'driver') {
            this.fetchDriverStandings(driverURL);
        } else if (this.config.showStandings.toLowerCase() === 'constructor') {
            this.fetchConstructorStandings(constructorURL);
        }

        setTimeout(this.getData.bind(this), this.config.updateInterval);
    },

    /**
     * Fetch general race data from the F1 API.
     * This includes races of the current season, like total number of races, current currentRound and some information about each currentRound.
     * This function sends the race scedule as well as the upcoming Grand Prix to the frontend.
     * @param {String} url 
     * @param {Object} fetchOptions 
     * @returns 
     */
    fetchGeneralData: function(url=null, fetchOptions={}) {
        Log.debug(`${this.name}: Fetching general data from F1 API...`);
        if (url === null) {
            Log.debug(`${this.name}: No URL provided for fetching general data.`);
            return;
        }

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                // self.sendSocketNotification("ERROR", response.status);
                throw `Error fetching F1 general data with status code ${response.status}.`;
            }
            Log.debug(`${this.name}: Successfully fetched general data from F1 API.`);
            return response.json();
        })
        .then(data => {
            const totalRaces = data.MRData.total;
            const season = data.MRData.RaceTable?.season;
            let currentRound = null;

            // Extract the currentRound value where the season is currently at by looking in each element of the Race-Array
            // and checking if the "date" is in the past. If it is, the currentRound is increased by 1.
            const now = new Date();
            data.MRData.RaceTable?.Races.forEach((e, i) => {
                if (new Date(e.date) < now) {
                    currentRound = i + 1;
                }
            });

            let upcomingGP = null;

            // If there are still races to go, extract upcoming Grand Prix.
            if (currentRound !== totalRaces) {
                upcomingGP = this.mapScheduleData(data.MRData.RaceTable?.Races[currentRound]);
            }

            Log.debug(`${this.name}: Fetched general data for season ${season} with ${totalRaces} races.`);
            Log.debug(`${this.name}: Fetched next Grand Prix: ${upcomingGP.raceName}.`);

            this.sendSocketNotification("GENERAL", {season: season, total: totalRaces, currentRound: currentRound, nextGP: upcomingGP});

            Log.debug(`${this.name}: Successfully sent general data to the frontend.`);
            return data;

        }).then(data => {
            const GPTable = data.MRData.RaceTable?.Races;
            const d = GPTable.map(this.mapScheduleData);
            const result = this.config.maxScheduleRows ? d.slice(0, this.config.maxScheduleRows) : d;

            if (this.config.focusOnGP && this.config.focusOnGP.indexOf(result.circuitID) == -1) {
                // No need to sort the array, since if the focusedGP is already in the list
                // it is at its "correct" position
                const focusedGP = d.find(e => e.circuitID.toLowerCase() === this.config.focusOnGP.toLowerCase());
                if (focusedGP) {
                    result.pop();
                    result.push(focusedGP);
                }
            }
            this.sendSocketNotification("SCHEDULE", result);
            Log.debug(`${this.name}: Successfully sent schedule data to the frontend.`);
        })
        .catch(error => {
            Log.error(`${this.name}: Error fetching general Data - "${error}".`);
            this.sendSocketNotification("ERROR");
            return;
        });
    },

    /**
     * Fetch driver standings from the F1 API.
     * This function sends the driver standings to the frontend.
     * @param {String} url 
     * @param {Object} fetchOptions
     * @returns
     * @throws {Error} If the fetch request fails or the response status is not 200.
     */
    fetchDriverStandings: function(url=null, fetchOptions={}) {
        if (url === null) {
            return;
        }

        // Fetch driver standings
        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                // self.sendSocketNotification("ERROR", response.status);
                throw `Error fetching F1 driver standings data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            const standingsTable = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings;
            const d = standingsTable.map(this.mapDriverStanding);
            const result = this.config.maxDrivers ? d.slice(0, this.config.maxDrivers) : d;

            if (!this.config.focusOnDrivers) {
                return this.sendSocketNotification("DRIVER", result);
            };

            // Check if focusOnDrivers is an array or a single value
            const focusOnDrivers = Array.isArray(this.config.focusOnDrivers) ? this.config.focusOnDrivers : [this.config.focusOnDrivers];

            if (focusOnDrivers.length > this.config.maxDrivers) {
                Log.warn(`${this.name}: Number of favorite drivers (${focusOnDrivers.length}) exceeds maxDrivers setting (${this.config.maxDrivers}). Some favorite drivers will not be displayed.`);
            }

            // Ensure favorite drivers are in the result
            focusOnDrivers.forEach(focusOnDriver => {
                const alreadyInResult = result.find(driver => driver.code === focusOnDriver);
                if (alreadyInResult) {
                    Log.debug(`${this.name}: Favorite driver ${focusOnDriver} is already in the standings.`);
                    return; // Skip to the next favorite driver
                }

                const driverToAdd = d.find(driver => driver.code === focusOnDriver);

                if (!driverToAdd) {
                    Log.warn(`${this.name}: Could not find driver with code "${focusOnDriver}".`);
                    return; // Skip to the next favorite driver
                }

                if (this.config.maxDrivers && result.length >= this.config.maxDrivers) {
                    // Find the last non-favorite driver in the list to remove

                    // Log.debug([...result].reverse());

                    const removeableIndex = [...result].reverse().findIndex(driver => !focusOnDrivers.includes(driver.code));
                    const actualIndex = removeableIndex === -1 ? -1 : result.length - 1 - removeableIndex;
                    // Log.debug(removeableIndex, actualIndex);

                    if (actualIndex !== -1) {
                        result.splice(actualIndex, 1); // Remove the non-favorite driver
                        Log.debug(`${this.name}: Removed non-favorite driver to make space for favorite driver ${focusOnDriver}.`);
                    } else {
                        // All current drivers are favorites, cannot remove any
                        Log.warn(`${this.name}: All displayed drivers are favorites, cannot add more.`);
                        return; // Skip to the next favorite driver
                    }
                    result.push(driverToAdd);
                }

            });

            this.sendSocketNotification("DRIVER", result);
            return;
        })
        .catch(error => {
            Log.error(`${this.name}: Error fetching driver standings - "${error}".`);
            this.sendSocketNotification("ERROR");
            return;
        });
    },

    /**
     * 
     * @param {*} url 
     * @param {*} fetchOptions 
     * @returns 
     */
    fetchConstructorStandings: function(url=null, fetchOptions={}) {
        if (url === null) {
            return;
        }

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                // self.sendSocketNotification("ERROR", response.status);
                throw `Error fetching F1 constructor standings data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            const standingsTable = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings;
            const d = standingsTable.map(this.mapConstructorStanding);
            const result = this.config.maxConstructors ? d.slice(0, this.config.maxConstructors) : d;

            if (!this.config.focusOnConstructors) {
                return this.sendSocketNotification("CONSTRUCTOR", result);
            }

            // Check if focusOnConstructors is an array or a single value
            const focusOnConstructors = Array.isArray(this.config.focusOnConstructors) ? this.config.focusOnConstructors : [this.config.focusOnConstructors];

            if (focusOnConstructors.length > this.config.maxConstructors) {
                Log.warn(`${this.name}: Number of favorite constructors (${focusOnConstructors.length}) exceeds maxConstructors setting (${this.config.maxConstructors}). Some favorite constructors will not be displayed.`);
            }

            // Ensure favorite constructors are in the result
            focusOnConstructors.forEach(focusOnConstructor => {
                const alreadyInResult = result.find(constructor => constructor.name === focusOnConstructor);
                if (alreadyInResult) {
                    Log.debug(`${this.name}: Favorite constructor ${focusOnConstructor} is already in the standings.`);
                    return; // Skip to the next favorite constructor
                }

                const constructorToAdd = d.find(constructor => constructor.name === focusOnConstructor);

                if (!constructorToAdd) {
                    Log.warn(`${this.name}: Could not find constructor with name "${focusOnConstructor}".`);
                    return; // Skip to the next favorite constructor
                }

                if (this.config.maxConstructors && result.length >= this.config.maxConstructors) {
                    // Find the last non-favorite constructor in the list to remove
                    const removeableIndex = [...result].reverse().findIndex(constructor => !focusOnConstructors.includes(constructor.name));
                    const actualIndex = removeableIndex === -1 ? -1 : result.length - 1 - removeableIndex;

                    if (actualIndex !== -1) {
                        result.splice(actualIndex, 1); // Remove the non-favorite constructor
                        Log.debug(`${this.name}: Removed non-favorite constructor to make space for favorite constructor ${focusOnConstructor}.`);
                    } else {
                        // All current constructors are favorites, cannot remove any
                        Log.warn(`${this.name}: All displayed constructors are favorites, cannot add more.`);
                        return; // Skip to the next favorite constructor
                    }
                    result.push(constructorToAdd);
                }

            });

            this.sendSocketNotification("CONSTRUCTOR", result);
            return;
        })
        .catch(error => {
            Log.error(`${this.name}: Error fetching constructor standings - "${error}".`);
            this.sendSocketNotification("ERROR");
            return;
        });
    },

    /**
     * 
     * @param {*} url 
     * @param {*} fetchOptions 
     * @returns 
     */
    fetchSchedule: function(url=null, fetchOptions={}) {
        if (url === null) {
            return;
        }

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                throw `Error fetching F1 schedule data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            const d = data.M

            this.sendSocketNotification("SCHEDULE", d);
        })
        .catch(error => {
            Log.error(`${this.name}: ${error}.`);
            this.sendSocketNotification("ERROR", error);
            return;
        })
    },

    /**
     * 
     * @param {*} team 
     * @returns 
     */
    mapConstructorStanding: function(team) {
        const t = {
            position: team.position,
            name: team.Constructor.name,
            points: team.points,
            wins: team.wins,
            nationality: team.Constructor.nationality,
        }

        return t;
    },

    /**
     * 
     * @param {*} driver 
     * @returns 
     */
    mapDriverStanding: function(driver) {
        const d = {
            position: driver.position,
            points: driver.points,
            wins: driver.wins,
            // permanentNumber: driver.Driver.permanentNumber,
            code: driver.Driver.code,
            firstName: driver.Driver.givenName,
            lastName: driver.Driver.familyName,
            nationality: driver.Driver.nationality,
            constructor: driver.Constructors[0]?.name
        }

        return d;
    },

    /**
     * 
     * @param {*} event 
     * @returns 
     */
    mapScheduleData: function(event) {
        const e = {
            season: event.season,
            currentRound: event.round,
            raceName: event.raceName,
            circuitID: event.Circuit.circuitId,
            circuitName: event.Circuit.circuitName,
            date: event.date,
            time: event.time,
            location: event.Circuit.Location,
            firstPractice: event.FirstPractice,
            secondPractice: event.SecondPractice || null,
            thirdPractice: event.ThirdPractice || null,
            sprint: event.Sprint || null,
            sprintQualifying: event.SprintQualifying || null,
            qualifying: event.Qualifying,
        }

        return e;
    },
});