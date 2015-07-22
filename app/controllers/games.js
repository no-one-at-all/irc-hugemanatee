// import modules
var _ = require('underscore'),
    Game = require('./game'),
    Player = require('../models/player'),
    config = require('../../config/config'),
	db = require( '../models/db' );

var Games = function Games() {
    var self = this;
    self.games = [];

    /**
     * Find a game by channel it is running on
     * @param channel
     * @returns {*}
     */
    self.findGame = function (channel) {
        return _.findWhere(self.games, {channel: channel});
    };

    /**
     * Start a game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.start = function (client, message, cmdArgs) {
        // check if game running on the channel
        var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host;

        if (typeof self.findGame(channel) !== 'undefined') {
            // game exists
            client.say(channel, 'A game is already running. Type !join to join the game.');
        } else {
            // init game
            var game = new Game(channel, client, config, cmdArgs, db);
            self.games.push(game);
            var player = new Player(nick, user, hostname);
            game.addPlayer(player);
        }
    };

    /**
     * Return a list of top player stats. This is a per-channel value, and now that I fixed it
	 * for per-channel stats, I can't think of a way to get globals.
     * @param client
     * @param message
     * @param cmdArgs
     */
	self.hof = function(client, message, cmdArgs) {
		var channel = message.args[0],
			user = message.user,
			game = self.findGame(channel);
		db.hof(channel, function(wins, points) {
			var leaderboard,
				mapWins = function( item ) { return item.nick + ' (' + item.wins + ')' },
				mapPoints = function( item ) { return item.nick + ' (' + item.points + ')' };
			leaderboard = wins.length ? 'Wins leaderboard - ' + wins.map( mapWins ).join( '; ' ) + '.'
				: 'No winner stats available for this channel.';
			leaderboard += points.length ? ' Points leaderboard - ' + points.map( mapPoints ).join('; ') + '. '
				: ' No points stats available for this channel.';
			client.say(channel, leaderboard);
		});
	}

    /**
     * Stop a game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.stop = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
			console.log( 'game.owner = ' + game.owner )
            if (typeof(player) !== 'undefined' && (player == game.owner || !game.owner)) {
                game.stop(player);
                self.games = _.without(self.games, game);
            }
        }
    };

    /**
     * Pause a game
     * @param client
     * @param message
     * @param cmdArgs
     */
     self.pause = function(client, message, cmdArgs) {
         var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.pause();
            }
        }
     };

    /**
     * Resume a game
     * @param client
     * @param message
     * @param cmdArgs
     */
     self.resume = function(client, message, cmdArgs) {
         var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.resume();
            }
        }
     };

    /**
     * Add player to game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.join = function (client, message, cmdArgs) {
        var channel = message.args[0],
            nick = message.nick,
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);

        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = new Player(nick, user, hostname);
            game.addPlayer(player);
        }
    };

    /**
     * Remove player from game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.quit = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            game.removePlayer(game.getPlayer({user: user, hostname: hostname}));
        }
    };

    /**
     * Kick player from game. Only game owner can do it.
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.kick = function (client, message, cmdArgs) {
        var target, requestor,
			channel = message.args[0],
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            target = game.getPlayer({nick:cmdArgs[0]});
			requestor = game.getPlayer({nick:message.nick});
			if (requestor == game.owner)
				game.removePlayer(target);
        }
    };

    /**
     * Get players cards
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.cards = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            game.showCards(player);
        }
    };

    /**
     * Play cards
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.play = function (client, message, cmdArgs) {
        // check if everyone has played and end the round
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.playCard(cmdArgs, player);
            }
        }
    };

    /**
     * Lisst players in the game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.list = function (client, message, cmdArgs) {
        var channel = message.args[0],
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            game.listPlayers();
        }
    };

    /**
     * Select the winner
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.winner = function (client, message, cmdArgs) {
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});
            if (typeof(player) !== 'undefined') {
                game.selectWinner(cmdArgs[0], player);
            }
        }
    };

    /**
     * Show top players in current game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.points = function (client, message, cmdArgs) {
        var channel = message.args[0],
            hostname = message.host,
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            game.showPoints();
        }
    };

    /**
     * Show top players in current game
     * @param client
     * @param message
     * @param cmdArgs
     */
    self.status = function(client, message, cmdArgs) {
        var channel = message.args[0],
            game = self.findGame(channel);
        if (typeof game === 'undefined') {
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            game.showStatus();
        }
    };

    self.pick = function (client, message, cmdArgs)
    {
        // check if everyone has played and end the round
        var channel = message.args[0],
            user = message.user,
            hostname = message.host,
            game = self.findGame(channel);

        if (typeof game === 'undefined'){
            client.say(channel, 'No game running. Start the game by typing !start.');
        } else {
            var player = game.getPlayer({user: user, hostname: hostname});

            if (typeof(player) !== 'undefined') {
                if (game.state === Game.STATES.PLAYED) {
                    game.selectWinner(cmdArgs[0], player);
                } else if (game.state === Game.STATES.PLAYABLE) {
                    game.playCard(cmdArgs, player);
                } else {
                    client.say(channel, '!pick command not available in current state.');
                }
            }
        }
    };
};

exports = module.exports = Games;
