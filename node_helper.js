/* Magic Mirror
 * Module: MMM-F1
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const request = require('request');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;
        }

        // Retrieve data from Server...
        this.getData();
    },

    getData: function() {
        const self = this;
        Log.info(this.name + ": Fetching data from F1-Server...");

        const standingsURL = "https://ergast.com/api/f1/" + this.config.season + "/driverStandings.json";
        const calendarURL = "https://ergast.com/api/f1/" + this.config.season + ".json";

        let totalRaces = 0;

        request(calendarURL, function(error, response, body) {
            if (error || (response.statusCode != 200)) {
                Log.debug(this.name + " :Error getting F1 standings (" + response.statusCode + ")");
                self.sendSocketNotification("ERROR", response.statusCode);
                return;
            }

            const result = JSON.parse(body).MRData;
            totalRaces = result.total;

        });

        request(standingsURL, function(error, response, body) {
            if (error || (response.statusCode != 200)) {
                Log.debug(this.name + " :Error getting F1 standings (" + response.statusCode + ")");
                self.sendSocketNotification("ERROR", response.statusCode);
                return;
            }

            const result = JSON.parse(body).MRData;
            const season = result.StandingsTable.season;
            const round = result.StandingsTable.StandingsLists[0].round;
            const standingsTable = result.StandingsTable.StandingsLists[0].DriverStandings;

            self.sendSocketNotification("DATA", {season: season, round: round, total: totalRaces, table: standingsTable});
        });

        setTimeout(this.getData.bind(this), this.config.updateInterval);
    }
});