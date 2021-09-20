const http = require('http');

http.createServer((request, response) => {
  let body = [];
  request.on('data', (chunk) => {
    console.log('data', chunk.toString())
    body.push(chunk)
  }).on('end', () => {
    body = Buffer.concat(body).toString()
    console.log('body: ', body)
    response.writeHead(200, {'Content-Type': 'text/html'})
    response.end('<html meta="sasasa"><head><style>body h1.header{color: yellow;} .vis{color: red;} img {width:200px;}</style></head><body><h1 class="header vis" style="color:red;">Hello World</h1><img src="test.png" width=100/></body></html>')
  }).on('error', (err) => {
    console.error(err)
  })
}).listen(8080, () => {
  console.log('server listen on port 8080')
})
