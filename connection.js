const elasticsearch = require('elasticsearch')

const client = new elasticsearch.Client({
  host: 'localhost:9200'
  // log: 'trace'
})

client.cluster.health({}).then(console.log).catch(console.error)

module.exports = {
  client,
  index: 'sherlock',
  type: 'novel'
}
