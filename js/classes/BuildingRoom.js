var BuildingRoom = function(width, height, basePoint = {x: 0, y: 0}, rank, building) {
     var _self = this;

     this.width	= width;
     this.height	= height;
     this.basePoint	= {x: basePoint.x, y: basePoint.y};
     this.building	= building;
     this.rank		= rank; // 1 or 2 for parent/child

	if( this.width < 5 ) {
		this.width = 5;
	}
	if( this.height < 5 ) {
		this.height = 5;
	}

     // possibly partition once/twice if large enough
};

module.exports = BuildingRoom;
