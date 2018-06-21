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
};
