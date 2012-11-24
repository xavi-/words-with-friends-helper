var fs = require("fs");
var Canvas = require("canvas");

const THRESHOLD = 218;
const BOARD_OFFSET = { x: 1, y: 176 };
const CELL_WIDTH = 51;

fs.readFile("./test-images/test2.png", function(err, data){
	if(err) { throw err; }

	var img = new Canvas.Image();
	img.src = data;

	var canvas = new Canvas(img.width / 2, img.height / 2);
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, img.width / 2, img.height / 2);

	var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
	for(var i = 0; i < pixels.data.length; i += 4) {
		var red = pixels.data[i + 0], green = pixels.data[i + 1], blue = pixels.data[i + 2];
		if(red > 150 && green < 10) { // Get rid of score indicator
			pixels.data[i + 0] = 0;
			pixels.data[i + 1] = 0;
			pixels.data[i + 2] = 0;
		} else if(
			red < 190 ||
			green > red ||
			blue > red ||
			(red / 2 > blue && red / 2 > green) ||
			(red > 100 && red - blue  < 5 && blue - green < 5)
		) {
			pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
		}

		red = pixels.data[i + 0]; green = pixels.data[i + 1]; blue = pixels.data[i + 2];
		var isOn = THRESHOLD < (red * 0.3 + green * 0.59 + blue * 0.11);

		pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = (isOn ? 255 : 0);
	}
	ctx.putImageData(pixels, 0, 0);

	ctx.strokeStyle = "#F0F";
	ctx.strokeRect(BOARD_OFFSET.x, BOARD_OFFSET.y, 765, 765);

	for(var r = 0, pixR = 0; r < 15; r++, pixR += CELL_WIDTH) {
		for(var c = 0, pixC = 0; c < 15; c++, pixC += CELL_WIDTH) {
			ctx.strokeStyle = "#F0F";
			ctx.strokeRect(pixR + BOARD_OFFSET.x, pixC + BOARD_OFFSET.y, CELL_WIDTH, CELL_WIDTH);
			ctx.strokeStyle = "#0F0";
			ctx.strokeRect(pixR + BOARD_OFFSET.x + 5, pixC + BOARD_OFFSET.y + 5, 41, 41);
		}
	}

	canvas.toBuffer(function(err, buf) {
		if(err) { throw err; }
		fs.writeFile("./result2.png", buf);
	});
});