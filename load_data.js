const { client, index, type } = require('./connection')
const fs = require('fs')
const path = require('path')

async function readBooks () {
  let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt')
  console.log(`Found ${files.length} Files`)
  for (let file of files) {
    console.log(`Reading File - ${file}`)
    const filePath = path.join('./books', file)
    const { title, author, sections } = parseBookFile(filePath)
    // await insertBookData(title, author, sections)
    await bulkIndex(title, author, sections)
  }
}

function parseBookFile (filePath) {
  const book = fs.readFileSync(filePath, 'utf8')
  const title = book.match(/^Title:\s(.+)$/m)[1]
  let authorMatch = book.match(/^Author:\s(.+)$/m)
  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1]

  console.log(`Reading Book - ${title} By ${author}`)

  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m)
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index

  const sections = book
    .slice(startOfBookIndex, endOfBookIndex) // Remove Guttenberg header and footer
    .split(/\n\s+\n/g) // Split each paragraph into it's own array entry
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Remove paragraph line breaks and whitespace
    .filter((line) => (line && line.length !== '')) // Remove empty lines

  console.log(`Parsed ${sections.length} Lines\n`)
  return { title, author, sections }
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

async function insertBookData (title, author, sections) {
  for (let i = 0; i < sections.length; i++) {
    await client.index({
      index,
      type,
      body: {
        Author: author,
        Title: title,
        Paragraph: i,
        Text: sections[i]
      }
    })
  }
}

async function bulkIndex (title, author, sections) {
  const bulkOps = []
  for (let i = 0; i < sections.length; i++) {
    // Describe action
    bulkOps.push({ index: { _index: index, _type: type } })

    // Describe document
    bulkOps.push({
      Author: author,
      Title: title,
      Paragraph: i,
      Text: sections[i]
    })
  }

  await client.bulk({ body: bulkOps })
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
