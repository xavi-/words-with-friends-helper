var fs = require("fs");
var http = require("http");
var util = require("util");
var bee = require("beeline");
var quip = require("quip");
var formidable = require("formidable");

var parseSS = require("../parse-screenshot");
var solver = require("../solver");

var router = bee.route({
	"`preprocess`": [
		function(req, res) { quip.update(res); }
	],
	"/ /index.html": bee.staticFile("./index.html", "text/html"),
	"/upload-screenshot": {
		"POST": function(req, res) {
			var form = formidable.IncomingForm();
			form.parse(req, function(err, fields, files) {
				console.log("fields:");
				console.dir(fields);
				console.log("files:");
				console.dir(files);

				fs.readFile(files["board"].path, function(err, imgBuf) {
					console.time("parse image");
					var screen = parseSS(imgBuf);
					console.log("board:");
					console.dir(screen.board);
					console.log("tiles:", screen.tiles);
					console.timeEnd("parse image");

					console.time("find placement");
					var placement = solver.getMaxScoringPlacement(screen.board, screen.tiles);
					console.log("max placement:");
					console.dir(placement);
					console.timeEnd("find placement");


					var dc = 1, dr = 0;
					if(placement.isVertical) { dc = 0; dr = 1; }
					for(var i = 0; i < placement.pattern.length; i++) {
						if(placement.pattern[i] !== "?") { continue; }

						screen.board[placement.row + dr * i][placement.col + dc * i] = "(#)";
					}

					var out = util.inspect(placement) + "\n\n";
					for(var r = 0; r < screen.board.length; r++) {
						out += "\n" + Array(screen.board[r].length + 1).join("+---") + "+\n";

						for(var c = 0; c < screen.board[r].length; c++) {
							var chr = screen.board[r][c];

							if(chr.length <= 1) { chr = " " + chr.toUpperCase() + " "; }

							out += "|" + chr;
						}

						out += "|"
					}
					out += "\n" + Array(screen.board[0].length + 1).join("+---") + "+\n";

					res.text(out);
				});
			});
		}
	}
});

var server = http.createServer(router);
server.listen(8015);
console.log("Listening on port 8015...");