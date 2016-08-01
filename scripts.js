/**
 * Scripts
 */


$(document).ready(function() {

	initializeCanvas();

});

function initializeCanvas() {

	// initialize
	var down = false;
	var cachedStates = [];

	if ($('#onion-skin')[0].checked)
		var useOnionSkin = true;
	else
		var useOnionSkin = false;

	// brushes
	var color = "black";
	var brushNo = 0;
	var brushes = [
		[1, 'url(images/brushes/4.png) 2 2, pointer'],
		[2, 'url(images/brushes/8.png) 4 4, pointer'],
		[3, 'url(images/brushes/12.png) 6 6, pointer'],
		[4, 'url(images/brushes/16.png) 8 8, pointer'],
		[6, 'url(images/brushes/24.png) 12 12, pointer'],
		[8, 'url(images/brushes/32.png) 16 16, pointer'],
		[12, 'url(images/brushes/48.png) 24 24, pointer'],
		[16, 'url(images/brushes/64.png) 32 32, pointer'],
		[24, 'url(images/brushes/96.png) 48 48, pointer']
	];

	// get canvas
	var $canvas = $('#canvas');
	var offset = $canvas.offset();
	var canvas = $canvas[0];

	// get background
	var background = $('#background')[0];
	var bgctx = background.getContext('2d');
	bgctx.fillStyle = "rgba(255, 255, 255, .5)";

	// brush settings
	var ctx = canvas.getContext('2d');

	// settings
	ctx.strokeStyle = color;
	ctx.lineWidth = brushes[brushNo][0];
	ctx.lineCap = 'round';

	// get current cel canvas
	var timeline = [[]];

	var celIndex = 0;
	var layerIndex = 0;
	var currentLayer = timeline[layerIndex];

	// save first cel
	currentLayer.push(ctx.getImageData(0, 0, canvas.width, canvas.height));


	/* Drawing */

	$canvas.on('click', function(e) {
		if (!down) {
			down = true;
			var x = e.pageX - offset.left;
			var y = e.pageY - offset.top;
			ctx.beginPath();
			ctx.moveTo(x, y);
		}

		var state = ctx.getImageData(0, 0, canvas.width, canvas.height);
		cachedStates.push(state);
	});

	$canvas.on('mousemove', function(e) {
		if (down) {
			var x = e.pageX - offset.left;
			var y = e.pageY - offset.top;
			ctx.lineTo(x, y);
			ctx.stroke();
		}
	});

	$canvas.on('dblclick', function() {
		cachedStates.splice(-2, 2);
		ctx.stroke();
		down = false;
	});

	/* Brush settings */

	$('.color').on('click', function() {
		ctx.strokeStyle = $(this).css('background-color');
	});

	$canvas.on('mousewheel DOMMouseScroll', function(e) {
		if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0)
			changeBrushSize(1);
		else
			changeBrushSize(-1);
	});

	function changeBrushSize(n) {
		if (brushNo + n >= 0 && brushNo + n <= brushes.length - 1) {
			brushNo += n;
			var brush = brushes[brushNo];

			ctx.lineWidth = brush[0];

			$canvas.css('cursor', brush[1]);
		}
	}

	/* Keyboard shortcuts */

	$(document).on('keydown', function(e) {

		if (e.metaKey) {
			// ctrl + z
			if (e.which === 90 && cachedStates.length) {
				ctx.stroke();
				down = false;
				undo();				
			}

			// ctrl + x
			else if (e.which === 88) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);		
			}
		}

		// ctrl + x (88)
		// ctrl + c (67)
		// ctrl + v (86)

		
		// left arrow
		if (e.which === 37 && celIndex > 0)
			switchCels(celIndex - 1, layerIndex);
		// right arrow
		if (e.which === 39 && celIndex < currentLayer.length - 1)
			switchCels(celIndex + 1, layerIndex);
	});

	/* Undo */

	$('#clear-canvas').on('click', function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	});

	function undo() {
		if (cachedStates) {
			var state = cachedStates.pop();

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.putImageData(state, 0, 0);
		}
	}

	/* Adding and changing cels */

	$('.add-cel').on('click', function() {
		// add new cel to DOM
		var newCel = '<div class="cel"></div>'
		$(this).before(newCel);

		// switch cels
		var layer = $(this).closest('.layer').index();
		switchCels(currentLayer.length, layer);
	});

	$(document).on('click', '.cel', function() {
		var index = $(this).index();
		var layer = $(this).closest('.layer').index();
		if (index != celIndex || layer != currentLayer)
			switchCels(index, layer);
	});

	function switchCels(index, layer) {
		// save current cel
		currentLayer[celIndex] = ctx.getImageData(0, 0, canvas.width, canvas.height);

		// clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// clear cached states
		cachedStates = [];

		celIndex = index;
		layerIndex = layer;
		currentLayer = timeline[layerIndex];

		// Create new cel or load existing cel
		if (celIndex > currentLayer.length - 1) {
			currentLayer.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
		}
		else {
			var imageData = currentLayer[celIndex];
			ctx.putImageData(imageData, 0, 0);			
		}

		onionSkin();

		// hilight new cel
		$('.cel').removeClass('active');
		$('.layer').eq(layer).find('.cel').eq(index).addClass('active');
	}

	$('#onion-skin').on('change', function() {
		if (this.checked) {
			$('#background').show();
			useOnionSkin = true;
			onionSkin();
		}
		else {
			$('#background').hide();
			useOnionSkin = false;
		}
	})

	function onionSkin() {
		if (useOnionSkin) {
			if (celIndex > 0) {
				bgctx.clearRect(0, 0, background.width, background.height);
				var imageData = currentLayer[celIndex - 1];
				bgctx.putImageData(imageData, 0, 0);
				bgctx.fillRect(0, 0, background.width, background.height);
			}
			else {
				bgctx.clearRect(0, 0, background.width, background.height);
			}			
		}
	}
}










