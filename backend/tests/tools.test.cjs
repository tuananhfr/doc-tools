const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
require('reflect-metadata')
require('dotenv/config')
const { NestFactory } = require('@nestjs/core')
const { createHttpAdapter } = require('../dist/config/http-adapter')
const { AppModule } = require('../dist/app.module')
const { DatabaseService } = require('../dist/database/database.service')
let app, api, database
const slug = 'qa-' + crypto.randomBytes(10).toString('hex')
const testIp = '198.51.100.' + (Math.floor(Math.random() * 200) + 1)
const ipHash = crypto.createHmac('sha256',process.env.VISIT_HASH_SECRET).update(testIp).digest('hex')
before(async () => {
  app = await NestFactory.create(AppModule, createHttpAdapter(), { logger: false, bodyParser: false })
  app.setGlobalPrefix('api/v1')
  await app.init()
  api = app.getHttpAdapter().getInstance()
  await api.ready()
  database = app.get(DatabaseService)
})
after(async () => {
  if(database) {
    await database.pool.execute('DELETE FROM tool_visits WHERE tool = ?', [slug])
    await database.pool.execute('DELETE FROM visit_flood_events WHERE ip_hash = ?', [ipHash])
    await database.pool.execute('DELETE FROM visit_flood_locks WHERE ip_hash = ?', [ipHash])
  }
  if(app) await app.close()
})
test('public visit API preserves validation, atomic counting and rolling flood limit', async () => {
  const invalidBody = {ok:false,message:'Body phải là JSON và header Content-Type phải là application/json. Trong Postman: tab Body → chọn "raw" → đổi kiểu sang "JSON" (không dùng form-data).'}
  for(const payload of ['', '{', 'null', '"text"', 'tool=ghep-pdf']) {
    const response = await api.inject({method:'POST',url:'/api/v1/tools/visits',headers:{'content-type':'application/json'},payload,remoteAddress:testIp})
    assert.equal(response.statusCode,400)
    assert.deepEqual(response.json(),invalidBody)
  }
  for(const payload of [[], {}]) {
    const response = await api.inject({method:'POST',url:'/api/v1/tools/visits',payload,remoteAddress:testIp})
    assert.equal(response.statusCode,400)
    assert.equal(response.json().message,'Tên công cụ không hợp lệ.')
  }
  for(const tool of ['', 'BAD', '../file', 'x'.repeat(49), 123]) {
    const response = await api.inject({method:'POST',url:'/api/v1/tools/visits',payload:{tool},remoteAddress:testIp})
    assert.equal(response.statusCode,400)
    assert.equal(response.json().ok,false)
  }
  const send = () => api.inject({method:'POST',url:'/api/v1/tools/visits',payload:{tool:slug},remoteAddress:'127.0.0.1',headers:{'x-forwarded-for':testIp}})
  const replies = await Promise.all(Array.from({length:16},send))
  for(const reply of replies) { assert.equal(reply.statusCode,200); assert.deepEqual(reply.json(),{ok:true}) }
  let stats = (await api.inject({method:'GET',url:'/api/v1/tools/stats'})).json()
  assert.equal(stats.tools[slug],16)
  await database.pool.execute('DELETE FROM visit_flood_events WHERE ip_hash = ?', [ipHash])
  const future = Math.floor(Date.now()/1000)+3600
  const rows = Array.from({length:120},()=>[ipHash,future])
  await database.pool.query('INSERT INTO visit_flood_events (ip_hash,expires) VALUES ?', [rows])
  assert.deepEqual((await send()).json(),{ok:true})
  stats = (await api.inject({method:'GET',url:'/api/v1/tools/stats'})).json()
  assert.equal(stats.tools[slug],16)
  await database.pool.execute('UPDATE visit_flood_events SET expires = ? WHERE ip_hash = ?', [Math.floor(Date.now()/1000)-1,ipHash])
  await send()
  stats = (await api.inject({method:'GET',url:'/api/v1/tools/stats'})).json()
  assert.equal(stats.tools[slug],17)
  assert.equal(stats.ok,true)
  assert.equal(stats.total,Object.values(stats.tools).reduce((total,count)=>total+count,0))
})
