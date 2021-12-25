console.log(process.version);
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const request = require('request');

const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { send } = require('process');
const { get } = require('request');
const { setEnvironmentData } = require('worker_threads');
const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS]});

client.login(process.env.DISCORD_BOT_TOKEN);
client.on('ready', () => {
    console.log(`${client.user.tag} has logged in.`);
    client.user.setPresence({ activities: [{ name: '-help' }], status: 'online' });
});

//Reads a file and returns the file as a string
function bufferFile(filePath) {
    return fs.readFileSync(filePath);
}

/* Variables */
const PREFIX = '-';
const ROOT_DIR = path.resolve(__dirname, '..')
//user data
var userDataPath;
var userData;
try {
    userDataPath = `${ROOT_DIR}/data/user_data.json`;
    userData = JSON.parse(bufferFile(userDataPath));
}
catch {
    userData = new Object();
}
//command data
var commandData = JSON.parse((bufferFile(`${ROOT_DIR}/data/command.json`) + '').replaceAll('${PREFIX}', PREFIX));

var mapList = ['Fracture', 'Breeze', 'Icebox', 'Bind', 'Haven', 'Split', 'Ascent'];
var rankList = ['i1', 'i2', 'i3', 'b1', 'b2', 'b3', 's1', 's2', 's3', 'g1', 'g2', 'g3', 'p1', 'p2', 'p3', 'd1', 'd2', 'd3', 'imm1', 'imm2', 'imm3', 'r1'];
//list of users currently in the queue
var currentQueue = [];
//list of current on going matches
var currentMatches = [];
//Embed color
var formatedRGB = [0, 75, 255];

//loads from path
function loadData() {
    userData = JSON.parse(bufferFile(userDataPath));
    console.log(userData);
}

//saves user data
saveData = async function(url) {
    return new Promise(async function(resolve, reject) {
        let returnMessage;
        try {
            if (url) {
                let r = fs.createWriteStream(`${userDataPath}`);
                request.get(url) 
                    .on('error', console.error)
                    .pipe(r);

                r.on('finish', function() {
                    returnMessage = true;
                    resolve(returnMessage);
                });
            }
            else {
                console.log('Saving...');
                //console.log(userData);
        
                fs.writeFile(userDataPath, JSON.stringify(userData, null, 2), (error) => {
                    console.error(error);
                });
                returnMessage = true;
                resolve(returnMessage);
                /*
                userDataEditor.set(userData);
                userDataEditor.save();*/
            }
            
        }
        catch(error) {
            console.error(error);
        }
    });
}

//sorts data
var sortData = function() {
    let unordered = userData
    let ordered = Object.keys(unordered).sort((function(valuea, valueb) {
        if (userData[valuea].pp > userData[valueb].pp) {
            return -1;
        }
        else if (userData[valuea].pp < userData[valueb].pp) {
            return 1;
        }
        else {
            if (rankToRR(userData[valuea].rank) > rankToRR(userData[valueb].rank)) {
                return -1;
            }
            else if (rankToRR(userData[valuea].rank) < rankToRR(userData[valueb].rank)) {
                return 1;
            }
            else {
                if (userData[valuea].hp > userData[valueb].hp) {
                    return -1;
                }
                else if (userData[valuea].hp < userData[valueb].hp) {
                    return 1;
                }
                else {
                    return 0;
                }
            }
        }
    })).reduce(
        (obj, key) => { 
            obj[key] = unordered[key]; 
            return obj;
        }, 
        {}
    );

    userData = ordered;
}

//Returns formatted date
function getFormattedDate() {
    let date = new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

//Returns a new user object
var newUser = function() {
    let userObj = new Object();
    //in game name
    userObj.ign = '';
    //points
    userObj.pp = 1000;
    //rank
    userObj.rank = 0;
    //win loss
    userObj.wl = 0;
    //host priority
    userObj.hp = 0;

    return userObj;
}

//Finds and returns role in guild by name
var findRole = function (guild, name){
    var role = null;
    role = guild.roles.cache.find(val => val.name === name);
    return role;
}

//returns emoji
var findEmoji = function (guild, name) {
    var emoji = guild.emojis.cache.find(emoji => emoji.name === name);
    //console.log(name);
    return `<:${emoji.name}:${emoji.id}>`;
}

//Send discord embed
var sendEmbed = async function(channel, message, title, comp){
    return new Promise(async function(resolve, reject) {
        let richEmbed = new MessageEmbed();
        richEmbed.setDescription(message);
        richEmbed.setColor(formatedRGB);
        if (title) {
            richEmbed.setTitle(title);
        }
    
        if (comp) {
            let returnMessage = await channel.send({embeds: [richEmbed], components: comp});
            resolve(returnMessage);
        }
        else {
            let returnMessage = await channel.send({embeds: [richEmbed]});
            resolve(returnMessage);
        }
    });
}

//returns a new embed
var getEmbed = function(message, title, comp){
    let richEmbed = new MessageEmbed();
    richEmbed.setDescription(message);
    richEmbed.setColor(formatedRGB);
    if (comp) {
        richEmbed.setTitle(title);
        return {embeds: [richEmbed], components: comp};
    }
    else if (title) {
        richEmbed.setTitle(title);
    }

    return richEmbed;
}

//converts rank str to full rank name
var rankToFull = function(rankStr) {
    switch (rankStr) {
        case 'i1':  
            return 'iron 1';
        case 'i2':    
            return 'iron 2';
        case 'i3':    
            return 'iron 3';
        case 'b1':    
            return 'bronze 1';
        case 'b2':    
            return 'bronze 2';
        case 'b3':    
            return 'bronze 3';
        case 's1':
            return 'Silver 1';
        case 's2':
            return 'silver 2';
        case 's3':
            return 'silver 3';
        case 'g1':
            return 'gold 1';
        case 'g2':
            return 'gold 2';
        case 'g3':
            return 'gold 3';
        case 'p1':
            return 'platinum 1';
        case 'p2':
            return 'platinum 2';
        case 'p3':
            return 'platinum 3';
        case 'd1':
            return 'diamond 1';
        case 'd2':
            return 'diamond 2';
        case 'd3':
            return 'diamond 3';
        case 'imm1':
            return 'immortal 1';
        case 'imm2':
            return 'immortal 2';
        case 'imm3':
            return 'immortal 3';
        case 'r1':
            return 'radiant';
    }
}

//converts rankstr to rr
var rankToRR = function(rankStr) {
    switch (rankStr) {
        case 'i1':  
            return 0;
        case 'i2':    
            return 100;
        case 'i3':    
            return 200;
        case 'b1':    
            return 300;
        case 'b2':    
            return 400;
        case 'b3':    
            return 500;
        case 's1':
            return 600;
        case 's2':
            return 700;
        case 's3':
            return 800;
        case 'g1':
            return 900;
        case 'g2':
            return 1000;
        case 'g3':
            return 1100;
        case 'p1':
            return 1200;
        case 'p2':
            return 1300;
        case 'p3':
            return 1400;
        case 'd1':
            return 1500;
        case 'd2':
            return 1600;
        case 'd3':
            return 1700;
        case 'imm1':
            return 1800;
        case 'imm2':
            return 1900;
        case 'imm3':
            return 2000;
        case 'r1':
            return 2300;
    }
}

//converts <@DISCORD_ID> to DISCORD_ID
function getIdFromMsg(message) {
    var tempIntI1 = 0;
    var tempIntI2 = message.length;
    for (i = 0; i < message.length; i++) {
        if ((message[i] >= 0) && (message[i] <= 9)) {
            break;
        }
        else {
            tempIntI1 += 1;
        }
    }

    for (i = message.length - 1; i >= 0; i--) {
        if ((message[i] >= 0) && (message[i] <= 9)) {
            break;
        }
        else {
            tempIntI2 -= 1;
        }
    }
    return message.substring(tempIntI1, tempIntI2);
}

client.on('guildMemberAdd', async member => {
    //console.log('h');
    try {
        member.guild.channels.cache.find(channel => channel.name.toLowerCase() == 'welcome').send(`Welcome to ${member.guild.name} <@${member.id}>\nTo join the customs type the following command in <#${member.guild.channels.cache.find(channel => channel.name.toLowerCase() == 'register').id}> \`\`\`-register name#tag\`\`\``);
    }
    catch(e) {console.log(e);}
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) {
        return;
    }

    let args = interaction.customId.split(' ');

    if (args[0] == 'lb') {
        //lb <user_id> <next/prev/get> <id/pgnum>

        if (args[1] != interaction.user.id) {
            return;
        }

        let pgNum;
        let startNum;
        let finalMsg;

        if (args[2] == 'next') {
            try {
                pgNum = parseInt(args[3]) + 1;
                startNum = pgNum*10;
                finalMsg = `#${startNum+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum]].ign}: ${userData[Object.keys(userData)[startNum]].pp}\n`;
                //let lGap = (userData[Object.keys(userData)[0]].pp + '').length;
                //console.log()
                //console.log(lGap);
                //console.log((userData[Object.keys(userData)[1]].pp + '').length);
                for (var i = 1; i < 10; i++) {
                    try {
                        //console.log(findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[i]].rank).split(' ')[0])));
                        //${((i < 9) ? ' ' : '')}
                        //${userData[Object.keys(userData)[i]].pp}${" \u200b".repeat((lGap - (userData[Object.keys(userData)[i]].pp + '').length) + 1)}
                        //let numSpaces = lGap - `${userData[Object.keys(userData)[i]].pp}`.length + 1;
                        //console.log(numSpaces)
                        finalMsg += `#${startNum+i+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum+i]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum+i]].ign}: ${userData[Object.keys(userData)[startNum+i]].pp}\n`;
                    }
                    catch(e) {

                    }
                }
            }
            catch {
                pgNum -= 1;
                finalMsg = interaction.message.embeds[0].description;
            }
        }
        else if (args[2] == 'prev') {
            try {
                pgNum = parseInt(args[3]) - 1;
                startNum = pgNum*10;
                finalMsg = `#${startNum+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum]].ign}: ${userData[Object.keys(userData)[startNum]].pp}\n`;
                //let lGap = (userData[Object.keys(userData)[0]].pp + '').length;
                //console.log()
                //console.log(lGap);
                //console.log((userData[Object.keys(userData)[1]].pp + '').length);
                for (var i = 1; i < 10; i++) {
                    try {
                        //console.log(findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[i]].rank).split(' ')[0])));
                        //${((i < 9) ? ' ' : '')}
                        //${userData[Object.keys(userData)[i]].pp}${" \u200b".repeat((lGap - (userData[Object.keys(userData)[i]].pp + '').length) + 1)}
                        //let numSpaces = lGap - `${userData[Object.keys(userData)[i]].pp}`.length + 1;
                        //console.log(numSpaces)
                        finalMsg += `#${startNum+i+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum+i]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum+i]].ign}: ${userData[Object.keys(userData)[startNum+i]].pp}\n`;
                    }
                    catch(e) {

                    }
                }
            }
            catch {
                pgNum += 1;
                finalMsg = interaction.message.embeds[0].description;
            }
        }
        else if (args[2] == 'get') {
            try {
                pgNum = Math.floor(Object.keys(userData).indexOf(args[3]) / 10);
                console.log(Object.keys(userData).indexOf(args[3]));
                console.log(pgNum);
                startNum = pgNum*10;
                finalMsg = `#${startNum+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum]].ign}: ${userData[Object.keys(userData)[startNum]].pp}\n`;
                //let lGap = (userData[Object.keys(userData)[0]].pp + '').length;
                //console.log()
                //console.log(lGap);
                //console.log((userData[Object.keys(userData)[1]].pp + '').length);
                for (var i = 1; i < 10; i++) {
                    try {
                        //console.log(findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[i]].rank).split(' ')[0])));
                        //${((i < 9) ? ' ' : '')}
                        //${userData[Object.keys(userData)[i]].pp}${" \u200b".repeat((lGap - (userData[Object.keys(userData)[i]].pp + '').length) + 1)}
                        //let numSpaces = lGap - `${userData[Object.keys(userData)[i]].pp}`.length + 1;
                        //console.log(numSpaces)
                        finalMsg += `#${startNum+i+1} ${findEmoji(interaction.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[startNum+i]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[startNum+i]].ign}: ${userData[Object.keys(userData)[startNum+i]].pp}\n`;
                    }
                    catch(e) {

                    }
                }
            }
            catch(e) {
                console.log(e);
                pgNum = 0;
                finalMsg = interaction.message.embeds[0].description;
            }
        }

        let rowList = [];

        rowList.push(new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId(`lb ${interaction.user.id} prev ${pgNum}`)
                .setLabel(`<< Prev page`)
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(`lb ${interaction.user.id} next ${pgNum}`)
                .setLabel(`>> Next page`)
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(`lb ${interaction.user.id} get ${interaction.user.id}`)
                .setLabel(`My page`)
                .setStyle('SUCCESS'),
        ));

        interaction.update({embeds: [getEmbed(finalMsg, interaction.message.embeds[0].title)], components: rowList});

        return;
    }

    if (args[0] == 'hostButton') {
        try {
            //console.log('1');
            var isValid = false;
            var matchIndex = 0;

            //console.log(currentMatches);
    
            for (var i = 0;i<currentMatches.length;i++) {
                //[author, channel]
                if ((currentMatches[i][2][0] == interaction.user.id) && (currentMatches[i][2][1] == interaction.message.channel.id)) {
                    //console.log('user is host');
                    matchIndex = i;
                    isValid = true;
                }
            }

            if ((args[1] == '3') && (isValid)) {

                var team1vcRole = findRole(interaction.guild, 'team1vc');
                var team2vcRole = findRole(interaction.guild, 'team2vc');
                for (var i = 0;i < currentMatches[currentMatches.length - 1][0].length;i++) {
                    try {
                        if(team1vcRole === null){
                            
                        }
                        else {
                            userData[currentMatches[currentMatches.length - 1][0][i]].hp += 1;
                            (await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][0][i])).roles.remove(team1vcRole);
                            //(await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][1][i])).roles.remove(team1vcRole);
                        }
                    }
                    catch (e) {
                        //console.log(e);
                    }
                }
    
                for (var i = 0;i < currentMatches[currentMatches.length - 1][1].length;i++) {
                    try {
                        if(team2vcRole === null){
                            
                        }
                        else {
                            userData[currentMatches[currentMatches.length - 1][1][i]].hp += 1;
                            (await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][1][i])).roles.remove(team2vcRole);
                        }
                    }
                    catch (e) {
                        //console.log(e);
                    }
                }

                currentMatches.splice(matchIndex, 1);
                interaction.update({embeds: [getEmbed('Match has been canceled', interaction.message.embeds[0].title)], components: []});
                return;
            }

            //console.log('2');
            
            if (isValid) {
                //console.log('3');
                var richEmbed = new MessageEmbed();
                richEmbed.setTitle('Match');
    
                var cMatch = currentMatches[matchIndex];
                
                finalMessage = 'Map: ' + cMatch[2][2];
    
                /*finalMessage += '\nTeam 1: ';
    
                for (var i = 0;i < cMatch[0].length; i++) {
                    finalMessage += userData[cMatch[0][i]].ign + ' ';
                    
                }
    
                finalMessage += '\n\nTeam 2: ';
    
                for (var i = 0;i < cMatch[1].length; i++) {
                    finalMessage += userData[cMatch[1][i]].ign + ' ';
                }*/
    
                if (args[1] == '1') {
                    console.log('team 1 wins');
                    //team 1 wins
                    finalMessage += '\n\nWinner: Team 1\n\nTeam 1:\n';
    
                    console.log(cMatch);

                    for (var i = 0;i < cMatch[0].length; i++) {
                        if (userData[cMatch[0][i]].wl < 0) {
                            userData[cMatch[0][i]].wl = 1;
                        }
                        else {
                            userData[cMatch[0][i]].wl += 1;
                        }
                        var rrGain = 20 + userData[cMatch[0][i]].wl;
                        finalMessage += userData[cMatch[0][i]].ign + ': + ' + rrGain + ' = ' + (userData[cMatch[0][i]].pp + rrGain) + '\n';
                        userData[cMatch[0][i]].pp += rrGain;
                    }
    
                    finalMessage += '\nTeam 2:\n';
                    for (var i = 0;i < cMatch[1].length; i++) {
                        if (userData[cMatch[1][i]].wl > 0) {
                            userData[cMatch[1][i]].wl = -1;
                        }
                        else {
                            userData[cMatch[1][i]].wl -= 1;
                        }
                        var rrGain = 20 - userData[cMatch[1][i]].wl;
                        finalMessage += userData[cMatch[1][i]].ign + ': - ' + rrGain + ' = ' + (userData[cMatch[1][i]].pp - rrGain) + '\n';
                        userData[cMatch[1][i]].pp -= rrGain;
                    }
                }
                else if (args[1] == '2') {
                    //team 2 wins
                    finalMessage += '\n\nWinner: Team 2\n\nTeam 1:\n';
    
                    for (var i = 0;i < cMatch[0].length; i++) {
                        if (userData[cMatch[0][i]].wl > 0) {
                            userData[cMatch[0][i]].wl = -1;
                        }
                        else {
                            userData[cMatch[0][i]].wl -= 1;
                        }
                        var rrGain = 20 - userData[cMatch[0][i]].wl;
                        finalMessage += userData[cMatch[0][i]].ign + ': - ' + rrGain + ' = ' + (userData[cMatch[0][i]].pp - rrGain) + '\n';
                        userData[cMatch[0][i]].pp -= rrGain;
                    }
    
                    finalMessage += '\nTeam 2:\n';
                    for (var i = 0;i < cMatch[1].length; i++) {
                        if (userData[cMatch[1][i]].wl < 0) {
                            userData[cMatch[1][i]].wl = 1;
                        }
                        else {
                            userData[cMatch[1][i]].wl += 1;
                        }
                        var rrGain = 20 + userData[cMatch[1][i]].wl;
                        finalMessage += userData[cMatch[1][i]].ign + ': + ' + rrGain + ' = ' + (userData[cMatch[1][i]].pp + rrGain) + '\n';
                        userData[cMatch[1][i]].pp += rrGain;
                    }
                }
    
                try {
                    var team1vcRole = findRole(interaction.guild, 'team1vc');
                    var team2vcRole = findRole(interaction.guild, 'team2vc');
                    for (var i = 0;i < currentMatches[currentMatches.length - 1][0].length;i++) {
                        try {
                            if(team1vcRole === null){
                                
                            }
                            else {
                                userData[currentMatches[currentMatches.length - 1][0][i]].hp += 1;
                                (await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][0][i])).roles.remove(team1vcRole);
                                //(await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][1][i])).roles.remove(team1vcRole);
                            }
                        }
                        catch (e) {
                            //console.log(e);
                        }
                    }
        
                    for (var i = 0;i < currentMatches[currentMatches.length - 1][1].length;i++) {
                        try {
                            if(team2vcRole === null){
                                
                            }
                            else {
                                userData[currentMatches[currentMatches.length - 1][1][i]].hp += 1;
                                (await interaction.guild.members.fetch(currentMatches[currentMatches.length - 1][1][i])).roles.remove(team2vcRole);
                            }
                        }
                        catch (e) {
                            //console.log(e);
                        }
                    }
        
                    richEmbed.setDescription(finalMessage);
                    richEmbed.setColor(formatedRGB);
        
                    interaction.update({embeds: [richEmbed], components: []});
                    //console.log('updates');
                    currentMatches.splice(matchIndex, 1);

                    //sort leaderboard

                    console.log('sorting...');
                    sortData();
                }
                catch(e) {}
                saveData();

                console.log('Sending');

                (await client.guilds.fetch('571780425211576330')).channels.cache.get('923750880673677373').send({files: [{
                    attachment: `${userDataPath}`,
                    name: 'user_data.json'
                }]});
                
                /*interaction.guild.channels.cache.get('920472848462655508').send({files: [{
                    attachment: `${userDataPath}`,
                    name: 'user_data.json'
                }]});*/

                return;
            }
        }
        catch(e) {
            console.log(e)
            return;
        }
    }

    try {
        //[id, 'partial rank str', 'button label']

        if (interaction.user.id == args[0]) {
            if (parseInt(args[1].at(-1))) {
                userData[interaction.user.id].rank = args[1];

                let richEmbed = new MessageEmbed();
                //sendFormatted3(message.channel, 'Register', 'Your name has been set to ' + jsonobject.value[message.author.id].ign + '.');
                richEmbed.setDescription(`${userData[interaction.user.id].ign}\'s rank has been set to ${rankToFull(args[1])}. Setting an incorrect rank may lead to a ban. For a list of commands, type\`\`-help\`\`\n\nIf you\'re just trying to play, then join queue with \`\`\`-j\`\`\``);
                richEmbed.setColor(formatedRGB);
                richEmbed.setTitle(interaction.message.embeds[0].title);

                interaction.update({embeds: [richEmbed], components: []});
                saveData();
            }
            else {
                let rowList = [];

                rowList.push(new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId(`${interaction.user.id} ${args[1]}1 ${args[2]}`)
                        .setLabel(`${args[2]} 1`)
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(`${interaction.user.id} ${args[1]}2 ${args[2]}`)
                        .setLabel(`${args[2]} 2`)
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(`${interaction.user.id} ${args[1]}3 ${args[2]}`)
                        .setLabel(`${args[2]} 3`)
                        .setStyle('PRIMARY'),
                ));

                interaction.update({embeds: interaction.message.embeds, components: rowList});
            }
        }
    }
    catch (error) {
        console.error(error);
    }
});

client.on('messageCreate', async (message) => {

    if (message.author.bot) {
        return;
    }

    if (message.channel.name == 'general') {
        return;
    }

    if (!message.content.startsWith(PREFIX)) {
        return;
    }

    console.log("\x1b[32m", `\n${getFormattedDate()}`, "\x1b[0m");

    console.log(message.content);
    console.log(userData[message.author.id]);

    var inputs = message.content.substring(PREFIX.length).split(' ');

    try {
        if (!userData[message.author.id]) {
            //console.log(message.author.id);
            userData[message.author.id] = newUser();
            console.log(userData[message.author.id]);
            saveData();
            console.log('Initializing user');
        }

        if (inputs[0] == 'register') {
            //also used below this if statment
            let genericError = function() {
                sendEmbed(message.channel, 'To register, run the following command where \"In Game Name#tag\" is your valorant user name and tag.\n```-register In Game Name#tag```\nFor example ``-register 100T Asuna#1111``', 'Register');
            }

            if (inputs[1]) {
                var inGameName = inputs[1];
                for (var i = 2; i < inputs.length;i++) {
                    inGameName += ' ' + inputs[i]
                }

                if ((inGameName.length <= 24) && (inGameName.length >= 3)) {
                    userData[message.author.id].ign = inGameName;
                    if (userData[message.author.id].rank != 0) {
                        message.reply({embeds: [getEmbed(`Your name has been set to ${userData[message.author.id].ign}`, 'Register')]});
                        saveData();
                        return;
                    }
                    rowList = []
                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} i Iron`)
                            .setLabel('Iron')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} b Bronze`)
                            .setLabel('Bronze')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} s Silver`)
                            .setLabel('Silver')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} g Gold`)
                            .setLabel('Gold')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} p Platinum`)
                            .setLabel('Platinum')
                            .setStyle('PRIMARY'),
                    ));

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} d Diamond`)
                            .setLabel('Diamond')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} imm Immortal`)
                            .setLabel('Immortal')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} r1 Radiant`)
                            .setLabel('Radiant')
                            .setStyle('PRIMARY'),
                    ));
                    
                    //message.channel.send({content: 'Hola', components: [row]});
                    message.reply(getEmbed('Your name has been set to ' + userData[message.author.id].ign + '. To set your rank, choose from the following options. Setting an incorrect rank may lead to a ban.', 'Rank Assign', rowList));
                    saveData();
                    return;
                }
                else {
                    sendEmbed(message.channel, 'Your name must be between 3 and 24 characters', 'Register');
                    return;
                }
            }
            else {
                genericError();
                return;
            }
        }
        else if (userData[message.author.id].ign == '') {
            sendEmbed(message.channel, 'To register, run the following command where \"In Game Name#tag\" is your valorant user name and tag.\n```-register In Game Name#tag```\nFor example ``-register 100T Asuna#1111``', 'Register');
            return;
        }

        if (inputs[0] == 'rank') {
            //used below statement
            let genericError = function() {
                sendEmbed(message.channel, 'To set your rank, run the following command and choose from the options\n```-rank```', 'Rank Assign');
            }

            if (userData[message.author.id].ign != '') {
                try {
                    let rowList = [];

                    /*rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} i`)
                            .setLabel('Iron')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} b`)
                            .setLabel('Bronze')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} s`)
                            .setLabel('Silver')
                            .setStyle('PRIMARY'),
                    ));

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} g`)
                            .setLabel('Gold')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} p`)
                            .setLabel('Platinum')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} d`)
                            .setLabel('Diamond')
                            .setStyle('PRIMARY'),
                    ));

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} imm`)
                            .setLabel('Immortal')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} r`)
                            .setLabel('Radiant')
                            .setStyle('PRIMARY'),
                    ));*/

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} i Iron`)
                            .setLabel('Iron')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} b Bronze`)
                            .setLabel('Bronze')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} s Silver`)
                            .setLabel('Silver')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} g Gold`)
                            .setLabel('Gold')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} p Platinum`)
                            .setLabel('Platinum')
                            .setStyle('PRIMARY'),
                    ));

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`${message.author.id} d Diamond`)
                            .setLabel('Diamond')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} imm Immortal`)
                            .setLabel('Immortal')
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`${message.author.id} r1 Radiant`)
                            .setLabel('Radiant')
                            .setStyle('PRIMARY'),
                    ));
                    
                    //message.channel.send({content: 'Hola', components: [row]});
                    message.reply(getEmbed('To set your rank, choose from the following options. Setting an incorrect rank may lead to a ban.', 'Rank Assign', rowList));

                }
                catch(error) {
                    console.log(error);
                    genericError();
                }
            }
            else {
                genericError();
            }
        }
        else if (userData[message.author.id].rank == 0) {
            sendEmbed(message.channel, 'To set your rank, run the following command and choose from the options\n```-rank```', 'Rank Assign');
            return;
        }
        else if ((inputs[0] == 'p') || (inputs[0] == 'points') || (inputs[0] == 'stats') || (inputs[0] == 'elo') || (inputs[0] == 'mmr') || (inputs[0] == 'rr')) {
            //console.log('pp')
            var tempString2 = '';
            if (inputs[1]) {
                if (userData[getIdFromMsg(inputs[1])]) {
                    tempString2 += userData[getIdFromMsg(inputs[1])].ign + ' is ' + rankToFull(userData[getIdFromMsg(inputs[1])].rank) + ' and has ' + userData[getIdFromMsg(inputs[1])].pp + ' points. ';
                }
                else {
                    sendEmbed(message.channel, 'User has not registered.');
                    return;
                }
            }
            else {
                tempString2 += userData[message.author.id].ign + ' is ' + rankToFull(userData[message.author.id].rank) + ' and has ' + userData[message.author.id].pp + ' points. ';
            }

            /*if (inputs[0] == 'pps') {
                //message.channel.send(tempString);
                tempString2 += tempString;
            }
            if (tempString2 != '') {
                sendFormatted2(message.channel, tempString2);
            }*/
            sendEmbed(message.channel, tempString2);
        }
        else if (inputs[0] == 'q') {
            var finalMessage = '';
            for (var i = 0;i<currentQueue.length;i++) {
                finalMessage += userData[currentQueue[i]].ign + '\n';
            }
            sendEmbed(message.channel, finalMessage, 'Players: ' + currentQueue.length + '/10');
        }
        else if (inputs[0] == 'j') {
            var currIndex = currentQueue.indexOf(message.author.id);

            for (var i = 0;i<currentMatches.length;i++) {
                for (var j = 0;j<2;j++) {
                    for (var k = 0;k<currentMatches[i][j].length;k++) {
                        if (currentMatches[i][j][k] == message.author.id) {
                            sendEmbed(message.channel, 'Cannot join queue while in a match');
                            return;
                        }
                    }
                }
            }

            if (currIndex == -1) {
                var pingBreak = '';
                if ((message.author.id == '203206356402962432') && (inputs[1])) {
                    var testQueue = Object.keys(userData).slice(0, 10);
                    for (var i = 0;i<testQueue.length;i++) {
                        currentQueue.push(testQueue[i]);
                        sendEmbed(message.channel, userData[testQueue[i]].ign + ' has joined the queue: ' + currentQueue.length + '/10');
                    }
                    pingBreak = '...';
                    //console.log('1');
                }
                else {
                    currentQueue.push(message.author.id);
                    sendEmbed(message.channel, userData[message.author.id].ign + ' has joined the queue: ' + currentQueue.length + '/10');
                }
                if ((currentQueue.length >= 10) && (true)) {
                    
                    var preMessage = '';

                    var hostText = '';
                    var hostIdList = [0];
                    var highestElo = -1;

                    for (var i = 0;i<currentQueue.length;i++) {
                        if (userData[currentQueue[i]].hp > highestElo) {
                            hostText = userData[currentQueue[i]].ign;
                            highestElo = userData[currentQueue[i]].hp;
                            hostIdList[0] = currentQueue[i];
                        }
                        preMessage += '<' + pingBreak + '@' + currentQueue[i] + '> ';
                    }

                    //hostText = userData['203206356402962432'].ign;
                    //hostIdList[0] = '203206356402962432';

                    //console.log('2');
                    var currMap = mapList[parseInt(Math.random()*mapList.length)];
                    /*if (currMap == 'fracture') {
                        currMap = mapList[parseInt(Math.random()*mapList.length)];
                    }*/
                    var postMessage =  'Host: ' + hostText + '\n\nMap: ' + currMap + '\n';
                    var matchSide = [];

                    if (Math.random() > 0.5) {
                        matchSide = ['attackers', 'defenders'];
                    }
                    else {
                        matchSide = ['defenders', 'attackers'];
                    }

                    //console.log('3');

                    postMessage += '\nTeam 1 ' + matchSide[0] + ': ';

                    //console.log('4');

                    var team2Text = '';

                    //console.log('5');

                    //sort
                    //var unSorted = true;
                    /*var sortedQueue = [];
                    var remainingList = currentQueue;
                    while (remainingList.length > 0) {
                        var highestElo = 0;
                        var highestId = 0;
                        var highestIndex = 0;
                        for (var i = 0;i<remainingList.length;i++) {
                            if ((userData[remainingList[i]].pp/5 + rankToRR(userData[remainingList[i]].rank)) > highestElo) {
                                highestId = remainingList[i];
                                highestElo = userData[remainingList[i]].pp;
                                highestIndex = i;
                            }
                        }
                        remainingList.splice(highestIndex, 1);
                        sortedQueue.push(highestId);

                    }
                    currentQueue = sortedQueue;*/
                    /*var tempString = ''
                    for (var i = 0;i<currentQueue.length;i++) {
                        tempString += userData[currentQueue[i]].name + ' ' + userData[currentQueue[i]].rank + '\n'
                    }
                    message.channel.send(tempString);*/

                    currentQueue.sort(function(valuea, valueb) {
                        if (userData[valuea].pp/5 + rankToRR(userData[valuea].rank) > userData[valueb].pp/5 + rankToRR(userData[valueb].rank)) {
                            return 1;
                        }
                        else if (userData[valuea].pp/5 + rankToRR(userData[valuea].rank) < userData[valueb].pp/5 + rankToRR(userData[valueb].rank)) {
                            return -1;
                        }
                        else {
                            return 0;
                        }
                    });
                    
                    /*var tempString = ''
                    for (var i = 0;i<currentQueue.length;i++) {
                        tempString += userData[currentQueue[i]].name + ' ' + userData[currentQueue[i]].rank + '\n'
                    }
                    message.channel.send(tempString);*/

                    //console.log('6');
                    //console.log(currentQueue);

                    //make teams team balance match making
                    var whiteSpace = ' ';
                    currentMatches.push([[],[]]);

                    let team1List = [];
                    let team2List = [];
                    let balVal = 10000

                    let t1Valf;
                    let t2Valf;

                    //https://planetcalc.com/8538/ 126 different possible combinations
                    for (var i = 0; i<125;i++) {
                        try {
                            let tempList = currentQueue.slice(0, 10);
                            let tempt1 = [];
                            let tempt2 = [];

                            let t1Val = 0;
                            let t2Val = 0;

                            for (var j = 0; j <5;j++) {
                                let randI = parseInt(Math.random()*tempList.length);
                                tempt1.push(tempList[randI]);
                                t1Val += rankToRR(userData[tempList[randI]].rank) + userData[tempList[randI]].pp/10;
                                tempList.splice(randI, 1);
                            }
                            for (var j = 0; j <5;j++) {
                                let randI = parseInt(Math.random()*tempList.length);
                                tempt2.push(tempList[randI]);
                                t2Val += rankToRR(userData[tempList[randI]].rank) + userData[tempList[randI]].pp/10;
                                tempList.splice(randI, 1);
                            }

                            if (Math.abs(t1Val - t2Val)/10 < balVal) {
                                team1List = tempt1;
                                team2List = tempt2;
                                balVal = Math.abs(t1Val - t2Val)/10

                                t1Valf = t1Val;
                                t2Valf = t2Val;

                                console.log(balVal);
                            }
                        }
                        catch(e) {
                            //console.log(e);
                        }
                    }

                    let tempmsg = `Team1 ${t1Valf}\n`;
                    for (var i = 0; i < team1List.length; i++) {
                        tempmsg += `${findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[team1List[i]].rank).split(' ')[0]))} ${userData[team1List[i]].ign} ${rankToRR(userData[team1List[i]].rank) + userData[team1List[i]].pp/10}\n`;
                        postMessage += userData[team1List[i]].ign + whiteSpace;
                        currentMatches[currentMatches.length-1][0].push(team1List[i]);
                    }
                    tempmsg += `\nTeam2 ${t2Valf}\n`;
                    for (var i = 0; i < team2List.length; i++) {
                        tempmsg += `${findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[team2List[i]].rank).split(' ')[0]))} ${userData[team2List[i]].ign} ${rankToRR(userData[team2List[i]].rank) + userData[team2List[i]].pp/10}\n`;
                        team2Text += userData[team2List[i]].ign + whiteSpace;
                        currentMatches[currentMatches.length-1][1].push(team2List[i]);
                    }

                    //message.channel.send(tempmsg);

                    /*for (var i = 0;i<(currentQueue.length/2);i++) {
                        if (i == 4) {
                            currentMatches[currentMatches.length-1][1].push(currentQueue[i]);
                            currentMatches[currentMatches.length-1][0].push(currentQueue[currentQueue.length-i-1]);

                            team2Text += userData[currentQueue[i]].ign + whiteSpace;
                            postMessage += userData[currentQueue[currentQueue.length-i-1]].ign + whiteSpace;
                            break;
                        }

                        if (i % 2 == 0) {
                            currentMatches[currentMatches.length-1][0].push(currentQueue[i]);
                            currentMatches[currentMatches.length-1][0].push(currentQueue[currentQueue.length-i-1]);

                            postMessage += userData[currentQueue[i]].ign + whiteSpace;
                            postMessage += userData[currentQueue[currentQueue.length-i-1]].ign + whiteSpace;
                        }
                        else {
                            currentMatches[currentMatches.length-1][1].push(currentQueue[i]);
                            currentMatches[currentMatches.length-1][1].push(currentQueue[currentQueue.length-i-1]);

                            team2Text += userData[currentQueue[i]].ign + whiteSpace;
                            team2Text += userData[currentQueue[currentQueue.length-i-1]].ign + whiteSpace;
                        }
                    }*/

                    //give roles
                    var team1vcRole = findRole(message.guild, 'team1vc');
                    var team2vcRole = findRole(message.guild, 'team2vc');
                    for (var i = 0;i < currentMatches[currentMatches.length - 1][0].length;i++) {
                        try {
                            if(team1vcRole === null){
                                
                            }
                            else {
                                (await message.guild.members.fetch(currentMatches[currentMatches.length - 1][0][i])).roles.add(team1vcRole);
                            }
                        }
                        catch (e) {
                            //console.log(e);
                        }
                    }

                    for (var i = 0;i < currentMatches[currentMatches.length - 1][1].length;i++) {
                        try {
                            if(team2vcRole === null){
                                
                            }
                            else {
                                (await message.guild.members.fetch(currentMatches[currentMatches.length - 1][1][i])).roles.add(team2vcRole);
                            }
                        }
                        catch (e) {
                            //console.log(e);
                        }
                    }

                    //console.log('7');

                    postMessage += '\n\n' + 'Team 2 ' + matchSide[1] + ': ' + team2Text;

                    //console.log(message.guild.channels.cache);

                    let channel = message.guild.channels.cache.find(channel => channel.name.length < 0);
                    try {
                        channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() == 'matches');
                    }
                    catch(e) {
                        console.log(e);
                    }

                    let rowList = [];

                    rowList.push(new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId(`hostButton 1`)
                            .setLabel(`Team 1 wins`)
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`hostButton 2`)
                            .setLabel(`Team 2 wins`)
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId(`hostButton 3`)
                            .setLabel(`Cancel Match`)
                            .setStyle('DANGER'),
                    ));

                    hostIdList.push(channel.id);
                    hostIdList.push(currMap);
                    currentMatches[currentMatches.length-1].push(hostIdList);
                    currentQueue = [];

                    channel.send({content: preMessage, embeds: [getEmbed(postMessage, 'Match')], components: rowList});
                    /*channel.send(preMessage).then(
                        //temp = hostIdList.push(sendFormatted3(client.channels.get('912462766256844831'), 'Match', postMessage).id)
                        sendEmbed(channel, postMessage, 'Match').then(result => {
                            hostIdList.push(result.id);
                            hostIdList.push(currMap);
                            currentMatches[currentMatches.length-1].push(hostIdList);
                            currentQueue = [];
                            result.react('1️⃣').then(result2 => {
                                result.react('2️⃣')
                            });
                            
                        })
                    );*/
                    //hostIdList.push(currMessageId);
                    //console.log(hostIdList);
                    //console.log('h');
                    //console.log(':' + temp);
                }
            }
            else {
                sendEmbed(message.channel, 'Already in queue');
            }
        }
        else if (inputs[0] == 'l') {
            var currIndex = currentQueue.indexOf(message.author.id);
            if (currIndex > -1) {
                currentQueue.splice(currIndex, 1);
                sendEmbed(message.channel, userData[message.author.id].ign + ' has left the queue: ' + currentQueue.length + '/10');
            }
            else {
                sendEmbed(message.channel, 'Must be in queue to leave');
            }
        }
        else if (inputs[0] == 'lb' || inputs[0] == 'leaderboard') {
            let finalMsg = `#1${" \u200b".repeat(3)}${findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[0]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[0]].ign}: ${userData[Object.keys(userData)[0]].pp}\n`;
            //let lGap = (userData[Object.keys(userData)[0]].pp + '').length;
            //console.log()
            //console.log(lGap);
            //console.log((userData[Object.keys(userData)[1]].pp + '').length);
            for (var i = 1; i < 10; i++) {
                //console.log(findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[i]].rank).split(' ')[0])));
                //${((i < 9) ? ' ' : '')}
                //${userData[Object.keys(userData)[i]].pp}${" \u200b".repeat((lGap - (userData[Object.keys(userData)[i]].pp + '').length) + 1)}
                //let numSpaces = lGap - `${userData[Object.keys(userData)[i]].pp}`.length + 1;
                //console.log(numSpaces)
                finalMsg += `#${i+1}${((i < 9) ? " \u200b".repeat(2) : ' ')}${findEmoji(message.guild, capitalizeFirstLetter(rankToFull(userData[Object.keys(userData)[i]].rank).split(' ')[0]))} ${userData[Object.keys(userData)[i]].ign}: ${userData[Object.keys(userData)[i]].pp}\n`;
            }

            let rowList = [];

                rowList.push(new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId(`lb ${message.author.id} prev 0`)
                        .setLabel(`<< Prev page`)
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(`lb ${message.author.id} next 0`)
                        .setLabel(`>> Next page`)
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(`lb ${message.author.id} get ${message.author.id}`)
                        .setLabel(`My page`)
                        .setStyle('SUCCESS'),
                ));

            message.reply({embeds: [getEmbed(finalMsg, 'Leader Board')], components: rowList});
        }
        else if (inputs[0] == 'help') {
            if (!inputs[1]) {
                var msgsend = 'For more detailed information on any commands type\n```-help command name```\n';
                for (var i = 0; i < Object.keys(commandData.command).length; i++) {
                    msgsend += `\n**${commandData.command[Object.keys(commandData.command)[i]].name}**\n ${commandData.command[Object.keys(commandData.command)[i]].description}\n__Examples:__ ${commandData.command[Object.keys(commandData.command)[i]].example}\n`;
                }
                sendEmbed(message.channel, msgsend, 'Commands');
            }
            else {
                for (var i = 0; i < Object.keys(commandData.command).length; i++) {
                    if (commandData.command[Object.keys(commandData.command)[i]].name == inputs[1]) {
                        var msgsend = ('\n' + commandData.command[Object.keys(commandData.command)[i]].description +  '\n\nSyntax: ' + commandData.command[Object.keys(commandData.command)[i]].syntax + '\n\nExample: ' + commandData.command[Object.keys(commandData.command)[i]].example);
                        sendEmbed(message.channel, msgsend, commandData.command[Object.keys(commandData.command)[i]].name);
                    }
                }
            }
        }
        else if ((message.author.id == 203206356402962432) || (message.author.id == '.')) {
            if (inputs[0] == 'save') {
                saveData();
                message.channel.send('Saved.');
            }
            else if (inputs[0] == 'ds') {
                console.log('Sending');
                saveData();
                message.channel.send({files: [{
                    attachment: `${userDataPath}`,
                    name: 'user_data.json'
                }]});
            }
            else if (inputs[0] == 'dl') {
                if (inputs[1]) {
                    //message.channel.send((await message.channel.messages.fetch(inputs[1])).attachments[0]);
                    saveData((await message.channel.messages.fetch(inputs[1])).attachments.first().url).then(() => {
                        loadData();
                    });
                    
                }
            }
            else if (inputs[0] == 'addRole') {
                var team1vcRole = findRole(message.guild, 'team1vc');
                (await message.guild.members.fetch(message.author.id)).roles.add(team1vcRole);
            }
            else if (inputs[0] == 'removeRole') {
                var team1vcRole = findRole(message.guild, 'team1vc');
                (await message.guild.members.fetch(message.author.id)).roles.remove(team1vcRole);
            }
            else if (inputs[0] == 'sort') {
                sortData();
                message.channel.send(`Sorted`);
            }
            else if (inputs[0] == 'load') {
                loadData();
                message.channel.send('Loaded from file.');
            }
            else if (inputs[0] == 'set') {
                if (inputs[1] == 'pp') {
                    //console.log(inputs[2]);
                    if (inputs[3]) {
                        //getIdFromMsg
                        console.log('Set ' + userData[getIdFromMsg(inputs[2])].ign + '\'s pp to ' + parseInt(inputs[3]));
                        message.channel.send('Set ' + userData[getIdFromMsg(inputs[2])].ign + '\'s pp to ' + parseInt(inputs[3]));
                        userData[getIdFromMsg(inputs[2])].pp = parseInt(inputs[3]);
                    }
                }
                else if (inputs[1] == 'hp') {
                    if (inputs[3]) {
                        //getIdFromMsg
                        console.log('Set ' + userData[getIdFromMsg(inputs[2])].ign + '\'s hp to ' + parseInt(inputs[3]));
                        message.channel.send('Set ' + userData[getIdFromMsg(inputs[2])].ign + '\'s hp to ' + parseInt(inputs[3]));
                        userData[getIdFromMsg(inputs[2])].hp = parseInt(inputs[3]);
                    }
                }
                saveData();
            }
            else if (inputs[0] == 'add') {
                if (inputs[1] == 'pp') {
                    //console.log(inputs[2]);
                    if (inputs[3]) {
                        //getIdFromMsg
                        console.log('Added ' + parseInt(inputs[3]) + ' to '  + userData[getIdFromMsg(inputs[2])].ign + '\'s points');
                        message.channel.send('Added ' + parseInt(inputs[3]) + ' to '  + userData[getIdFromMsg(inputs[2])].ign + '\'s points');
                        userData[getIdFromMsg(inputs[2])].pp += parseInt(inputs[3]);
                    }
                }
                saveData();
            }
            else if (inputs[0] == 'sub') {
                if (inputs[1] == 'pp') {
                    //console.log(inputs[2]);
                    if (inputs[3]) {
                        //getIdFromMsg
                        console.log('Subtracted ' + parseInt(inputs[3]) + ' pps from '  + userData[getIdFromMsg(inputs[2])].ign);
                        message.channel.send('Subtracted ' + parseInt(inputs[3]) + ' pps from '  + userData[getIdFromMsg(inputs[2])].ign);
                        userData[getIdFromMsg(inputs[2])].pp -= parseInt(inputs[3]);
                    }
                }
                saveData()
            }
            else if (inputs[0] == 'trn') {
                if (inputs[1] == 'pp') {
                    if (inputs[4]) {
                        //$trn(0) pp(1) id1(2) id2(3) 50(4)
                        console.log('transferred ' + parseInt(inputs[4]) + ' pps from '  + userData[getIdFromMsg(inputs[2])].ign + ' to ' + userData[getIdFromMsg(inputs[3])].ign);
                        message.channel.send('transferred ' + parseInt(inputs[4]) + ' pps from '  + userData[getIdFromMsg(inputs[2])].ign + ' to ' + userData[getIdFromMsg(inputs[3])].ign);
                        userData[getIdFromMsg(inputs[2])].pp -= parseInt(inputs[4]);
                        userData[getIdFromMsg(inputs[3])].pp += parseInt(inputs[4]);
                        saveData();
                    }
                }
            }
            else if (inputs[0] == 'rrank') {
                userData[getIdFromMsg(inputs[1])].rank = inputs[2];
                message.channel.send(`Set ${userData[getIdFromMsg(inputs[1])].ign}\'s rank to ${rankToFull(userData[getIdFromMsg(inputs[1])].rank)}`);
                saveData();
            }
            else if (inputs[0] == 'iign') {
                let original = userData[getIdFromMsg(inputs[1])].ign;
                userData[getIdFromMsg(inputs[1])].ign = inputs[2];
                message.channel.send(`Set ${original} to ${userData[getIdFromMsg(inputs[1])].ign}`);
                saveData();
            }
            else if (inputs[0] == 'em') {
                //<:${temp.name}:${temp.id}>
                message.channel.send(`${findEmoji(message.guild, inputs[1])}`);
            }
            else if (inputs[0] == 'test') {
                message.channel.send(`h${' '} h`);
            }
            else if (inputs[0] == 'qrm') {
                if (currentQueue.indexOf(getIdFromMsg(inputs[1])) == -1) {
                    message.channel.send('User not in queue');
                }
                currentQueue.splice(currentQueue.indexOf(getIdFromMsg(inputs[1])), 1);
                message.channel.send(`Removed ${userData[getIdFromMsg(inputs[1])].ign} from queue`);
            }
            else if (inputs[0] == 'hhelp') {
                var msgsend = '';
                msgsend = msgsend + 'Admin Commands: ';
                for (var i = 0; i < Object.keys(commandData.adminCommand).length; i++) {
                    msgsend = msgsend + '\n    ' + commandData.adminCommand[Object.keys(commandData.adminCommand)[i]].name + ': ' + commandData.adminCommand[Object.keys(commandData.adminCommand)[i]].syntax;
                }
                message.channel.send('```' + msgsend + '```');
            }
        }
        console.log(userData[message.author.id]);
    }
    catch (e) {
        console.error("\x1b[31m", e, "\x1b[0m");
    }
});