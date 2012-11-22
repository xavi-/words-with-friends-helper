var fs = require("fs");
var repl = require("repl");
var _ = require("lodash");

var dict = JSON.parse(fs.readFileSync("./dictionary.json"));
var hist = JSON.parse(fs.readFileSync("./letter-histogram.json"));

dict = dict.filter(function(word) { return word.length <= 15; });

function letterValue(letter) { return -hist[letter]; }

console.time("build anagram lookup");
var lookup = {};
dict.forEach(function(word) {
	var normalized = _.sortBy(word, letterValue).join("");

	lookup[normalized] = lookup[normalized] || [];
	lookup[normalized].push(word);
});
console.timeEnd("build anagram lookup");

console.time("build anagram tree");
var tree = {};
_.each(lookup, function(words, letters) {
	var node = tree;

	_.each(letters, function(letter) {
		node[letter] = node[letter] || {};
		node = node[letter];
	});

	node._words = (node.words || []).concat(words);
});
console.timeEnd("build anagram tree");

fs.writeFile("./anagram-tree.json", JSON.stringify(tree, null, "\t"));

console.time("getting tree stats");
tree._depth = 0;
var node, stack = [ tree ];
var depths = {}, count = 0;
while(node = stack.pop()) {
	depths[node._depth] = (depths[node._depth] || 0) + 1;
	count += 1;

	Object.keys(node)
		.filter(function(k) { return k.charAt(0) !== "_"; })
		.forEach(function(key) {
			node[key]._depth = node._depth + 1;
			stack.push(node[key]);
		})
	;
}
console.timeEnd("getting tree stats");

console.log("depths:");
console.dir(depths);
console.log("total: " + count);

function query(word) {
	var normalized = _.sortBy(word, letterValue);
	var words = [], node = tree;

	_.each(normalized, function(letter) {
		words = words.concat(node[letter]._words || []);
		node = node[letter];
	});

	return words;
}

var r = repl.start({
	prompt: "> ",
	input: process.stdin,
	output: process.stdout,
	useGlobal: true,
	useColor: true
});
r.context.dict = dict;
r.context.lookup = lookup;
r.context.tree = tree;
r.context.query = query;
r.context.letterValue = letterValue;
r.context.lo = _;
