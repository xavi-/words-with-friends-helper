function printSnip(snip) {
	var out = [];
	for(var r = 0, i = 0; r < 41; r++) {
		var tmp = [];
		for(var c = 0; c < 41; c++) {
			tmp.push(snip[i++] ? "#" : ".");
		}
		out.push(tmp.join(""));
	}

	console.log(out.join("\n"));
	return snip;
}

exports.printSnip = printSnip;