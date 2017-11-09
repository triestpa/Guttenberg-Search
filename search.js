const { client, index, type } = require('./connection')

module.exports = {
  async search (term, offset = 0) {
    const result = await client.search({
      index,
      type,
      body: {
        from: offset,
        query: { match: { 'Text': term } },
        highlight: { fields: { Text: {} } }
      }
    })

    return result
  },
  async getParagraphs (bookTitle, startLocation, endLocation) {
    const result = await client.search({
      index,
      type,
      body: {
        size: endLocation - startLocation,
        sort: { 'Paragraph': 'asc' },
        query: {
          bool: {
            filter: [
              { term: { 'Title': bookTitle } },
              { range: { 'Paragraph': { gte: startLocation, lte: endLocation } } }
            ]
          }
        }
      }
    })

    return result
  }
}
