var _ = require("lodash");

var dict = {};
_.each(require("./data/dictionary.json"), function(word) { dict[word] = true; });

var hist = require("./data/letter-histogram.json");
var alphabet = _.sortBy(Object.keys(hist), function(letter) { return hist[letter]; });
var histoTree = require("./data/anagram-histo-tree.json");

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

var filterByIntersects = (function() {
	function findVerticalIntersects(board, placement) {
		var intersects = {}, row = placement.row, col = placement.col;

		for(var i = 0; i < placement.pattern.length; i++, col++) {
			if(board[row][col] !== " ") { continue; }

			var dr, intersect = [ "?" ];

			for(dr = 1; row - dr > 0 && board[row - dr][col] !== " "; dr++) {
				intersect.unshift(board[row - dr][col]);
			}
			for(dr = 1; row + dr < board.length && board[row + dr][col] !== " "; dr++) {
				intersect.push(board[row + dr][col]);
			}

			if(intersect.length > 1) { intersects[i] = intersect.join(""); }
		}

		return intersects;
	}

	function findHorizontalIntersects(board, placement) {
		var intersects = {}, row = placement.row, col = placement.col;

		for(var i = 0; i < placement.pattern.length; i++, row++) {
			if(board[row][col] !== " ") { continue; }

			var dc, intersect = [ "?" ];

			for(dc = 1; col - dc > 0 && board[row][col - dc] !== " "; dc++) {
				intersect.unshift(board[row][col - dc]);
			}
			for(dc = 1; col + dc < board[row].length && board[row][col + dc] !== " "; dc++) {
				intersect.push(board[row][col + dc]);
			}

			if(intersect.length > 1) { intersects[i] = intersect.join(""); }
		}

		return intersects;
	}

	return function filterByIntersects(board, words, placement) {
		if(words.length === 0) { return words; }

		var intersects = (
			placement.isVertical ?
				findHorizontalIntersects(board, placement) :
				findVerticalIntersects(board, placement)
		);

		placement.intersects = intersects;

		return words.filter(function(word) {
			return _.all(intersects, function(pattern, pos) {
				return !!dict[pattern.replace("?", word.charAt(pos))];
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
var boardVals = require("./data/board.json");
var letterVals = require("./data/letter-values.json");
function scorePlacement(board, placement) {
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

		_.each(placement.intersects, function(pattern, pos) {
			pos = parseInt(pos, 10);
			var row = placement.row, col = placement.col;
			var multiplier = multiplierCodes[boardVals[row + dr * pos][col + dc * pos]];
			var intersect = pattern.replace("?", word.charAt(pos));

			var subTotal = 0;
			_.each(intersect, function(letter, idx) {
				subTotal += letterVals[letter] * (idx === pos ? multiplier.letter : 1);
			});

			total += subTotal * multiplier.word;
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
		words = filterByIntersects(board, words, placement);

		placement.words = words;
	});
	placements = placements.filter(function(p) { return p.words.length > 0; });
	placements = placements.map(function(p) { return scorePlacement(board, p); });

	return placements;
}

function getMaxScoringPlacement(board, letters) {
	var placements = getValidPlacements(board, letters);
	return _.max(placements, function(p) { return _.max(p.scores); });
}

exports.getValidPlacements = getValidPlacements;
exports.getMaxScoringPlacement = getMaxScoringPlacement;