const { client, index, type } = require('./connection')

async function count () {
  const result = await client.count({ index, type })
  console.log('count', result)
}

async function testSearch () {
  const result = await client.search({
    index,
    type,
    body: {
      query: {
        match: { 'Title': 'Hound' }
      }
    }
  })

  console.log('testSearch', result)
}

async function testSearch2 () {
  const result = await client.search({
    index,
    type,
    body: {
      query: {
        match: { 'Text': 'opium den sherlock' }
      },
      highlight: {
        fields: {
          Text: {}
        }
      }
    }
  })

  console.log('testSearch2', result)
  for (let hit of result.hits.hits) {
    console.log(hit._source.Text)
    console.log(hit.highlight.Text)
  }
}

async function main () {
  await count()
  await testSearch()
  await testSearch2()
}

main()
