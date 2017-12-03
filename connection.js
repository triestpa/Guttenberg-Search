const elasticsearch = require('elasticsearch')

// ES Index and Type for this project
const index = 'library'
const type = 'novel'

// Connect to ElasticSearch
const client = new elasticsearch.Client({
  host: 'localhost:9200'
  // log: 'trace'
})

// Print ES cluster health to console
client.cluster.health({}).then(console.log).catch(console.error)

/** Clear the index, recreate it, and add mappings */
async function resetIndex () {
  if (await client.indices.exists({ index })) {
    await client.indices.delete({ index })
  }

  await client.indices.create({ index })
  await putBookMapping()
}

/** Add book section schema mapping to ES */
async function putBookMapping () {
  const schema = {
    Title: { type: 'keyword' },
    Author: { type: 'keyword' },
    Paragraph: { type: 'integer' },
    Text: { type: 'text' }
  }

  return client.indices.putMapping({ index, type, body: { properties: schema } })
}

module.exports = {
  client, index, type, resetIndex
}
