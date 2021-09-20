const net = require('net');
const {parseHTML} = require('./parser');

class Request {
  constructor(options) {
    this.method = options.method || 'GET'
    this.host = options.host
    this.port = options.port || 80
    this.path = options.path || '/'
    this.body = options.body || {}
    this.headers = options.headers || {}
    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    } else if (this.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
    }
    this.headers['Content-Length'] = this.bodyText.length
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser()
      if (connection) {
        connection.write(this.toString())
      } else {
        connection = net.createConnection({
          host: this.host,
          port: this.port
        }, () => {
          connection.write(this.toString())
        })

        connection.on('data', (data) => {
          // console.log(data.toString())
          parser.recieve.bind(parser)(data.toString())
          if (parser.isFinished) {
            resolve(parser.response)
            connection.end()
          }
        })

        connection.on('error', (err) => {
          reject(err)
          connection.end()
        })
      }
    })
  }

  toString() {
    return `${this.method} ${this.path}HTTP/1.1
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`
  }
}

class ResponseParser {
  constructor() {
    this.isFinished = true
    this.statusLine = ''
    this.headers = {}
    this.statusLine = ''
    this.headerName = ''
    this.headerValue = ''
    this.bodyValue = ''
    this.bodyParse = null
  }

  get response() {
    return {
      statusLine: this.statusLine,
      headers: this.headers,
      body: parseHTML(this.bodyValue)
    }
  }

  recieve(string) {
    let state = this.waitStatusLine
    for (let char of string) {
      state = state.bind(this)(char)
    }
  }
  waitStatusLine(c) {
    if (c === '\r') {
      return this.waitStatusLineEnd
    } else {
      this.statusLine += c
      return this.waitStatusLine
    }
  }

  waitStatusLineEnd(c) {
    if (c === '\n') {
      return this.waitHeadName
    } else {
      throw new Error('parse Error')
    }
  }

  waitHeadName(c) {
    if (c === ':') {
      return this.waitHeadSpace
    } else if (c === '\r') {
      return this.waitHeadBlockEnd
    } else {
      this.headerName += c
      return this.waitHeadName
    }
  }

  waitHeadSpace(c) {
    if (c === ' ') {
      return this.waitHeadValue
    } else {
      throw new Error('parse Error')
    }
  } 

  waitHeadValue(c) {
    if (c === '\r') {
      this.headers[this.headerName] = this.headerValue
      this.headerName = ''
      this.headerValue = ''
      return this.waitHeadLineEnd
    } else {
      this.headerValue += c
      return this.waitHeadValue
    }
  }

  waitHeadLineEnd(c) {
    if (c === '\n') {
      return this.waitHeadName
    } else {
      throw new Error('parse Error')
    }
  }

  waitHeadBlockEnd(c) {
    if (c === '\n') {
      return this.waitBody
    } else {
      throw new Error('parse Error')
    }
  }

  waitBody(c) {
    this.bodyValue += c
    return this.waitBody
  }

}

void async function() {
  let request = new Request({
    method: 'POST',
    host: '127.0.0.1',
    port: 8080,
    path: '/',
    headers:{},
    body: {
      msg: 'mei ying'
    }
  })

  let response = await request.send()
  console.log('response', response)
}()