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

var r = repl.start({
	prompt: "> ",
	input: process.stdin,
	output: process.stdout,
	useGlobal: true,
	useColor: true
});
r.context.dict = dict;
r.context.lookup = lookup;