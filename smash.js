require('colors');
const smashgg = require('smashgg.js');
const {Event} = smashgg;
 
smashgg.initialize('846e6f94b123d87c2b6097b5205402f0');
 
(async function(){
    let tournamentSlug = 'function-1-recursion-regional';
    let eventSlug = 'melee-singles';
    let meleeAtFunction = await Event.get(tournamentSlug, eventSlug);
 
    let sets = await meleeAtFunction.getSets();
    let phaseGroups = await meleeAtFunction.getPhaseGroups();
 
    console.log('Function 1 had %s sets played in %s phase groups', 
        sets.length, phaseGroups.length);
 
    console.log('Set Results:')
    for(var i in sets){
        console.log(`${String(sets[i].getFullRoundText()).magenta}: ${String(sets[i].getDisplayScore()).green}`);
    }
 
    return true; // exit async
})()