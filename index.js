'use strict';

const request = require("request");
const fs = require("fs");

global.config = require("./config");

let api_keys = global.config.api_keys;
let api_key = 0;
let app_id = 570;
let api = "http://api.steampowered.com/IDOTA2Match_" + app_id;
let matchBySequence = "/GetMatchHistoryBySequenceNum/v1";

let lastMatch = "2657890226";//2646497765

let data = fs.createWriteStream("data2");

let inter = setInterval(() => {
    let url = createURL(api, matchBySequence, api_keys[api_key++ % api_keys.length], {"start_at_match_seq_num": lastMatch, "matches_requested": 100});
    
    request(url, (err, response, body) => {
        if (err || response.statusCode !== 200) {
            console.log("Error: " + err + "\nStatus code: "+response.statusCode);
            return;
        }
        let result = JSON.parse(body).result;
        if (result.status !== 1) {
            console.log("Error: " + result.status);
            return;
        }
        let matches = result.matches;
        lastMatch = matches[matches.length-1].match_seq_num + 1;
        matches.filter(match => match.players.filter(p => p.leaver_status == 0).length === 10)
               .map(match => data.write(transformMatch(match) + "\n"));
    });
}, 8000);

setTimeout(() => {
    clearInterval(inter);
    console.log("Finished");
    setTimeout(() => data.end(),3000);
}, 3 * 60 * 60 * 1000); // Run for 3h

function transformMatch(match) {
    let result = [];
    // Match ID
    result.push(match.match_id);
    // Duration in minutes
    result.push(match.duration);
    // Players
    let winners = [], losers = [];
    match.players.map(p => p.player_slot > 127  ? (match.radiant_win ? losers.push(p)  : winners.push(p)) 
                                                : (match.radiant_win ? winners.push(p) : losers.push(p)));
    // GPM                                            
    result = result.concat(winners.map(p => p.gold_per_min).sort((a,b) => a-b));
    result = result.concat(losers.map(p => p.gold_per_min).sort((a,b) => a-b));
    // XPM
    result = result.concat(winners.map(p => p.xp_per_min).sort((a,b) => a-b));
    result = result.concat(losers.map(p => p.xp_per_min).sort((a,b) => a-b));
    // KDA
    result = result.concat(winners.map(p => p.kills).sort((a,b) => a-b));
    result = result.concat(losers.map(p => p.kills).sort((a,b) => a-b));
    result = result.concat(winners.map(p => p.deaths).sort((a,b) => a-b));
    result = result.concat(losers.map(p => p.deaths).sort((a,b) => a-b));
    result = result.concat(winners.map(p => p.assists).sort((a,b) => a-b));
    result = result.concat(losers.map(p => p.assists).sort((a,b) => a-b));
    return result.toString();
}

function createURL(api, endpoint, key, parameters) {
    let url = api + endpoint + "?key=" + key;
    for (let key in parameters) {
        if(parameters.hasOwnProperty(key)) {
            url += "&" + key + "=" + parameters[key];
        }
    }
    return url;
}