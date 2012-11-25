var fs = require("fs");
var Canvas = require("canvas");

const THRESHOLD = 218;
const BOARD_OFFSET = { x: 1, y: 176 };
const CELL_WIDTH = 51;
const SCORE_RADIUS = 12;
const BOARD_WIDTH = CELL_WIDTH * 15;

function expandBoundingBox(box, point) {
	if(point.x < box.topX) { box.topX = point.x; }
	if(point.y < box.topY) { box.topY = point.y; }

	if(point.x > box.bottomX) { box.bottomX = point.x; }
	if(point.y > box.bottomY) { box.bottomY = point.y; }

	return box;
}

function printSnip(snip) {
	var out = [];
	for(var r = 0, i = 0; r < 41; r++) {
		var tmp = [];
		for(var c = 0; c < 41; c++) {
			tmp.push(snip[i++] ? "#" : " ");
		}
		out.push(tmp.join(""));
	}

	console.log(out.join("\n"));
}


fs.readFile("./test-images/test2.png", function(err, data) {
	if(err) { throw err; }

	var img = new Canvas.Image();
	img.src = data;

	var canvas = new Canvas(img.width / 2, img.height / 2);
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, img.width / 2, img.height / 2);

	var pixels = ctx.getImageData(BOARD_OFFSET.x, BOARD_OFFSET.y, BOARD_WIDTH, BOARD_WIDTH);
	var scoreBox = { topX: Infinity, topY: Infinity, bottomX: 0, bottomY: 0 };
	for(var i = 0; i < pixels.data.length; i += 4) {
		var red = pixels.data[i + 0], green = pixels.data[i + 1], blue = pixels.data[i + 2];
		if(red > 120 && green < 40 && blue < 30) { // Get rid of score indicator
			pixels.data[i + 0] = 0;
			pixels.data[i + 1] = 0;
			pixels.data[i + 2] = 0;

			scoreBox = expandBoundingBox(scoreBox, { x: (i / 4) % BOARD_WIDTH, y: (i / 4 / BOARD_WIDTH) >> 0 });
		} else if(
			red < 190 ||
			green > red ||
			blue > red ||
			(red > blue + 10 && Math.abs(blue - green) < 20) || // Remove light red from double word label
			(red > 100 && Math.abs(red - blue)  < 5 && Math.abs(blue - green) < 5) // Remove greys
		) {
			pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
		}

		red = pixels.data[i + 0]; green = pixels.data[i + 1]; blue = pixels.data[i + 2];
		var isOn = THRESHOLD < (red * 0.3 + green * 0.59 + blue * 0.11);

		pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = (isOn ? 255 : 0);
	}
	scoreBox.topX += BOARD_OFFSET.x;
	scoreBox.bottomX += BOARD_OFFSET.x;
	scoreBox.topY += BOARD_OFFSET.y;
	scoreBox.bottomY += BOARD_OFFSET.y;

	ctx.putImageData(pixels, BOARD_OFFSET.x, BOARD_OFFSET.y);

	ctx.fillStyle = "#000";
	ctx.arc(scoreBox.topX + SCORE_RADIUS - 2, scoreBox.topY + SCORE_RADIUS - 2, SCORE_RADIUS, 0, Math.PI * 2);
	ctx.fill();

	ctx.strokeStyle = "#F00";
	ctx.strokeRect(scoreBox.topX, scoreBox.topY, scoreBox.bottomX - scoreBox.topX, scoreBox.bottomY - scoreBox.topY);

	ctx.strokeStyle = "#F0F";
	ctx.strokeRect(BOARD_OFFSET.x, BOARD_OFFSET.y, BOARD_WIDTH, BOARD_WIDTH);

	var snips = [];
	for(var r = 0, pixR = 0; r < 15; r++, pixR += CELL_WIDTH) {
		for(var c = 0, pixC = 0; c < 15; c++, pixC += CELL_WIDTH) {
			ctx.strokeStyle = "#F0F";
			ctx.strokeRect(pixR + BOARD_OFFSET.x, pixC + BOARD_OFFSET.y, CELL_WIDTH, CELL_WIDTH);
			ctx.strokeStyle = "#0F0";
			ctx.strokeRect(pixR + BOARD_OFFSET.x + 5, pixC + BOARD_OFFSET.y + 5, 41, 41);

			var snip = [];
			var snipData = ctx.getImageData(pixR + BOARD_OFFSET.x + 5, pixC + BOARD_OFFSET.y + 5, 41, 41).data;

			for(var d = 0; d < snipData.length; d += 4) {
				snip.push(snipData[d] === 255);
			}
			snips.push(snip);
		}
	}

	snips.forEach(printSnip);

	canvas.toBuffer(function(err, buf) {
		if(err) { throw err; }
		fs.writeFile("./result2.png", buf);
	});
});