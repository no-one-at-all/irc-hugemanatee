var db,
	sqlite3 = require( 'sqlite3' ).verbose(),
	fs = require( 'fs' ),
	file = './scores.db',
	exists = fs.existsSync(file);

if( !exists ) {
	console.log( 'Creating score database file.' );
	fs.openSync( file, 'w' );
}

db = new sqlite3.Database( file );

db.serialize( function() {
	if( !exists ) {
		db.run( 'CREATE TABLE stats ( channel TEXT, nick TEXT, hostname TEXT, points INT, wins INT )' );
	}
});

module.exports = {

	hof: function( channel, callback ) {
		var query = [ 'SELECT nick, ', ' FROM stats WHERE channel = ? ORDER BY ', ' DESC LIMIT 10' ],
			selectWins = query.join( 'wins' ),
			selectPoints = query.join( 'points' );
		// should have error handlers!
		db.all( selectWins, [ channel ], function( err, wins ) {
			db.all( selectPoints, [ channel ], function( err, points ) {
				if ( callback instanceof Function )
					callback( wins, points );
			});
		});
	},

	updateStats: function( channel, player, won ) {
		var wincrement, wins, update, insert;

		if ( isNaN( player.points ) ) {
			console.warn( 'Error updating points for ' + player.nick + ' in channel '
				+ channel + ': ' + player.points + ' is not a number' );
			return;
		}

		wincrement = won ? 'wins = wins + 1, ' : '';
		wins = won ? 1 : 0;
		update = 'UPDATE stats SET ' + wincrement + 'points = points + ? WHERE nick = ? AND channel = ?';
		insert = 'INSERT INTO stats ( channel, nick, hostname, points, wins ) VALUES ( ?, ?, ?, ?, ? )';

		db.run( update, [ player.points, player.nick, channel ], function( err ) {
			if ( err ) {
				console.warn( 'There was an error updating the stats for '
					+ player.nick + ' -> ' + player.hostname + ' in ' + channel );
				return;
			}

			if ( this.changes == 0 )
				// probably should have an error handler here, but 'eh'.
				db.run( insert, [ channel, player.nick, player.hostname, player.points, wins ] );
		});
	},

	close: function() {
		db.close();
	}
}
