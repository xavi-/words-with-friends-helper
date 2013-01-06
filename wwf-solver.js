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
_.each(JSON.parse(fs.readFileSync("./dictionary.json")), function(word) { dict[word] = true; });

var hist = JSON.parse(fs.readFileSync("./letter-histogram.json"));
var alphabet = _.sortBy(Object.keys(hist), function(letter) { return hist[letter]; });
var histoTree = JSON.parse(fs.readFileSync("./anagram-histo-tree.json"));

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
	function filterHorizontalPlacement(board, words, placement) {
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

	function filterVerticalPlacement(board, words, placement) {
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
				filterVerticalPlacement(board, words, placement) :
				filterHorizontalPlacement(board, words, placement)
		);

		return words.filter(function(word) {
			return _.all(intersects, function(intersect) {
				return !!dict[intersect.pattern.replace("_", word.charAt(intersect.pos))];
			});
		});
	}
})();

var placements = getPlacements(board, letters);
_.each(placements, function(placement) {
	var allLetters = placement.pattern.filter(function(l) { return l !== "?"; }).concat(letters);

	placement.words = getAnagrams(allLetters);
	placement.words = filterByPattern(placement.words, placement.pattern);
	placement.words = filterByPlacement(board, placement.words, placement);
});
placements = placements.filter(function(p) { return p.words.length > 0; });

console.log("board:");
console.dir(board);
console.log("placements:");
console.dir(placements);
console.log(placements.length);