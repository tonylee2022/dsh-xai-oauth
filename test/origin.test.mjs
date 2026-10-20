import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import test from 'node:test'
import { corsHeaders, isLocalOrigin } from '../lib/origin.js'

test('accepts the DSH Desktop application origin', () => {
  assert.equal(isLocalOrigin('dsh-app://app'), true)
  assert.equal(isLocalOrigin('dsh-app://app/'), true)
})

test('accepts loopback HTTP origins', () => {
  for (const origin of ['http://127.0.0.1:63360', 'http://localhost:1457', 'http://[::1]:1457']) {
    assert.equal(isLocalOrigin(origin), true, origin)
  }
})

test('rejects every other origin', () => {
  for (const origin of [
    undefined,
    'null',
    'https://harness.deepseek.com',
    'http://192.168.1.10:63360',
    'dsh-app://shell',
    'app://app',
  ]) {
    assert.equal(isLocalOrigin(origin), false, String(origin))
  }
})

test('answers the Desktop preflight with its own origin and network permission', () => {
  const headers = corsHeaders('dsh-app://app')
  assert.equal(headers['access-control-allow-origin'], 'dsh-app://app')
  assert.equal(headers['access-control-allow-private-network'], 'true')
  assert.equal(headers['access-control-allow-local-network'], 'true')
  assert.match(headers['access-control-allow-methods'], /OPTIONS/)
  assert.match(headers['access-control-allow-headers'], /x-dsh-csrf/)
})

test('answers a real Desktop preflight over HTTP', async () => {
  const server = createServer((request, response) => {
    const origin = request.headers.origin
    if (!isLocalOrigin(origin)) {
      response.writeHead(403).end()
      return
    }
    response.writeHead(204, { vary: 'Origin', ...corsHeaders(origin) }).end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address()
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1',
        port,
        path: '/status',
        method: 'OPTIONS',
        headers: {
          Origin: 'dsh-app://app',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Private-Network': 'true',
        },
      }, (res) => {
        res.resume()
        resolve(res)
      })
      req.on('error', reject)
      req.end()
    })
    assert.equal(response.statusCode, 204)
    assert.equal(response.headers['access-control-allow-origin'], 'dsh-app://app')
    assert.equal(response.headers['access-control-allow-private-network'], 'true')
    assert.equal(response.headers['access-control-allow-local-network'], 'true')
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
