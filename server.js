const Koa = require('koa')
const sherlockSearch = require('./search')
const app = new Koa()

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}`)
})

app.on('error', err => {
  console.error('Server Error', err)
})

app.use(async ctx => {
  const term = ctx.request.query.term

  if (!term) {
    ctx.throw(400, 'Search Term Required')
  }

  const searchResponse = await sherlockSearch.search(term)

  let template = '<!DOCTYPE html><html><head></head><body>'
  for (let hit of searchResponse.hits.hits) {
    template += `
      <p>${hit._source.Author} - ${hit._source.Title} - Location ${hit._source.Paragraph}</p>
      <p>${hit.highlight.Text}</p>
      <br>
    `
  }
  template += '</body></html>'
  ctx.body = template
})

app.listen(3000)
