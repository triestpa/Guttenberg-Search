const elasticsearch = require('elasticsearch')

const index = 'library'
const type = 'novel'

const client = new elasticsearch.Client({
  host: 'localhost:9200'
  // log: 'trace'
})

client.cluster.health({}).then(console.log).catch(console.error)

async function resetIndex () {
  if (await client.indices.exists({ index })) {
    await client.indices.delete({ index })
  }

  await client.indices.create({ index })

  const schema = {
    Title: { type: 'keyword' },
    Author: { type: 'keyword' },
    Paragraph: { type: 'integer' },
    Text: { type: 'text' }
  }

  await client.indices.putMapping({ index, type, body: { properties: schema } })
}

module.exports = {
  client, index, type, resetIndex
}
