module.exports = {
	insertDataPointValue: function(grid, x, y, prop, value) {
		var dataPoint = grid.getDataPoint(x, y);

		if( dataPoint ) {
			dataPoint[prop] = value;
		}
	},
	loadMapType: function(mapGrid, x, y, type) {
		var dataPoint = mapGrid.getDataPoint(x, y);

		dataPoint.type = type;

		mapGrid.setPoint(x, y, dataPoint);
	},
	loadMapSubType: function(mapGrid, x, y, subtype) {
		var dataPoint = mapGrid.getDataPoint(x, y);

		dataPoint.subtype = subtype;

		mapGrid.setDataPoint(x, y, dataPoint);
	},
	loadMapDistrict: function(mapGrid, x, y, district = 0) {
		var dataPoint = mapGrid.getDataPoint(x, y);

		dataPoint.district = district;

		mapGrid.setDataPoint(x, y, dataPoint);
	},
	setMapDataPointAsSolid: function(mapGrid, x, y) {
		var dataPoint = mapGrid.getDataPoint(x, y);

		dataPoint.solid = true;

		mapGrid.setDataPoint(x, y, dataPoint);
	},
	loadMapActorData: function(mapGrid, x, y, name, type, meta = {}, offset = {x: 0, y: 0}, yVirtual) {
		var dataPoint	= mapGrid.getDataPoint(x, y);
		var metaPoint	= (meta) ? meta : mapGrid.getMetaPoint(x, y);
		var xPosition	= x * Constants.TERRAIN_TILE_SIZE + (Constants.TERRAIN_TILE_SIZE * 0.5) + offset.x;
		var yPosition	= y * Constants.TERRAIN_TILE_SIZE + (Constants.TERRAIN_TILE_SIZE * 0.5) + offset.y;
		var dataBin, solidityCheck, typeAbbrev;

		if( !mapGrid.normalize(x, y) ) {
			return;
		}

		var loadable = {
			x:		xPosition,
			y:		yPosition,
			name:	name,
			type:	typeAbbrev,
		};

		switch(type) {
			case 'actor': // Enemies, NPCs
				dataBin = 'c';
				solidityCheck = true;
				typeAbbrev = 'ac';
				break;
			case 'doodad': // Non-solid tilesets
				dataBin = 'd';
				if( metaPoint.rotations != undefined ) {
					loadable.r = metaPoint.rotations;
				}
				if( metaPoint.type != undefined ) {
					loadable.t = metaPoint.type;
				}
				if( (metaPoint.type != undefined) && (metaPoint.rotations != undefined) ) {
					if( name == 'building-shadow' ) {
						loadable.v = 0;
					} else {
						loadable.v = Utilities.getRandomTilesetVariation(Tilesets[name], metaPoint.type, metaPoint.rotations);
					}
				}
				if( yVirtual ) {
					loadable.yv = yVirtual;
				}

				typeAbbrev = 'do';
				break;
			case 'obstacle': // Any solid, freestanding, immovable object
				dataBin = 'o';
				solidityCheck = true;
				typeAbbrev = 'ob';
				break;
			case 'terrain': // Invisible filler shapes
				dataBin = 't';
				name = 'filler';
				loadable.r = 0;
				loadable.t = 'inside';
				loadable.v = 0;
				solidityCheck = true;
				typeAbbrev = 'te';
				break;
			case 'troupe': // Enemies, NPCs
				dataBin = 'c';
				solidityCheck = true;
				typeAbbrev = 'tp';
				break;
			case 'weather':
				dataBin = 'c';
				typeAbbrev = 'wt';
				break;
			default:
				return;
				break;
		}

		if( solidityCheck ) {
			if( dataPoint.solid ) {
				return;
			}

			dataPoint.solid = true;
		}

		loadable.type = typeAbbrev;

		dataPoint.actorData[dataBin].push(loadable);

		mapGrid.setDataPoint(x, y, dataPoint);
	},
};
