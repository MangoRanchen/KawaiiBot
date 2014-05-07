var mongoose = require('mongoose');
var autoIncrement = require('mongoose-auto-increment');

mongoose.connect('mongodb://localhost/nightbot');

var db = mongoose.connection;

autoIncrement.initialize(db);

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  	// yay!
  	console.log("mongoose loaded");
	bootstrap();
});


var config = 
{
	channels: ["#flux"],
	server: "irc.flux.cd",
	botName: "KawaiiBot"
}

var irc = require("irc");

var moduleList = ['access', 'quotes'];
// i should fix this

var bot = new irc.Client(config.server, config.botName,{
	channels: config.channels
});


var LoadedModules = {};

var LoadModule = function(moduleName)
{
	try
		{
			LoadedModules[moduleName] = require("./bot_modules/" + moduleName);
			LoadedModules[moduleName].init(CommandCenter);
			return true;
		}
		catch(err)
		{
			console.error(err);
			return false;
		}
}

var nukeHandler = function(irc, from, to, text, message)
{
	var commands = text.split(" ");
	if(commands.length <= 1)
	{
		irc.say(to, "You must specify something to obliterate.");
	}
}

var RegisteredCommands = {'.nuke': [nukeHandler]}


var CommandCenter = 
{
	getModule: function(moduleName)
	{
		if(moduleName in LoadedModules)
		{
			return LoadedModules[moduleName];
		}
		else
		{
			return null;
		}
	},
	registerCommand: function(command, callback)
	{
		RegisteredCommands[command] = callback;
	},
	unregisterCommand: function(command)
	{
		delete RegisteredCommands[command];
	},
	hookCommand: function(command, callback)
	{
		if(RegisteredCommands[command] instanceof Array)
			RegisteredCommands[command].push(callback)
		else if(RegisteredCommands[command] instanceof Function)
			RegisteredCommands[command] = [RegisteredCommands[command], callback];
		else
			this.registerCommand(command, callback);
	},
	unhookCommand: function(command, callback)
	{
		var idx = RegisteredCommands[command].indexOf(callback);
		RegisteredCommands[command].splice(idx, 1);
	}
}

for(var i = 0; i < moduleList.length; ++i)
{
	LoadModule(moduleList[i]);
}


var bootstrap = function()
{
	// entry point for everything essentially

	bot.addListener("message#", function(from, to, text, message)
	{
		var commands = text.split(" ");
		var handler = RegisteredCommands[commands[0]];
		if(handler != null)
		{
			if(handler instanceof Array)
			{
				for (var i = 0; i < handler.length; ++i) {
					var func = handler[i];
					func(bot, from, to, text, message);
				};
			}
			else if(handler instanceof Function)
			{
				handler(bot,from,to,text,message);
			}
		}
	});

	bot.addListener('error', function(message) {
    	console.log('error: ', message);
	});
}