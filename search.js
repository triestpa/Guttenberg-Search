const { client, index, type } = require('./connection')

module.exports = {
  async search (term) {
    const result = await client.search({
      index,
      type,
      body: {
        query: { match: { 'Text': term } },
        highlight: { fields: { Text: {} } }
      }
    })

    return result
  }
}
