const { client, index, type } = require('./connection')

module.exports = {
  /** Query ES index for the provided term */
  search (term, offset = 0) {
    const body = {
      from: offset,
      query: { match: { 'Text': term } },
      highlight: { fields: { Text: {} } }
    }

    return client.search({ index, type, body })
  },

  /** Get the specified range of paragraphs from a book */
  getParagraphs (bookTitle, startLocation, endLocation) {
    const filter = [
      { term: { 'Title': bookTitle } },
      { range: { 'Paragraph': { gte: startLocation, lte: endLocation } } }
    ]

    const body = {
      size: endLocation - startLocation,
      sort: { 'Paragraph': 'asc' },
      query: { bool: { filter } }
    }

    body.sort = { 'Paragraph': 'asc' }
    body.size = endLocation - startLocation

    return client.search({ index, type, body })
  }
}
