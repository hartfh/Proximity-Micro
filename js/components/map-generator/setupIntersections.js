module.exports = function(intersectionGrid, config = {}) {
	let widthTable = {
		x:	[],
		y:	[],
	};
	let gridDimensions = intersectionGrid.getDimensions();

	for(let i = 0; i < gridDimensions.height; i++) {
		let width		= 2;
		let randVal	= Math.random();

		if( randVal > 0.33 ) {
			width = 1;

			if( randVal > 0.66 ) {
				width = 3;
			}
		}

		// TEMP:
		width = 3;

		widthTable.x.push(width);
	}

	for(let i = 0; i < gridDimensions.width; i++) {
		let width		= 2;
		let randVal	= Math.random();

		if( randVal > 0.33 ) {
			width = 1;

			if( randVal > 0.66 ) {
				width = 3;
			}
		}

		// TEMP:
		width = 3;

		widthTable.y.push(width);
	}

	intersectionGrid.eachPoint(function(point, x, y, self) {
		const CHANCE_TO_OFFSET	= config.chanceOffset || 0.85;
		const CHANCE_TO_DELETE	= config.chanceDelete || 0.2;
		const CHANCE_TO_BEND	= config.chanceBend || 0.87;
		const EDGE_DELETE_CHANCE	= 0.5;
		const WIDE_DELETE_CHANCE	= 0.08;
		const MODIFIER_RANGE	= config.range || 0.4;
		const ZONE_CHANCE		= 0.25;
		const ZONES			= ['blockade'];
		const OFFSET_RANGE		= 0.4;

		let xModifier	= 0;
		let yModifier	= 0;
		let xOffset	= 0;
		let yOffset	= 0;
		let xZone		= false;
		let yZone		= false;

		if( Math.random() < CHANCE_TO_OFFSET ) {
			xModifier	= Math.random() * MODIFIER_RANGE;
			xModifier	= ( Math.random() > OFFSET_RANGE && x > 0 ) ? -xModifier : xModifier;
			xOffset	= Math.round(Constants.MAP_BLOCK_SIZE * xModifier);
		}
		if( Math.random() < CHANCE_TO_OFFSET ) {
			yModifier	= Math.random() * MODIFIER_RANGE;
			yModifier	= ( Math.random() > OFFSET_RANGE && y > 0 ) ? -yModifier : yModifier;
			yOffset	= Math.round(Constants.MAP_BLOCK_SIZE * yModifier);
		}
		if( config.zones !== false ) {
			if( Math.random() < ZONE_CHANCE ) {
				xZone = ZONES.random();
			}
			if( Math.random() < ZONE_CHANCE ) {
				yZone = ZONES.random();
			}
		}

		var data = {
			offset:	{
				x:	xOffset,
				y:	yOffset,
			},
			base:	{
				x:	Constants.MAP_BLOCK_SIZE * x + xOffset,
				y:	Constants.MAP_BLOCK_SIZE * y + yOffset,
			},
			zone:	{
				x:	xZone,
				y:	yZone,
			},
			empty:	{
				x:	Math.random() < CHANCE_TO_DELETE,
				y:	Math.random() < CHANCE_TO_DELETE,
			},
			straight:	{
				x:	Math.random() > CHANCE_TO_BEND,
				y:	Math.random() > CHANCE_TO_BEND,
			},
			width:	{
				x:	widthTable.x[y],
				y:	widthTable.y[x],
			},
		};

		// Prevent points from missing both segments
		if( data.empty.x && data.empty.y ) {
			if( Math.random() > 0.5 ) {
				data.empty.x = false;
			} else {
				data.empty.y = false;
			}
		}

		if( data.empty.x && data.width.x > 2 ) {
			data.empty.x = ( Math.random() > WIDE_DELETE_CHANCE ) ? false : true;
		}
		if( data.empty.y && data.width.y > 2 ) {
			data.empty.y = ( Math.random() > WIDE_DELETE_CHANCE ) ? false : true;
		}

		if( data.empty.x ) {
			data.zone.x = false;
		}
		if( data.empty.y ) {
			data.zone.y = false;
		}

		self.setPoint(x, y, 1);
		self.setDataPoint(x, y, data);
	});
};
