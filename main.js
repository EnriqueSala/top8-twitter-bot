var results = "";

//fill in event/tournament name
var event_info = await this.getEventInfo(event_id);

results += "Results for " + event_info.tournament_name + " - " + event_info.event_name + " - " + new_standings.length + " entrants \n\n";

for(let i = 0; i < new_standings.length; i++) {
    let standing = new_standings[i];
    //get player twitter handle or gamertag
    let player = await this.getPlayer(standing.player_id);
    let placement = standing.placement;

    if(player) {
        if(player.twitterhandle) {
        results += placement + ": @" + player.twitterhandle + "\n";
        } else {
            results += placement + ": " + player.gamer_tag + "\n";
        }
    } else {
        results += placement + ": " + standing.name + "\n";
    }
    
}

//add tournament link
results += "\n View on smash gg: https://smash.gg/" + event_info.slug;

var client = new Twitter({
  consumer_key: 'your key',
  consumer_secret: 'your key',
  access_token_key: 'your key',
  access_token_secret: 'your key'
});

await client.post('statuses/update', {status: results})
  .then(function (tweet) {
    console.log(tweet);
  })
  .catch(function (error) {
    console.log(error);
  })