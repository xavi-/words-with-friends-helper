var fs = require("fs");
var _ = require("lodash");
var parseSS = require("./parse-screenshot");

var board = [
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'A', ' ', ' ', ' ', ' ', ' ', ' ', 'M' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'N', ' ', ' ', ' ', ' ', ' ', ' ', 'A' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'O', ' ', ' ', ' ', ' ', ' ', ' ', 'C' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'T', ' ', ' ', 'D', 'I', 'N', 'E', 'R' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'H', 'A', 'L', 'E', 'D', ' ', ' ', 'A' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'E', ' ', ' ', ' ', ' ', ' ', ' ', 'M' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'R', ' ', ' ', ' ', ' ', ' ', 'F', 'E' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'U', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'Z', 'A', 'N', 'Y' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ],
	[ ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ' ]
];
board = _.map(board, function(row) { return _.invoke(row, "toLowerCase"); });

var letters = [ "E", "G", "G", "E", "E", "G", "S" ];
letters = _.invoke(letters, "toLowerCase");

var dict = {};
_.each(JSON.parse(fs.readFileSync("./data/dictionary.json")), function(word) { dict[word] = true; });

var hist = JSON.parse(fs.readFileSync("./data/letter-histogram.json"));
var alphabet = _.sortBy(Object.keys(hist), function(letter) { return hist[letter]; });
var histoTree = JSON.parse(fs.readFileSync("./data/anagram-histo-tree.json"));

function getAnagrams(letters) {
	var branches = [ histoTree ];
	var wordHist = _.countBy(letters);

	_.each(alphabet, function(letter) {
		var count = wordHist[letter] || 0;

		branches = _.flatten(
			_.map(branches, function(branch) {
				return _.range(count + 1).map(function(n) { return branch[n] || []; });
			})
		);
	});

	return branches;
}

var getPlacements = (function() {
	function getVerticalPlacements(board, letters, r, c) {
		if(r > 0 && board[r - 1][c] !== " ") { return []; }

		var blanks = 0, placements = [], isConnected = false, pattern = [];
		for(var dr = 0; r + dr < board.length; dr++) {
			if(board[r + dr][c] === " ") { blanks += 1; pattern.push("?"); }
			else { isConnected = true; pattern.push(board[r + dr][c]); }

			isConnected = isConnected ||
				(c > 0 && board[r + dr][c - 1] !== " ") ||
				(c < board[r].length - 1 && board[r + dr][c + 1] !== " ")
			;

			if(blanks > letters.length) { break; }
			if(!isConnected) { continue; }
			if(blanks <= 0) { continue; }
			if(dr + r + 1 === board.length || board[r + dr + 1][c] === " ") {
				placements.push({ row: r, col: c, pattern: _.clone(pattern), isVertical: true });
			}
		}

		return placements;
	}

	function getHorizontalPlacements(board, letters, r, c) {
		if(c > 0 && board[r][c - 1] !== " ") { return []; }

		var blanks = 0, placements = [], isConnected = false, pattern = [];
		for(var dc = 0; c + dc < board[r].length; dc++) {
			if(board[r][c + dc] === " ") { blanks += 1; pattern.push("?"); }
			else { isConnected = true; pattern.push(board[r][c + dc]); }

			isConnected = isConnected ||
				(r > 0 && board[r - 1][c + dc] !== " ") ||
				(r < board.length - 1 && board[r + 1][c + dc] !== " ")
			;

			if(blanks > letters.length) { break; }
			if(!isConnected) { continue; }
			if(blanks <= 0) { continue; }
			if(dc + c + 1 === board[r].length || board[r][c + dc + 1] === " ") {
				placements.push({ row: r, col: c, pattern: _.clone(pattern), isHorizontal: true });
			}
		}

		return placements;
	}

	return function getPlacements(board, letters) {
		var placements = [];
		for(var r = 0; r < board.length; r++) {
			for(var c = 0; c < board[r].length; c++) {
				placements = placements.concat(getVerticalPlacements(board, letters, r, c));
				placements = placements.concat(getHorizontalPlacements(board, letters, r, c));
			}
		}

		return placements;
	};
})();

function filterByPattern(words, pattern) {
	return _.filter(words, function(word) {
		if(pattern.length !== word.length) { return false; }

		for(var i = 0; i < pattern.length; i++) {
			if(pattern[i] === "?") { continue; }

			if(pattern[i] === word[i]) { continue; }

			return false;
		}

		return true;
	});
}

var filterByPlacement = (function() {
	function filterHorizontalPlacement(board, placement) {
		var intersects = [], row = placement.row, col = placement.col;

		for(var i = 0; i < placement.pattern.length; i++) {
			if(board[row][col] !== " ") { continue; }

			var intersect = [ "?" ], dr = 1, stop = false;
			while(!stop) {
				stop = true;

				if(row - dr > 0 && board[row - dr][col] !== " ") {
					intersect.unshift(board[row - dr][col]);
					stop = false;
				}
				if(row + dr < board.length && board[row + dr][col] !== " ") {
					intersect.push(board[row + dr][col]);
					stop = false;
				}

				dr += 1;
			}

			if(intersect.length > 1) { intersects.push({ pos: i, pattern: intersect.join("") }); }
			col += 1;
		}

		return intersects;
	}

	function filterVerticalPlacement(board, placement) {
		var intersects = [], row = placement.row, col = placement.col;

		for(var i = 0; i < placement.pattern.length; i++) {
			if(board[row][col] !== " ") { continue; }

			var intersect = [ "?" ], dc = 1, stop = false;
			while(!stop) {
				stop = true;

				if(col - dc > 0 && board[row][col - dc] !== " ") {
					intersect.unshift(board[row][col - dc]);
					stop = false;
				}
				if(col + dc < board[row].length && board[row][col + dc] !== " ") {
					intersect.push(board[row][col + dc]);
					stop = false;
				}

				dc += 1;
			}

			if(intersect.length > 1) { intersects.push({ pos: i, pattern: intersect.join("") }); }
			row += 1;
		}

		return intersects;
	}

	return function filterByPlacement(board, words, placement) {
		var intersects = (
			placement.isVertical ?
				filterVerticalPlacement(board, placement) :
				filterHorizontalPlacement(board, placement)
		);

		return words.filter(function(word) {
			return _.all(intersects, function(intersect) {
				return !!dict[intersect.pattern.replace("_", word.charAt(intersect.pos))];
			});
		});
	};
})();

var multiplierCodes = {
	".": { word: 1, letter: 1 },
	"*": { word: 1, letter: 1 },
	"d": { word: 1, letter: 2 },
	"D": { word: 2, letter: 1 },
	"t": { word: 1, letter: 3 },
	"T": { word: 3, letter: 1 }
};
var boardVals = JSON.parse(fs.readFileSync("./data/board.json"));
var letterVals = JSON.parse(fs.readFileSync("./data/letter-values.json"));
function scorePlacement(placement) {
	var scores = {}, multipliers = { word: 1 };

	var row = placement.row, col = placement.col;
	var dr = 0, dc = 1;
	if(placement.isVertical) { dr = 1; dc = 0; }

	for(var i = 0; i < placement.words[0].length; i++) {
		var isBlank = (board[row][col] === " ");
		var multiplier = (isBlank ? multiplierCodes[boardVals[row][col]] : { word: 1, letter: 1 });

		multipliers.word *= multiplier.word;
		multipliers[i] = multiplier.letter;

		row += dr; col += dc;
	}

	_.each(placement.words, function(word) {
		var total = 0;

		_.each(word, function(letter, idx) {
			total += letterVals[letter] * multipliers[idx];
		});

		scores[word] = total * multipliers.word;
	});

	placement.scores = scores;

	return placement;
}

function getValidPlacements(board, letters) {
	var placements = getPlacements(board, letters);
	_.each(placements, function(placement) {
		var allLetters = placement.pattern.filter(function(l) { return l !== "?"; }).concat(letters);

		var words = getAnagrams(allLetters);
		words = filterByPattern(words, placement.pattern);
		words = filterByPlacement(board, words, placement);

		placement.words = words;
	});
	placements = placements.filter(function(p) { return p.words.length > 0; });
	placements = placements.map(scorePlacement);

	return placements;
}

function getMaxScoringPlacement(board, letters) {
	var placements = getValidPlacements(board, letters);
	return _.max(placements, function(p) { return _.max(p.scores); });
}

console.log("board:");
console.dir(board);
console.log("letters:", letters);
console.log(getMaxScoringPlacement(board, letters));