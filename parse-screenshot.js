var Canvas = require("canvas");
var _ = require("lodash");

var helpers = require("./helpers");

const THRESHOLD = 218;
const BOARD = { x: 1, y: 175, cell: 51, width: 51 * 15, height: 51 * 15 };
const TILES = { x: 147, y: 951, cell: 65, padding: 3, width: (65 + 3) * 7 - 3, height: 65 };
const SCORE_RADIUS = 12;

function expandBoundingBox(box, point) {
	if(point.x < box.topX) { box.topX = point.x; }
	if(point.y < box.topY) { box.topY = point.y; }

	if(point.x > box.bottomX) { box.bottomX = point.x; }
	if(point.y > box.bottomY) { box.bottomY = point.y; }

	return box;
}

function blurSnip(snip) { // Gets rid of 1xN lines
	for(var r = 0; r < 41; r++) {
		for(var c = 0; c < 41; c++) {
			var idx = r * 41 + c;
			if(!snip[idx]) { continue; }

			var idxRB = (r - 1) * 41 + c, idxRA = (r + 1) * 41 + c; // rows before and after
			var idxCB = r * 41 + (c - 1), idxCA = r * 41 + (c + 1); // columns before and after

			snip[idx] = (snip[idxRB] || snip[idxRA]) && (snip[idxCB] || snip[idxCA]);
		}
	}

	return snip;
}

function findWordScoreBox(pixels) {
	var scoreBox = { topX: Infinity, topY: Infinity, bottomX: 0, bottomY: 0 };

	for(var i = 0; i < pixels.data.length; i += 4) {
		var red = pixels.data[i + 0], green = pixels.data[i + 1], blue = pixels.data[i + 2];

		if(red > 150 && green < 20 && blue < 30) { // Score indicator hue
			scoreBox = expandBoundingBox(scoreBox, { x: (i / 4) % BOARD.width, y: (i / 4 / BOARD.height) >> 0 });
		}
	}

	return scoreBox;
}

function decolor(pixels) {
	for(var i = 0; i < pixels.data.length; i += 4) {
		var red = pixels.data[i + 0], green = pixels.data[i + 1], blue = pixels.data[i + 2];

		if(
			red < 170 ||
			green > red ||
			blue > red ||
			(red > blue + 10 && Math.abs(blue - green) < 20) || // Remove light red from double word label
			(red > 100 && Math.abs(red - blue)  < 5 && Math.abs(blue - green) < 5) // Remove greys
		) {
			pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
		} else {
			var isOn = THRESHOLD < (red * 0.3 + green * 0.59 + blue * 0.11);
			pixels.data[i + 0] = pixels.data[i + 1] = pixels.data[i + 2] = (isOn ? 255 : 0);
		}
	}

	return pixels;
}

function dataToSnip(pixels) {
	var data = pixels.data || pixels;
	var snip = [];

	for(var d = 0; d < data.length; d += 4) {
		snip.push(data[d] === 255);
	}

	return snip;
}

function getBoardSnips(ctxScreen) {
	var board = ctxScreen.getImageData(BOARD.x, BOARD.y, BOARD.width, BOARD.height);
	var scoreBox = findWordScoreBox(board);
	scoreBox.topX += BOARD.x;
	scoreBox.bottomX += BOARD.x;
	scoreBox.topY += BOARD.y;
	scoreBox.bottomY += BOARD.y;

	ctxScreen.putImageData(decolor(board), BOARD.x, BOARD.y);

	ctxScreen.fillStyle = "#000";
	ctxScreen.arc(scoreBox.topX + SCORE_RADIUS - 2, scoreBox.topY + SCORE_RADIUS - 2, SCORE_RADIUS, 0, Math.PI * 2);
	ctxScreen.fill();

	var snips = [];
	for(var r = 0, pixR = 0; r < 15; r++, pixR += BOARD.cell) {
		for(var c = 0, pixC = 0; c < 15; c++, pixC += BOARD.cell) {
			var data = ctxScreen.getImageData(pixC + BOARD.x + 5, pixR + BOARD.y + 5, 41, 41);

			snips.push(dataToSnip(data));
		}
	}

	snips.scoreBox = scoreBox;
	return snips;
}

function getTileSnips(ctxScreen, debug) {
	var snips = [];

	for(var i = 0; i < 7; i++) {
		var tileData = ctxScreen.getImageData(
			TILES.x + (TILES.cell + TILES.padding) * i,
			TILES.y,
			TILES.cell,
			TILES.cell
		);

		var temp = new Canvas(TILES.cell, TILES.cell);
		temp.getContext("2d").putImageData(tileData, 0, 0);

		var smaller = new Canvas(BOARD.cell, BOARD.cell);
		var ctx = smaller.getContext("2d");
		ctx.drawImage(temp, 0, 0, BOARD.cell, BOARD.cell);

		var data = decolor(ctx.getImageData(5, 5, 41, 41));
		snips.push(dataToSnip(data));

		if(debug) {
			ctx.putImageData(data, 5, 5);
			ctxScreen.drawImage(smaller, TILES.x + (TILES.cell + TILES.padding) * i, TILES.y, BOARD.cell, BOARD.cell);
		}
	}

	return snips;
}

function toSnips(imgBuf, callback) {
	var img = new Canvas.Image();
	img.src = imgBuf;

	var canvas = new Canvas(img.width / 2, img.height / 2);
	var ctx = canvas.getContext("2d");
	ctx.drawImage(img, 0, 0, img.width / 2, img.height / 2);

	var snips = {
		board: getBoardSnips(ctx),
		tiles: getTileSnips(ctx, !!callback)
	};

	if(!callback) { return snips; }

	var scoreBox = snips.board.scoreBox;
	ctx.strokeStyle = "#F00";
	ctx.strokeRect(scoreBox.topX, scoreBox.topY, scoreBox.bottomX - scoreBox.topX, scoreBox.bottomY - scoreBox.topY);

	ctx.strokeStyle = "#F0F";
	ctx.strokeRect(BOARD.x, BOARD.y, BOARD.width, BOARD.width);

	for(var r = 0, pixR = 0; r < 15; r++, pixR += BOARD.cell) {
		for(var c = 0, pixC = 0; c < 15; c++, pixC += BOARD.cell) {
			ctx.strokeStyle = "#F0F";
			ctx.strokeRect(pixR + BOARD.x, pixC + BOARD.y, BOARD.cell, BOARD.cell);
			ctx.strokeStyle = "#0F0";
			ctx.strokeRect(pixR + BOARD.x + 5, pixC + BOARD.y + 5, 41, 41);
		}
	}

	canvas.toBuffer(callback);

	return snips;
}

var maskData = require("./data/masks.json");
var masks = _.pairs(maskData).map(function(pair) {
	pair[1] = _.map(pair[1], function(p) { return p === "1"; });
	return pair;
});
function snipToLetter(snip) {
	var counts = _.countBy(snip);

	if(counts["true"] > 1500) { return " "; }

	var pair = _.max(masks, function(pair) {
		var mask = pair[1];

		return _.countBy(blurSnip(
			_.zip(snip, mask).map(function(p) { return (p[0] !== p[1]); })
		))["false"];
	});

	return (pair[0] === "TW" ? " " : pair[0]);
}
function parse(imgBuf, callback) {
	var snips = toSnips(imgBuf, callback);

	var board = _.range(15).map(function() { return []; });
	snips.board.forEach(function(snip, idx) {
		var row = (idx / 15) >> 0, col = (idx % 15);

		board[row][col] = snipToLetter(snip);
	});

	var tiles = [];
	snips.tiles.forEach(function(snip) {
		var letter = snipToLetter(snip);

		if(letter !== " ") { tiles.push(letter); }
	});

	return { board: board, tiles: tiles };
}

module.exports = parse;
module.exports.toSnips = toSnips;