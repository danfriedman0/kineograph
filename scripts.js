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

	// brush settings
	var ctx = canvas.getContext('2d');
	ctx.strokeStyle = color;
	ctx.lineWidth = brushes[brushNo][0];
	ctx.lineCap = 'round';

	// get current cel canvas
	var savedCels = [];
	var celIndex = 0;
	var currentCel = $('.cel')[celIndex];
	var currentCelCtx = currentCel.getContext('2d');

	// save first cel
	savedCels.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

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
		currentCelCtx.drawImage(canvas, 0, 0, 124, 72);
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
				currentCelCtx.clearRect(0, 0, currentCel.width, currentCel.height);				
			}
		}

		// ctrl + x (88)
		// ctrl + c (67)
		// ctrl + v (86)

		
		// left arrow
		if (e.which === 37 && celIndex > 0)
			switchCels(celIndex - 1);
		// right arrow
		if (e.which === 39 && celIndex < savedCels.length - 1)
			switchCels(celIndex + 1);
	});

	/* Undo */

	$('#clear-canvas').on('click', function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		currentCelCtx.clearRect(0, 0, currentCel.width, currentCel.height);
	});

	function undo() {
		var state = cachedStates.pop();

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.putImageData(state, 0, 0);
		currentCelCtx.clearRect(0, 0, currentCel.width, currentCel.height);
		currentCelCtx.drawImage(canvas, 0, 0, 124, 72);
	}

	/* Adding and changing cels */

	$('#add-cel').on('click', function() {
		// add new cel to DOM
		var celWrapper = $(currentCel).closest('.cel-wrapper');
		var newCel = celWrapper.clone(true, true);
		$(this).closest('.add-cel-wrapper').before(newCel);

		switchCels(savedCels.length);
	});

	$('.cel-wrapper').on('click', function() {
		var index = $(this).index();
		if (index != celIndex)
			switchCels(index);
	});

	function switchCels(index) {
		// save canvas
		savedCels[celIndex] = ctx.getImageData(0, 0, canvas.width, canvas.height);
		
		// clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// move to target cel
		$(currentCel).closest('.cel-wrapper').removeClass('active');
		var newCelWrapper = $('.cel-wrapper').eq(index).addClass('active');

		currentCel = newCelWrapper.find('.cel')[0];
		currentCelCtx = currentCel.getContext('2d');
		celIndex = index;

		// save cell if this is a new cell
		if (celIndex > savedCels.length - 1) {
			savedCels.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
		}
		else {
			var imageData = savedCels[celIndex];
			ctx.putImageData(imageData, 0, 0);			
		}
	}

}











