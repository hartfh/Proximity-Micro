var fs = require('fs');
var Tilesets = require('../data/tilesets');
var Building = require('./Building');

module.exports = new function() {
	let _self = this;

	/* NOTES:
	-Vertical and horizontal multi-part signs
	*/

	this.createShell = function() {

	};

	this.populateShell = function() {

	};

	function _getDataPointExemplar(x, y) {
		return {
			actorData:	{
				'x':		x,	// area X coordinate
				'y':		y,	// area Y coordinate
				't':		[],	// terrain
				'c':		[],	// characters
				'd':		[],	// doodads
				'o':		[],	// obstacles
			},
			density:		'low',
			district:		0,
			solid:		false,
			subtype:		false,
			temp:		false,
			truss:		false,
			type:		false,
			zone:		false,
		};
	}

	function _setupActorData(grid) {
		// Stores data about actors, terrain and tile coordinates
		grid.eachDataPoint(function(dataPoint, x, y) {
			if( !dataPoint ) {
				dataPoint = _getDataPointExemplar(x, y);
			}

			grid.setDataPoint(x, y, dataPoint);
		});

		return grid;
	}

	// Copies actor data from a property of a data point into the primary point value
	function _finalizeActorData(grid) {
		grid.eachDataPoint(function(data, x, y) {
			// Setup finalized data to be loaded into the saved map grid
			var finalized = {
				x:		x,
				y:		y,
				t:		data.actorData.t,
				c:		data.actorData.c,
				d:		data.actorData.d,
				o:		data.actorData.o,
				dist:	data.district,
				type:	data.type,
				subtype:	data.subtype,
			};

			grid.setPoint(x, y, finalized);
			grid.setDataPoint(x, y, null);
			grid.setMetaPoint(x, y, null);
		});

		return grid;
	}
};
