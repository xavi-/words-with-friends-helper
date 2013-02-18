var fs = require("fs");
var path = require("path");
var _ = require("lodash");

var helpers = require("../helpers");

var parseSS = require("../parse-screenshot");

const noop = function() {};
const ALPHABET = "abcdefghijklmnopqrstuvwxyzW"; // W (lowercase W) is TW (triple word)

function createTrainingData(callback) {
	var boards = require("./training-boards.json");

	var pending = {}, training = {};
	_(boards).each(function(board, file) {
		pending[file] = true;
		fs.readFile(path.resolve(__dirname, "./images/" + file), function(err, data) {
			if(err) { throw err; }

			var snips = parseSS.toSnips(data, function(err, buf) {
				if(err) { throw err; }
				fs.writeFile(path.resolve(__dirname, "./images/output/" + file), buf);
			});
			snips
				.board
				.map(function(snip, idx) {
					var row = (idx / 15) >> 0, col = (idx % 15);

					return { row: row, col: col, snip: snip };
				})
				.forEach(function(info) {
					var letter = board[info.row][info.col];

					var counts = _.countBy(info.snip);
					if(counts["true"] > 1500) { // Cell is all white (i.e. empty)
						if(letter !== ".") {
							console.dir(board);
							helpers.printSnip(info.snip);
							console.log("Error in '" + file + "' at row: " + info.row + "; col: " + info.col);
							throw "Empty cell should be '" + letter + "'";
						}
						return;
					}

					if(ALPHABET.indexOf(letter) < 0) {
						throw "Invalid letter ('" + letter + "') found in '" + file + "'.";
					}

					if(letter === "W") { letter = "TW"; }

					training[letter] = training[letter] || [];
					training[letter].push(info.snip.map(function(val) { return (val ? "1" : "0"); }).join(""));
				})
			;

			pending[file] = false;

			if(!_.countBy(pending)["true"]) {
				fs.writeFile(
					path.resolve(__dirname, "./masks-training-data.json"),
					JSON.stringify(training, null, "\t"),
					callback || noop
				);
			}
		});
	});
}

function createConicalMasks(callback) {
	var training = require("./masks-training-data.json");
	var conical = {};
	for(var letter in training) {
		var data = training[letter];

		conical[letter] =
			_.zip.apply(_, data)
				.map(function(val) {
					var counts = _.defaults(_.countBy(val), { "1": 0, "0": 0 });

					return (counts["1"] > counts["0"] ? "1" : "0");
				})
				.join("")
			;
	}

	fs.writeFile(
		path.resolve(__dirname, "../data/masks.json"),
		JSON.stringify(conical, null, "\t"),
		callback || noop
	);

	return conical;
}

exports.createTrainingData = createTrainingData;
exports.createConicalMasks = createConicalMasks;

if (require.main === module) { // being ran as script
	console.log("Generating masks...");
	createTrainingData(function(err) {
		if(err) { throw err; }

		console.log("Generated training data...");
		createConicalMasks(function(err) {
			if(err) { throw err; }

			console.log("Completed generating masks.");
		});
	});
}