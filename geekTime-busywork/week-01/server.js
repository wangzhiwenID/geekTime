const http = require('http');

http.createServer((request, response) => {
    let body = [];
    request.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        body.push(chunk.toString());
    }).on('end', () => {
        body = Buffor.concat(body).toString();
        console.log("body:",body);
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(' Hello world\n');
    });
}).listen(8080);

console.log("server started");