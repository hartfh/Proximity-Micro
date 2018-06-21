module.exports = function(mapGrid) {
	let bldgData = {};

	mapGrid.eachDataPoint(function(dataPoint, x, y, self) {
		if( dataPoint.buildingID ) {
			const ID = dataPoint.buildingID;

			if( !bldgData[ID] ) {
				bldgData[ID] = {
					id:		ID,
					min:		{},
					max:		{},
					points:	[],
				};
			}
			let data = bldgData[ID];

			data.points.push({x: x, y: y});

			if( x < data.min.x || !data.min.x ) {
				data.min.x = x;
			}
			if( y < data.min.y || !data.min.y ) {
				data.min.y = y;
			}
			if( x > data.max.x || !data.max.x ) {
				data.max.x = x;
			}
			if( y > data.max.y || !data.max.y ) {
				data.max.y = y;
			}
		}
	});

	for(let i in bldgData) {
		let data = bldgData[i];

		data.width = (data.max.x - data.min.x) + 1;
		data.height = (data.max.y - data.min.y) + 1;
	}

	// TODO:
	// Number of points (i.e. area) determines type and/or whether or not to split building up.
	// Building district can factor in here.

	return bldgData;
};
