
const smashgg = require('smashgg.js');
const TOKEN = '846e6f94b123d87c2b6097b5205402f0';
const SMASH_ID = 1386;
const MERIDA_COORDINATES = "20.967778, -89.621667";
const RADIUS = "50mi";
const { GraphQLClient } = require('graphql-request');
const endpoint = 'https://api.smash.gg/gql/alpha';

smashgg.initialize (TOKEN);
//const graphQLClient = new GraphQLClient(endpoint,{});

const tournamentQuery= `
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
  }`;

const tournamentVariables ={
    "perPage": 4,
    "coordinates": MERIDA_COORDINATES,
    "radius": RADIUS
};

const graphQLClient = new GraphQLClient(endpoint, {
    credentials: "include",
    mode: "cors",
    headers: {
      Authorization: `Bearer ${TOKEN}`
    }
  });


function main(){
    graphQLClient.request(tournamentQuery, tournamentVariables).then(async data => {
        let event = data.event;
        console.log(data.tournaments.nodes[0].events);
    }).catch(err => {
        console.log(err);
    });

    //for each (var tournament in data.tournaments.nodes){

    //}
}
main();
console.log("test");