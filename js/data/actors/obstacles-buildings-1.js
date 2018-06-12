module.exports = function(group) {
     for(let i = 1; i < 5; i++) {
          group[`placeholder-shanty-${i}`] = {
               actor:		{
                    inert:			true,
                    indestructible:	true,
                    type:			'groundcover',
               },
               body:		{
                    parts:	{
                         structures:	[
                              {
                                   shape:	'rectangle',
                                   name:	'building-solid',
                                   width:	72,
                                   height:	72,
                                   y:        36,
                                   types:	[],
                                   options:	{},
                              },
                         ],
                         sensors:		[],
                         ornaments:	[
                              {
                                   shape:	'rectangle',
                                   name:	'building-visual',
                                   width:	72,
                                   height:	144,
                                   types:	[],
                                   sprite:	`building-placeholder-shanty-${i}`,
                                   options:	{},
                              },
                         ],
                    },
                    options:	{
                         isStatic:		true,
                    },
                    zindex:	'doodad-fg-2',
                    custom:	{noActor: true},
               }
          };
     }

     return group;
};
