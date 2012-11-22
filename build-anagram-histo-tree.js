var fs = require("fs");
var repl = require("repl");
var _ = require("lodash");

var dict = JSON.parse(fs.readFileSync("./dictionary.json"));
var hist = JSON.parse(fs.readFileSync("./letter-histogram.json"));

dict = dict.filter(function(word) { return word.length <= 15; });

function letterValue(letter) { return hist[letter]; }

console.time("build histo-tree");
var alphabet = _.sortBy(Object.keys(hist), letterValue);
var histoTree = {};
_.each(dict, function(word) {
	var wordHisto = _.countBy(word);

	var node = histoTree;
	_.each(alphabet, function(letter, idx) {
		var count = wordHisto[letter] || 0;
		node[count] = node[count] || (idx + 1 < alphabet.length ? {} : []);
		node = node[count];
	});

	node.push(word);
});
console.timeEnd("build histo-tree");

fs.writeFile("./anagram-histo-tree.json", JSON.stringify(histoTree, null, "\t"));

var r = repl.start({
	prompt: "> ",
	input: process.stdin,
	output: process.stdout,
	useGlobal: true,
	useColor: true
});
r.context.dict = dict;
r.context.histoTree = histoTree;
r.context.letterValue = letterValue;
r.context.lo = _;
