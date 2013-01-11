var fs = require("fs");
var http = require("http");
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
					var screen = parseSS.toBoard(imgBuf);
					console.log("board:");
					console.dir(screen.board);
					console.log("letters:", screen.letters);
					console.timeEnd("parse image");

					console.time("find placement");
					var placement = solver.getMaxScoringPlacement(screen.board, screen.letters);
					console.log("max placement:");
					console.dir(placement);
					console.timeEnd("find placement");

					res.json(placement);
				});
			});
		}
	}
});

var server = http.createServer(router);
server.listen(8015);
console.log("Listening on port 8015...");