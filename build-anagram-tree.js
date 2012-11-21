var fs = require("fs");
var repl = require("repl");
var _ = require("lodash");

var dict = JSON.parse(fs.readFileSync("./dictionary.json"));

console.time("build anagram lookup");
var lookup = {};
dict.forEach(function(word) {
	var normalized = _.sortBy(word).join("");

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