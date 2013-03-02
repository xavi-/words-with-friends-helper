var fs = require("fs");
var path = require("path");
var _ = require("lodash");

var parseSS = require("../parse-screenshot");

const noop = function() {};
const ALPHABET = "abcdefghijklmnopqrstuvwxyzW"; // W (lowercase W) is TW (triple word)

function testMasks(callback) {
	var screens = require("./test-screens.json");

	var pending = {};
	_(screens).each(function(screen, file) {
		var board = screen.board, tiles = screen.tiles;

		pending[file] = true;
		fs.readFile(path.resolve(__dirname, "./images/" + file), function(err, data) {
			if(err) { throw err; }
			console.log("Testing " + file + "...");

			var result = parseSS(data, function(err, buf) {
				if(err) { throw err; }
				fs.writeFile(path.resolve(__dirname, "./images/output/" + file), buf);
			});
			_.flatten(result.board).forEach(function(letter, idx) {
				var row = (idx / 15) >> 0, col = (idx % 15);
				if(letter === board[row][col]) { return; }

				console.log("Expected board:");
				console.dir(board);
				console.log("Actual board:");
				console.dir(result.board);
				console.log("Error in '" + file + "' at row: " + row + "; col: " + col);
				console.log("Expected: " + board[row][col] + "; Actual: " + letter);
			});
			result.tiles.forEach(function(letter, idx) {
				if(letter === tiles[idx]) { return; }

				console.log("Expected tiles:");
				console.dir(tiles);
				console.log("Actual tiles:");
				console.dir(result.tiles);
				console.log("Error in '" + file + "' at idx: " + idx);
				console.log("Expected: " + tiles[idx] + "; Actual: " + letter);
			});
			pending[file] = false;

			if(result.tiles.length !== tiles.length) {
				console.log("Expected tiles:");
				console.dir(tiles);
				console.log("Actual tiles:");
				console.dir(result.tiles);
				console.log("Error in '" + file + "'");
			}

			if(!_.countBy(pending)["true"]) { (callback || noop)(); }
		});
	});
}

exports.testMasks = testMasks;

if (require.main === module) { // being ran as script
	console.log("Testing masks...");
	testMasks(function(err) {
		if(err) { throw err; }

		console.log("Completed testing masks.");
	});
}