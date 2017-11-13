const Koa = require('koa')
const Router = require('koa-router')
const joi = require('joi')
const validate = require('koa-joi-validate')
const sherlockSearch = require('./search')
const app = new Koa()
const router = new Router()

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}`)
})

app.on('error', err => {
  console.error('Server Error', err)
})

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  return next()
})

router.get('/search',
  validate({
    query: {
      term: joi.string().max(30).required(),
      offset: joi.number().integer().min(0).default(0)
    }
  }),
  async (ctx, next) => {
    const { term, offset } = ctx.request.query
    const searchResponse = await sherlockSearch.search(term, offset)
    ctx.body = searchResponse
  }
)

router.get('/paragraphs',
  validate({
    query: {
      bookTitle: joi.string().max(256).required(),
      start: joi.number().integer().min(0).default(0),
      end: joi.number().integer().greater(joi.ref('start')).default(10)
    }
  }),
  async (ctx, next) => {
    const { bookTitle, start, end } = ctx.request.query
    const searchResponse = await sherlockSearch.getParagraphs(bookTitle, start, end)
    ctx.body = searchResponse
  }
)

app
.use(router.routes())
.use(router.allowedMethods())
.listen(3000)
