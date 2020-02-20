const fs = require('fs');
const smashgg = require('smashgg.js');
const Tournament = smashgg.Tournament;

const TOKEN_FILE = './smashgg.config';
const TOKEN = fs.readFileSync(TOKEN_FILE, "Utf8");
//smashgg.initialize(TOKEN);
const TOPNUMBER = 8;
const SMASH_ULTIMATE_ID = 1386;
const MERIDA_COORDINATES = "20.967778, -89.621667";
const RADIUS = "50mi";
const { GraphQLClient } = require('graphql-request');
const endpoint = 'https://api.smash.gg/gql/alpha';
const FILE_LOCATION = './SlugList.txt';

const graphQLClient = new GraphQLClient(endpoint, {
  credentials: "include",
  mode: "cors",
  headers: {
    Authorization: `Bearer ${TOKEN}`
  }
});



//gets an event object with the standings and returns the standings as a JSON
function parseStandings(event) {
  let event_id = event.id;
  let standings = [];
  let new_standings = [];
  let placement = 0;
  let player_1_id = null;
  let player_2_id = null;
  let player_name = null;
  let player_2_name = null;
  let doubles = false;
  if (event.standings) {

    standings = event.standings.nodes;

    for (standing in standings) {

      let placement = standings[standing].placement;
      let entrant = standings[standing].entrant;
      let entrant_id = entrant.id;

      player_name = entrant.name;
      let participants = entrant.participants;

      for (participant in participants) {
        let player = participants[participant].player;

        if (participant == 0) {
          player_1_id = player.id;
        } else if (participant == 1) {
          doubles = true;
          player_2_id = player.id; //dubs detection?
          player_2_name = player.gamerTag;
        }
      }
      if (player_2_id) { //dubs
        new_standings.push({ player_1_id: player_1_id, name: player_name, player_2_id: player_2_id, placement: placement });
      } else {
        new_standings.push({ player_id: player_1_id, name: player_name, placement: placement });
      }
    }
    new_standings.doubles = doubles;
    //new_standings = JSON.stringify(new_standings);
  }
  return new_standings;
}
async function main() {
  eventStandings = await getEventStandings(453102);
  new_standings = parseStandings(eventStandings);
  tweet = await writeTweet(453102, new_standings);
  //let eventsId = await getEventsId("smash-summit-9");
  //let players = await getPlayerInfo(16342);
  console.log(tweet);
  return true;
}

//Gets all the events id from a tournament
async function getEventsId(slug) {
  const eventsIdQuery = `query EventsIdQuery($slug: String) {
		tournament(slug: $slug){
			state
    events{
      id
    }
		}
  }`;

  const eventsIdVariables = `{
    "slug": "`+ slug + `"
  }`;

  let data = await graphQLClient.request(eventsIdQuery, eventsIdVariables);
  return data.tournament.events;
}

//Returns all the top 8 info from an event
async function getEventStandings(eventId) {
  var eventQuery = `
  query EventQuery($id: ID!, $page: Int, $perPage: Int) { 
      event(id: $id){ 
        id standings(query: {
          perPage: $perPage,
          page: $page
        }){
            pageInfo{
            total,
            totalPages
          }
          nodes {
            placement
            entrant {
                id
              name
              participants {
                  id
                  gamerTag
                  player {
                      id
                  }
                    }
            }
          }
        }
      } 
    }`;


  var eventVariables = `{
      "id": `+ eventId + `,
      "page": 1,
      "perPage": `+ TOPNUMBER + `
    }`;
  let eventStandings = await graphQLClient.request(eventQuery, eventVariables);
  return eventStandings.event;
}

//Returns the tournament and event name
async function getEventInfo(eventId) {
  eventInfoQuery = `
  query TournamentQuery($id: ID!) {
		event(id: $id){
      name
      slug
      numEntrants
			tournament{
        name
      }
		}
	}`

  eventInfoVariables = `
  {
    "id": `+ eventId + `
  }`

  let eventInfo = await graphQLClient.request(eventInfoQuery, eventInfoVariables);

  return eventInfo;
}

//Returns the twitter handle and gamertag of a player
async function getPlayerInfo(playerId) {
  playerQuery = `
  query TournamentQuery($playerId: ID!) {
		player(id: $playerId){
      twitterHandle
      gamerTag
		}
  }`

  playerVariables = `
  {
    "playerId": `+ playerId + `
  }`

  let playerInfo = await graphQLClient.request(playerQuery, playerVariables);

  return playerInfo.player;
}

//Returns a String with the top 8 info to be tweeted
async function writeTweet(eventId, new_standings) {
  var results = "";

  //fill in event/tournament name
  var eventInfo = await getEventInfo(eventId);

  results += "Results for " + eventInfo.event.tournament.name + " - " + eventInfo.event.name + " - " + eventInfo.event.numEntrants + " entrants \n\n";

  for (let i = 0; i < new_standings.length; i++) {
    let standing = new_standings[i];
    //get player twitter handle or gamertag
    let placement = standing.placement;
    if (new_standings.doubles) {

      let player_1 = await getPlayerInfo(standing.player_1_id);
      let player_2 = await getPlayerInfo(standing.player_2_id);

      //Writes the players twitters and/or their tags
      if (player_1 && player_2) {
        results += placement + ": ";
        if (player_1.twitterHandle) {
          results += "@" + player_1.twitterHandle;
        } else {
          results += player_1.gamerTag;
        }
        if (player_2.twitterHandle) {
          results += " / @" + player_2.twitterHandle + "\n";
        } else {
          results += " / " + player_2.gamerTag + "\n";
        }
      } else {
        results += placement + ": " + standing.name + "\n";
      }
    } else {
      let player = await getPlayerInfo(standing.player_id);
      if (player) {
        if (player.twitterHandle) {
          results += placement + ": @" + player.twitterHandle + "\n";
        } else {
          results += placement + ": " + player.gamerTag + "\n";
        }
      } else {
        results += placement + ": " + standing.name + "\n";
      }

    }
  }

  //add tournament link
  results += "\n View on smash gg: https://smash.gg/" + eventInfo.event.slug;

  return results;
}



main();