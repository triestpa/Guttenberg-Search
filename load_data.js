const { client, index, type } = require('./connection')
const fs = require('fs')
const path = require('path')

/** Parse and index all txt files in data directory */
async function readBooks () {
  let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt')
  console.log(`Found ${files.length} Files`)
  for (let file of files) {
    console.log(`Reading File - ${file}`)
    const filePath = path.join('./books', file)
    const { title, author, sections } = parseBookFile(filePath)
    await insertBookData(title, author, sections)
  }
}

/** Read an individual book txt file, and extract the title, author, and sections */
function parseBookFile (filePath) {
  const book = fs.readFileSync(filePath, 'utf8')
  const title = book.match(/^Title:\s(.+)$/m)[1]
  const authorMatch = book.match(/^Author:\s(.+)$/m)
  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1]

  console.log(`Reading Book - ${title} By ${author}`)

  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m)
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index

  const sections = book
    .slice(startOfBookIndex, endOfBookIndex) // Remove Guttenberg header and footer
    .split(/\n\s+\n/g) // Split each paragraph into it's own array entry
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Remove paragraph line breaks and whitespace
    .map(line => line.replace(/_/g, '')) // Guttenberg uses "_" to signify italics.  We'll remove it, since it makes the raw text look messy.
    .filter((line) => (line && line.length !== '')) // Remove empty lines

  console.log(`Parsed ${sections.length} Lines\n`)
  return { title, author, sections }
}

/** Bulk index the book data in ElasticSearch */
async function insertBookData (title, author, sections) {
  const bulkOps = [] // Array to store bulk operations

  // Add an index operation for each section in the book
  for (let i = 0; i < sections.length; i++) {
    // Describe action
    bulkOps.push({ index: { _index: index, _type: type } })

    // Add document
    bulkOps.push({
      Author: author,
      Title: title,
      Paragraph: i,
      Text: sections[i]
    })
  }

  // Execute bulk ops array
  await client.bulk({ body: bulkOps })
}

/** Clear ES index and insert books from filesystem */
async function main () {
  try {
    await client.resetIndex()
    await readBooks()
  } catch (err) {
    console.error(err)
  }
}

main()
