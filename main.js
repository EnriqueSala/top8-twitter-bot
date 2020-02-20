var Twitter = require('twitter');
var schedule = require('node-schedule');
const fs = require('fs');
const SMASH_ULTIMATE_ID = 1386;
const { GraphQLClient } = require('graphql-request');
const endpoint = 'https://api.smash.gg/gql/alpha';
const FILE_LOCATION = './SlugList.txt';
const TOPNUMBER = 8;
require('dotenv').config()
const graphQLClient = new GraphQLClient(endpoint, {
  credentials: "include",
  mode: "cors",
  headers: {
    Authorization: `Bearer ${process.env.SMASHGG_TOKEN}`
  }
});
 
var twitterClient = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

//Gets the slugs of the last 5 tournaments in Merida
async function getLastTournaments() {
  let slugs = [];
  let tournamentsQuery = `query TournamentsByState($perPage: Int, $state: String!) {
    tournaments(query: {
      perPage: $perPage
      filter: {
        addrState: $state
      }
    }) {
      nodes {
        slug
      }
    }
  }`;
  let tournamentsVariables = `
  {
    "perPage": 5,
    "state": "Yuc."
  }`
  try {
    let data = await graphQLClient.request(tournamentsQuery, tournamentsVariables);

    for (let i = 0; i < data.tournaments.nodes.length; i++) {
      slugs.push(data.tournaments.nodes[i].slug);
    }

  } catch (err) {
    console.log(err);
  }
  return slugs;

}


//returns an array with tournaments that haven't been twitted
async function findNewTournaments(slugs) {
  let unpostedSlugs = [];

  data = fs.readFileSync(FILE_LOCATION, 'utf8')
  for (i = 0; i < slugs.length; i++) {
    if (!data.includes(slugs[i])) {
      unpostedSlugs.push(slugs[i]);
    }
  }

  return unpostedSlugs;
}

//Gets an array of slugs and returns the ones that already ended
async function getFinishedTournaments(slugs) {
  let finishedSlugs = [];
  for (i = 0; i < slugs.length; i++) {
    if (await isFinished(slugs[i])) {
      finishedSlugs.push(slugs[i]);
    }
  }
  //console.log(finishedSlugs);
  return finishedSlugs;

}

//Gets a slug and returns true if is finished or false otherwise
async function isFinished(slug) {
  let query = `query TournamentQuery($slug: String) {
		tournament(slug: $slug){
			state
		}
  }`
  let variable = `{
    "slug": "`+ slug + `"
    }`
  let finished = false;
  let data = await graphQLClient.request(query, variable);
  state = data.tournament.state;

  if (state == 3) {
    finished = true;
  }
  return finished;
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
      "perPage": 8
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
    let player = await getPlayerInfo(standing.player_id);
    let placement = standing.placement;
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

  //add tournament link
  results += "\n View on smash gg: https://smash.gg/" + eventInfo.event.slug;

  return results;
}

async function writeTweetFake(eventId, new_standings) {
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
          results += "@" + "kike_sala"
        } else {
          results += player_1.gamerTag;
        }
        if (player_2.twitterHandle) {
          results += " / @" + "kike_sala" + "\n";
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
          results += placement + ": @" + "kike_sala" + "\n";
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
async function postTweet(tweet,slug) {
  twitterClient.post('statuses/update', {status: tweet}, (err,tweet,res) =>{
    if(err) throw err;
    addPostedTournaments(slug + "\n");
  });
  

}
async function addPostedTournaments(tournaments) {
  fs.appendFile(FILE_LOCATION, tournaments, function (err) {
    if (err) return console.error(err);
  });
}
//Twits all the events top 8 from the tournaments it gets
async function postTournaments(slugs) {
  let posted = "";
  let wasPosted = false;
  for (let i = 0; i < slugs.length; i++) {

    tournamentSlug = slugs[i];
    let eventsId = await getEventsId(tournamentSlug);

    for (let j = 0; j < eventsId.length; j++) {
      eventId = eventsId[j].id;
      let standings = await getEventStandings(eventId);

      let parsedStandings = parseStandings(standings);

      let tweet = await writeTweet(eventId, parsedStandings);
      postTweet(tweet, tournamentSlug);
    }
  }
}


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

async function hourly() {
  try {

    let lastTournaments = await getLastTournaments();

    let newTournaments = await findNewTournaments(lastTournaments);
    let newFinishedTournaments = await getFinishedTournaments(newTournaments);

    if (newFinishedTournaments) {
      postTournaments(newFinishedTournaments);
    }
  } catch (err) {
    console.log(err);
  }




}

async function main(){
  var j = schedule.scheduleJob('*/1 * * * *', function(){ 
    hourly();
    });
}
main();