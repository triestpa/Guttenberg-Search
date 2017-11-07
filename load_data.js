const { client, index, type } = require('./connection')
const fs = require('fs')
const path = require('path')

async function readBooks () {
  let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt')
  console.log(files)
  for (let file of files) {
    const filePath = path.join('./books', file)
    const { title, author, lines } = parseBookFile(filePath)
    await insertBookData(title, author, lines)
  }
}

function parseBookFile (filePath) {
  const data = fs.readFileSync(filePath, 'utf8')
  const title = data.match(/^Title:\s(.+)$/m)[1]
  const author = data.match(/^Author:\s(.+)$/m)[1]
  console.log(`Reading Book - ${title} By ${author}`)

  const startOfBookMatch = data.match(/^\*{3}\sSTART OF THIS PROJECT GUTENBERG EBOOK.+\*{3}$/m)
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length
  const endOfBookIndex = data.match(/^\*{3}\sEND OF THIS PROJECT GUTENBERG EBOOK.+\*{3}$/m).index

  const lines = data
    .slice(startOfBookIndex, endOfBookIndex) // Remove Guttenberg header and footer
    .split(/\n\s+\n/g) // Split each paragraph into it's own array entry
    .map(line => line.replace(/\r\n/g, ' ')) // Remove paragraph line breaks
    .map(line => line.trim()) // Trim whitespace
    .filter((line) => (line && line !== '')) // Remove empty lines

  return { title, author, lines }
}

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

async function insertBookData (title, author, lines) {
  for (let i = 0; i < lines.length; i++) {
    await client.index({
      index,
      type,
      body: {
        Author: author,
        Title: title,
        Paragraph: i,
        Text: lines[i]
      }
    })
  }
}

async function main () {
  try {
    await resetIndex()
    await readBooks()
  } catch (err) {
    console.error(err)
  }
}

main()
