
const smashgg = require('smashgg.js');
smashgg.initialize('<your api key>');
const SMASH_ID = 1386;

var tournamentQuery= `
query MeridaTournaments($perPage: Int, $coordinates: String!, $radius: String!) {
    tournaments(query: {
      perPage: $perPage
      filter: {
        videogameIds:`+  SMASH_ID + `
        location: {
          distanceFrom: $coordinates,
          distance: $radius
        }
      }
    }) {
      nodes {
        id
        name
        events{
          id
          name
          slug
        }
      }
    }
  }`
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
    }`


var eventVariables = {
    "id": event_id,
    "page": 1,
    "perPage": 25
};

await graphQLClient.request(eventQuery, eventVariables).then(async data => {
    let event = data.event;
    }).catch(err => {
        console.log(err);
    })

function parseStandings(event) {
    let event_id = event.id;
    let standings = [];
    let new_standings = [];
    let placement = 0;
    let player_1_id = null;
    let player_2_id = null;
    let player_name = null;
    let player_2_name = null;

    if(event.standings) {

        standings = event.standings.nodes;

        for(standing in standings) {
            
                let placement = standings[standing].placement;
                let entrant = standings[standing].entrant;
                let entrant_id = entrant.id;
            
            player_name = entrant.name;

            let participants = entrant.participants;
            
            for(participant in participants) {
                let player = participants[participant].player;

                if(participant == 0) {
                    player_1_id = player.id;
                                } else if(participant == 1) {
                    player_2_id = player.id; //dubs detection?
                player_2_name = player.gamerTag;
                }
            }
            if(player_2_id) { //dubs
                new_standings.push({player_1_id: player_1_id, name: player_name, player_2_id: player_2_id, placement: placement});
            } else {
                new_standings.push({player_id: player_1_id, name: player_name, placement: placement});
            }
            
            }

        new_standings = JSON.stringify(new_standings);
    }

    return new_standings;
}