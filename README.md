# Building a Full-Text Search App Using ElasticSearch And Docker

Adding fast, flexible, and accurate full-text search to apps can be a major challenge.  Most mainstream databases, such as PostgreSQL and MongoDB, and offer rudimentary text search capabilities - which largely exist as afterthoughts to the existing query and index structure.  In order to provide top-notch full-text search, a seperate datastore is often the best option.  ElasticSearch is a leading open-source datastore that is optimized to perform incredibly flexible and fast in-memory full-text search.

> Algolia? Angnolia? Angolia? is another emerging entrant in this field.

In this tutorial, we will walk through building a web app to search through the texts of 100 open source literary classics.

## Project Setup

### ElasticSearch

We'll be indexing and querying data from ElasticSearch throughout this tutorial.  ElasticSearch is compatible with all major operating systems, see here for installation instructions for each. [ insert install links here ]

### NodeJS

We'll be interfacing with our ES instance using Node.js.  Our server code uses the async/await syntax, so Node.js 7.8 or higher is required for this project.

See here for installation instructions [insert install links here]

Create a new directory for you project, and add a new `package.json` file.

```json
{
  "name": "elastic-library",
  "version": "1.0.0",
  "description": "Source code for ElasticSearch tutorial using 100 classic open source books.",
  "scripts": {
    "dev": "npm run serve & npm start",
    "serve": "http-server ./public",
    "start": "node server.js"
  },
  "author": "patrick.triest@gmail.com",
  "license": "MIT",
  "dependencies": {
    "elasticsearch": "13.3.1",
    "http-server": "0.10.0",
    "joi": "13.0.1",
    "koa": "2.4.1",
    "koa-joi-validate": "0.5.1",
    "koa-router": "7.2.1"
  }
}
```
<br>

Run `npm install` on the command line to download the server dependencies.

## Connect To Elastic Search

The first thing that we'll need to do in our app is connect to our local Elasticsearch instance.

Add the following initialization code to a new file `connection.js`.

```javascript
const elasticsearch = require('elasticsearch')

// Core ES variables for this project
const index = 'book'
const type = 'novel'
const host = 'localhost:9200'

// Connect to ElasticSearch
const client = new elasticsearch.Client({ host })

// Print ES cluster health to console
client.cluster.health({}).then(console.log).catch(console.error)
```
<br>

Run `node connection.js` on the command line - you should see some system output similar to the following.

```javascript
{
  cluster_name: 'elasticsearch_patrick',
  status: 'yellow',
  timed_out: false,
  number_of_nodes: 1,
  number_of_data_nodes: 1,
  active_primary_shards: 16,
  active_shards: 16,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 16,
  delayed_unassigned_shards: 0,
  number_of_pending_tasks: 0,
  number_of_in_flight_fetch: 0,
  task_max_waiting_in_queue_millis: 0,
  active_shards_percent_as_number: 50
}
```
<br>

### Add Helper Function To Reset Index

In `connection.js` add the following function, in order to provide an easy way to reset (clear) our ElasticSearch index.

```javascript
/** Clear the index, recreate it, and add mappings */
async function resetIndex () {
  if (await client.indices.exists({ index })) {
    await client.indices.delete({ index })
  }

  await client.indices.create({ index })
  await putBookMapping()
}
```
<br>

### Add Book Schema

Next, we'll want to add a "mapping" for the book data schema.

```javascript
/** Add book schema mapping to ES */
async function putBookMapping () {
  const schema = {
    title: { type: 'keyword' },
    author: { type: 'keyword' },
    location: { type: 'integer' },
    text: { type: 'text' }
  }

  return client.indices.putMapping({ index, type, body: { properties: schema } })
}
```
<br>

Here we are defining a mapping for the `book` index.  An Elasticsearch `index` is roughly analogous to a SQL `table` or a MongoDB `collection`.  Adding a mapping allows us to specify each field and datatype for the stored documents.  Elasticsearch is schema-less, so we don't technically have to add a mapping, but doing so will give us more control over how the data is handled.

For instance - we're assigning the `keyword` type to the "title" and "author" fields, and the `text` type to "text".  Doing so will cause the search engine to treat these string fields differently - During a search, the engine will search *within* the `text` field for potential matches, whereas `keyword` fields will be matched based on their full content.  This might seem like a minor distinction, but it can have a huge impact on the behavior and speed of different searches.

Export the exposed properties and functions at the bottom of the file, so that they can be accessed by other modules in our app.

```javascript
module.exports = {
  client, index, type, resetIndex
}
```
<br>

## The Raw Data

We'll be using data from "Project Gutenberg" - an online project dedicated to providing free, digital copies of books within the public domain.  For this project, we'll be populating our library with 100 classic books, including texts such as "The Adventures of Sherlock Holmes", "Treasure Island", "The Count of Monte Cristo", "Around the World in 80 Days", "Romeo and Juliet", and "The Odyssey".

### Download Books

I've zipped the 100 books into a file that you can download here - {insert download link}
Extract this file into a `/books` directory in your project.

### Preview A Book

Try opening one of the book files, say `219-0.txt`.  You'll notice that it starts with an open source license, followed by lines identifying the book title, author, ebook release dates, language and character encoding.

```txt
Title: Heart of Darkness

Author: Joseph Conrad

Release Date: February 1995 [EBook #219]
Last Updated: September 7, 2016

Language: English

Character set encoding: UTF-8
```
<br>

After these lines comes `*** START OF THIS PROJECT GUTENBERG EBOOK HEART OF DARKNESS ***`, after which the book content actually starts.

If you scroll to the end of the book you'll see the matching message `*** END OF THIS PROJECT GUTENBERG EBOOK HEART OF DARKNESS ***`, which is followed by a much more detailed version of the book's open source license.

## Data Loading

Our next step will be to read the content of each book and add that data to Elasticsearch.  Let's define a new javascript file `load_data.js` in order to perform these operations.

### Read Data Dir

First let's obtain a list of every file within the `books/` data directory.

Add the following content to `load_data.js`.

```javascript
const fs = require('fs')
const path = require('path')
const esConnection = require('./connection')

/** Clear ES index, parse and index all files from the books directory */
async function readAndInsertBooks () {
  try {
    // Clear previous ES index
    await esConnection.resetIndex()

    // Read books directory
    let files = fs.readdirSync('./books').filter(file => file.slice(-4) === '.txt')
    console.log(`Found ${files.length} Files`)

    // Read each book file, and index each paragraph in elasticsearch
    for (let file of files) {
      console.log(`Reading File - ${file}`)
      const filePath = path.join('./books', file)
      const { title, author, paragraphs } = parseBookFile(filePath)
      await insertBookData(title, author, paragraphs)
    }
  } catch (err) {
    console.error(err)
  }
}

readAndInsertBooks()
```
<br>

Try running `node load_data.js`.  You should see Elasticsearch status output, followed by `Found 100 Books`.
After this, the script should exit due to an error, since we're calling helper functions that we have not yet defined.

### Read Data File

Next we'll read the metadata and content for each book.

Define a new function in `load_data.js`.

```javascript
/** Read an individual book txt file, and extract the title, author, and paragraphs */
function parseBookFile (filePath) {
  // Read text file
  const book = fs.readFileSync(filePath, 'utf8')

  // Find book title and author
  const title = book.match(/^Title:\s(.+)$/m)[1]
  const authorMatch = book.match(/^Author:\s(.+)$/m)
  const author = (!authorMatch || authorMatch[1].trim() === '') ? 'Unknown Author' : authorMatch[1]

  console.log(`Reading Book - ${title} By ${author}`)

  // Find Guttenberg metadata header and footer
  const startOfBookMatch = book.match(/^\*{3}\s*START OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m)
  const startOfBookIndex = startOfBookMatch.index + startOfBookMatch[0].length
  const endOfBookIndex = book.match(/^\*{3}\s*END OF (THIS|THE) PROJECT GUTENBERG EBOOK.+\*{3}$/m).index

  // Clean book text and split into array of paragraphs
  const paragraphs = book
    .slice(startOfBookIndex, endOfBookIndex) // Remove Guttenberg header and footer
    .split(/\n\s+\n/g) // Split each paragraph into it's own array entry
    .map(line => line.replace(/\r\n/g, ' ').trim()) // Remove paragraph line breaks and whitespace
    .map(line => line.replace(/_/g, '')) // Guttenberg uses "_" to signify italics.  We'll remove it, since it makes the raw text look messy.
    .filter((line) => (line && line.length !== '')) // Remove empty lines

  console.log(`Parsed ${paragraphs.length} Paragraphs\n`)
  return { title, author, paragraphs }
}
```
<br>

This function performs a few important tasks.  After reading the book text from the file system, it uses regular expressions (ADD BLOG LINK) to find the book title and author.  After this, it also identifies the start and end of the book content, by matching on the all-caps Project Guttenberg header and footer.  Finally, it extracts the book content, splits each paragraph into it's own array, cleans up the text, and removes blank lines.

As a return value, we'll have an object containing the book's title, author, and an array of paragraphs within the book.

Try running the `load_data.js` script again, and you should see the same output as before, this time with three extra lines at the end of the output.

```text
Reading File - 1400-0.txt
Reading Book - Great Expectations By Charles Dickens
Parsed 3901 Paragraphs
```

The script will again end with an error, since we still have to define one more helper function.

### Index Datafile in ES

As a final step, we'll bulk-upload each array of paragraphs into the Elastic Search index.

Add a new `insertBookData` function to `load_data.js`.

```javascript
/** Bulk index the book data in ElasticSearch */
async function insertBookData (title, author, paragraphs) {
  const bulkOps = [] // Array to store bulk operations

  // Add an index operation for each section in the book
  for (let i = 0; i < paragraphs.length; i++) {
    // Describe action
    bulkOps.push({ index: { _index: esConnection.index, _type: esConnection.type } })

    // Add document
    bulkOps.push({
      author,
      title,
      location: i,
      text: paragraphs[i]
    })
  }

  // Execute bulk ops array
  await esConnection.client.bulk({ body: bulkOps })
}
```
<br>

This function will index each paragraph of the book, with author, title, and paragraph location metadata attached.  We are inserting the paragraphs using a bulk operation, which is much faster than indexing each paragraph individually.

## Querying

Now that ElasticSearch has been populated with 100 books, let's try out some queries.

### Simple HTTP Query

### Query Script

Create a new file, `search.js`.

```javascript
const { client, index, type } = require('./connection')

module.exports = {
  /** Query ES index for the provided term */
  queryTerm (term, offset = 0) {
    const body = {
      from: offset,
      query: { match: {
        text: {
          query: term,
          operator: 'and',
          fuzziness: 'auto'
        } } },
      highlight: { fields: { text: {} } }
    }

    return client.search({ index, type, body })
  }
}
```
<br>


Our search module defines a simple `search` function, which will perform a `match` query using the input term.

Here are query fields broken down -

- `from` - Allows us to paginate the results.  Each query returns 10 results by default, so specifying `from: 10` would allow us to retrieve results 10-20.
- `query` - Where we specify the actual term that we are searching for.
- `operator` - We can modify the search behavior; in this case we're using the "and" operator to prioritize results that contain all of the tokens (words) in the query.
- `fuzziness` - Adjusts tolerence for spelling mistakes, `auto` defaults to `fuzziness: 2`.  A higher fuzziness will allow for more corrections in result hits.  For instance, `fuzziness: 1` would allow `Patricc` to return `Patrick` as a match.
- `highlights` - Returns an extra field with the result, containing HTML to display the extact text subset and terms that were matched with the query.

You could test the query by adding a function call at the bottom.

```javascript
module.exports.queryTerm('patrick').then(results => results.hits.hits.forEach(console.log))
```
<br>


Running `node search.js` should log each of the first 10 search results for the term.

## API

Let's write a quick HTTP API in order to access our search functionality from a frontend app.

### Koajs server

Add a new file `server.js`.

```javascript
const Koa = require('koa')
const Router = require('koa-router')
const joi = require('joi')
const validate = require('koa-joi-validate')
const search = require('./search')

const app = new Koa()
const router = new Router()

// Log each request to the console
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}`)
})

// Log percolated errors to the console
app.on('error', err => {
  console.error('Server Error', err)
})

// Set permissive CORS header
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  return next()
})

// ADD ENDPOINTS HERE

app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(3000)
```
<br>


This code will import our server dependencies and setup simple logging and error handling for a Koajs server.

### Link endpoint with queries

Next, we'll add an endpoint to our server in order to expose our Elasticsearch query function.

Insert the following code below the `// ADD ENDPOINTS HERE` comment.

```javascript
/**
 * GET /search
 * Search for a term in the library
 */
router.get('/search', async (ctx, next) => {
    const { term, offset } = ctx.request.query
    ctx.body = await search.queryTerm(term, offset)
  }
)
```
<br>


[ add code to try it out ]

### Input validation

This endpoint is a bit brittle - we are not doing any checks on the request parameters, so invalid or missing values would result in a server error.

We'll add some middleware to the endpoint in order to validate input parameters using Joi and the Koa-Joi-Validate library.

```javascript
/**
 * GET /search
 * Search for a term in the library
 * Query Params -
 * term: string under 60 characters
 * offset: positive integer
 */
router.get('/search',
  validate({
    query: {
      term: joi.string().max(60).required(),
      offset: joi.number().integer().min(0).default(0)
    }
  }),
  async (ctx, next) => {
    const { term, offset } = ctx.request.query
    ctx.body = await search.search(term, offset)
  }
)
```
<br>


## Web App

Now that our `/search` endpoint is in place, let's wire up a simple web app to test out the API.

Add a new directory, `public`, for our web app code.

### Vue.js App

We'll be using Vue.js to coordinate our frontend.

Add a new file, `/public/app.js`, containing the Vue application code.

```javascript
const vm = new Vue ({
  el: '#vue-instance',
  data () {
    return {
      baseUrl: 'http://localhost:3000', // API url

      searchTerm: "Hello World", // Default search term
      searchDebounce: null, // Timeout for search bar debounce
      searchResults: [], // Displayed search results
      numHits: null, // Total search results found
      searchOffset: 0, // Search result pagination offset

      selectedParagraph: null, // Selected paragraph object
      bookOffset: 0, // Offset for book paragraphs being displayed
      paragraphs: [] // Paragraphs being displayed in book preview window
    }
  },
  async created () {
    this.searchResults = await this.search() // Search for default term
  },
  methods: {
    /** Debounce search input by 100 ms */
    onSearchInput () {
      clearTimeout(this.searchDebounce)
      this.searchDebounce = setTimeout(async () => {
        this.searchOffset = 0
        this.searchResults = await this.search()
      }, 100)
    },
    /** Call API to search for inputted term */
    async search () {
      const response = await axios.get(`${this.baseUrl}/search`, { params:
        { term: this.searchTerm, offset: this.searchOffset }
      })

      this.numHits = response.data.hits.total
      return response.data.hits.hits
    },
    /** Get next page of search results */
    async nextResultsPage () {
      if (this.numHits > 10) {
        this.searchOffset += 10
        if (this.searchOffset + 10 > this.numHits) { this.searchOffset = this.numHits - 10}
        this.searchResults = await this.search()
        document.documentElement.scrollTop = 0
      }
    },
    /** Get previous page of search results */
    async prevResultsPage () {
      this.searchOffset -=  10
      if (this.searchOffset < 0) { this.searchOffset = 0 }
      this.searchResults = await this.search()
      document.documentElement.scrollTop = 0
    }
  }
})
```
<br>


The app is pretty simple - we're just defining some shared data properties, and adding methods to retrieve and paginate through search results.  The search input is debounced by 100ms, to prevent the API from being called with every keystroke.

Explaining how Vue.js works is slightly outside the scope of this tutorial, but if you've used Angular or React this probably won't look too crazy.  Here's a good tutorial on Vue if you want something quick to get started with [ ADD VUE TUTORIAL ]

### HTML

Add the following to a new file, `/public/index.html`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Elastic Library</title>
  <meta name="description" content="Literary Classic Search Engine.">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/normalize/7.0.0/normalize.min.css" rel="stylesheet" type="text/css" />
  <link href="https://cdn.muicss.com/mui-0.9.20/css/mui.min.css" rel="stylesheet" type="text/css" />
  <link href="https://fonts.googleapis.com/css?family=Cardo|Open+Sans" rel="stylesheet" />
  <link href="styles.css" rel="stylesheet" />
</head>
<body>
  <div class="app-container" id="vue-instance">

      <!-- Search Bar Header -->
      <div class="mui-panel">
        <div class="mui-textfield">
          <input v-model="searchTerm" type="text" v-on:keyup="onSearchInput()">
          <label>Search</label>
        </div>
      </div>

      <!-- Search Metadata Card -->
      <div class="mui-panel">
        <div class="mui--text-headline">{{ numHits }} Hits</div>
        <div class="mui--text-subhead">Displaying Results {{ searchOffset }} - {{ searchOffset + 9 }}</div>
      </div>

      <!-- Top Pagination Card -->
      <div class="mui-panel pagination-panel">
          <button class="mui-btn mui-btn--flat" v-on:click="prevResultsPage()">Prev Page</button>
          <button class="mui-btn mui-btn--flat" v-on:click="nextResultsPage()">Next Page</button>
      </div>

      <!-- Search Results Card List -->
      <div class="search-results" ref="searchResults">
        <div class="mui-panel" v-for="hit in searchResults" v-on:click="showBookModal(hit)">
          <div class="mui--text-title" v-html="hit.highlight.text[0]"></div>
          <div class="mui-divider"></div>
          <div class="mui--text-subhead">{{ hit._source.title }} - {{ hit._source.author }}</div>
          <div class="mui--text-caption">Location {{ hit._source.location }}</div>
        </div>
      </div>

      <!-- Bottom Pagination Card -->
      <div class="mui-panel pagination-panel">
          <button class="mui-btn mui-btn--flat" v-on:click="prevResultsPage()">Prev Page</button>
          <button class="mui-btn mui-btn--flat" v-on:click="nextResultsPage()">Next Page</button>
      </div>

      <!-- INSERT BOOK MODAL HERE -->

  </div>
  <script src="https://cdn.muicss.com/mui-0.9.28/js/mui.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/vue/2.5.3/vue.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/axios/0.17.0/axios.min.js"></script>
  <script src="app.js"></script>
</body>
</html>
```
<br>

### CSS

Add a new file, `/public/styles.css`, with some custom UI styling.

```css
body { font-family: 'Cardo', serif; }

.mui-textfield > input, .mui-btn, .mui-panel > .mui--text-headline {
  font-family: 'Open Sans', sans-serif;
}

.app-container { padding: 16px; }
.search-results em { font-weight: bold }
.book-modal > button { width: 100%; }
.search-results .mui-divider { margin: 14px 0; }

.search-results {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
}

.search-results > div {
  flex-basis: 45%;
  box-sizing: border-box;
  cursor: pointer;
}

@media (max-width: 600px) {
  .search-results > div { flex-basis: 100%; }
}

.paragraphs-container {
  max-width: 800px;
  margin: 0 auto;
  margin-bottom: 48px;
}

.book-modal {
  width: 100%;
  height: 100%;
  padding: 40px 10%;
  box-sizing: border-box;
  margin: 0 auto;
  background-color: white;
  overflow-y: scroll;
  position: fixed;
  top: 0;
  left: 0;
}

.pagination-panel {
  display: flex;
  justify-content: space-between;
}

.modal-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  background: white;
}
```
<br>

### Try it out

Try running `npm run dev` on the command line.  This will start two process - the node.js API will be served from port 3000, and the frontend app will be served from port 8080.

Open `localhost:8080` in your web browser, you should see a simple search interface with paginated results.  Try typing in the top search bar to find matches from different terms.

If you try clicking on any results nothing happens - we still have one more feature to add to the app.

## Page Previews

It would be nice to be able to click on each search result, and view it in the context of the book that it's from.

### Add Elasticsearch Query

First, we'll need to define a simple query to get a range of paragraphs from a given book.

Add the following functions to the `module.exports` block in `search.js`.

```javascript
/** Get the specified range of paragraphs from a book */
getParagraphs (bookTitle, startLocation, endLocation) {
  const filter = [
    { term: { title: bookTitle } },
    { range: { location: { gte: startLocation, lte: endLocation } } }
  ]

  const body = {
    size: endLocation - startLocation,
    sort: { paragraph: 'asc' },
    query: { bool: { filter } }
  }

  body.sort = { location: 'asc' }
  body.size = endLocation - startLocation

  return client.search({ index, type, body })
}
```
<br>


This new function will return an ordered array of paragraphs between the start and end locations of a given book.

### Add API Endpoint

Now, let's link this function to an API endpoint.

Add the following to `server.js`, below the first `/search` endpoint.

```javascript
/**
 * GET /paragraphs
 * Get a range of paragraphs from the specified book
 * Query Params -
 * bookTitle: string under 256 characters
 * start: positive integer
 * end: positive integer greater than start
 */
router.get('/paragraphs',
  validate({
    query: {
      bookTitle: joi.string().max(256).required(),
      start: joi.number().integer().min(0).default(0),
      end: joi.number().integer().greater(joi.ref('start')).default(10)
    }
  }),
  async (ctx, next) => {
    const { bookTitle, start, end } = ctx.request.query
    ctx.body = await search.getParagraphs(bookTitle, start, end)
  }
)
```
<br>

### Add UI functionality

Now that our new endpoints are in place, let's add some frontend funcationality to query and display full pages from the book.

Add the following functions to the `methods` block of `/public/app.js`.

```javascript
/** Call the API to get current page of paragraphs */
async getParagraphs (bookTitle, offset) {
  try {
    this.bookOffset = offset
    const start = this.bookOffset
    const end = this.bookOffset + 10
    const response = await axios.get(`${this.baseUrl}/paragraphs`, { params: { bookTitle, start, end } })
    return response.data.hits.hits
  } catch (err) {
    console.error(err)
  }
},
/** Get next page (next 10 paragraphs) of selected book */
async nextBookPage () {
  this.$refs.bookModal.scrollTop = 0
  this.paragraphs = await this.getParagraphs(this.selectedParagraph._source.title, this.bookOffset + 10)
},
/** Get previous page (previous 10 paragraphs) of selected book */
async prevBookPage () {
  this.$refs.bookModal.scrollTop = 0
  this.paragraphs = await this.getParagraphs(this.selectedParagraph._source.title, this.bookOffset - 10)
},
/** Display paragraphs from selected book in modal window */
async showBookModal (searchHit) {
  try {
    document.body.style.overflow = 'hidden';
    this.selectedParagraph = searchHit
    this.paragraphs = await this.getParagraphs(searchHit._source.title, searchHit._source.location - 5)
  } catch (err) {
    console.error(err)
  }
},
/** Close the book detail modal */
closeBookModal () {
  document.body.style.overflow = 'auto';
  this.selectedParagraph = null
}
```
<br>


These five functions provide the logic for downloading and paginating through pages (10 paragraphs each) in a book.

Now we just need to add a UI to display the book pages.  Add this markup below the `<!-- INSERT BOOK MODAL HERE -->` comment in `/public/index.html`.

```html
<!-- Book Paragraphs Modal Window -->
<div v-if="selectedParagraph" ref="bookModal" class="book-modal">
  <div class="paragraphs-container">
    <!-- Book Section Metadata -->
    <div class="mui--text-headline">{{ selectedParagraph._source.title }} - {{ selectedParagraph._source.author }}</div>
    <div class="mui--text-subhead">Locations {{ bookOffset - 5 }} to {{ bookOffset + 5 }}</div>
    <div class="mui-divider"></div>
    <br>

    <!-- Book Paragraphs -->
    <div v-for="paragraph in paragraphs">
      <div v-if="paragraph._source.location === selectedParagraph._source.location" class="mui--text-body2">
        <strong>{{ paragraph._source.text }}</strong>
      </div>
      <div v-else class="mui--text-body1">
        {{ paragraph._source.text }}
      </div>
      <br>
    </div>
  </div>

  <!-- Book Pagination Footer -->
  <div class="modal-footer">
    <button class="mui-btn mui-btn--flat" v-on:click="prevBookPage()">Prev Page</button>
    <button class="mui-btn mui-btn--flat" v-on:click="closeBookModal()">Close</button>
    <button class="mui-btn mui-btn--flat" v-on:click="nextBookPage()">Next Page</button>
  </div>
</div>
```
<br>


Run `npm run dev` again and open up `localhost:8080`.  When you click on a search result, you are now able to view the surrounding paragraphs, and even to read the rest of the book to completion if you're entertained by what you find.

## Conclusion

### Syncing with Databases