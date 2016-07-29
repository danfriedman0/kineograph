/**
 * Scripts
 */


$(document).ready(function() {

	initializeCanvas();

});

function initializeCanvas() {

	var down = false;
	var cachedStates = [];
	var color = "black";

	var $canvas = $('#canvas');
	var offset = $canvas.offset();
	var canvas = $canvas[0];

	var ctx = canvas.getContext('2d');
	ctx.strokeStyle = color;

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

	$('.color').on('click', function() {
		ctx.strokeStyle = $(this).css('background-color');
	});

	function undo() {
		console.log('undo');
		var state = cachedStates.pop();

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.putImageData(state, 0, 0);
	}

	$(document).on('keydown', function(e) {
		if (e.which === 90 && e.metaKey && cachedStates.length) {
			undo();
		}

	});




}