## Introduction

## Project Setup
### ElasticSearch
We'll be indexing and querying data from ElasticSearch throughout this tutorial.  ElasticSearch is compatable with all major operating systems, see here for installation instructions for each. [ insert install links here ]

### NodeJS
We'll be interfacing with our ES instance using Node.js primarily.  Our server code uses the async/await syntax, so Node.js 7.8 or higher is required for this project.

See here for installation instructions [insert install links here]

### Clone the Git Repo
Clone the git repo here - [ insert link ] in order to access the setup scripts and base configuration.

## Connect To Elastic Search
### Bash commnd
### client.js

## The Raw Data
We'll be using data from "Project Gutenberg" - an online project dedicated to providing free, digital copies of books within the public domain.  For this project, we'll be populating our library with 100 of the most popular books in the "Project Gutenberg" catalogue, including books such as "The Adventures of Sherlock Holmes", "Treasure Island", "The Count of Monte Cristo", "Around the World in 80 Days", "The Odyssey", "Romeo and Juliet", and "The King James Bible".

### Data Download
To streamline the data downloading process, a newline-delimited file with each book link is included in the project (`download_links.txt`), along with a bash script (`download_data.sh`)  to download these files into a `books/` subdirectory.

Run the download script a wait a few minutes while all of the books are downloaded.

```bash
bash download_data.sh
```

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

After these lines comes `*** START OF THIS PROJECT GUTENBERG EBOOK HEART OF DARKNESS ***`, after which the book content actually starts.

If you scroll to the end of the book you'll see the matching message `*** END OF THIS PROJECT GUTENBERG EBOOK HEART OF DARKNESS ***`, which is followed by a much more detailed version of the book license.

## Data Loading
Our next step will be to read the content of each book, extract the metadata (title and author), remove the book header and footer (the Project Gutenberg metadata and license), and split each paragraph into a separate array entry.

Let's define a new javascript file `load_data.js` in order to perform these operations, and to load the resulting paragraphs into ElasticSearch.

### Read Data Dir
First let's obtain a list of every file within the `books/` data directory.

---insert-code

### Read Data File
Next we'll read the file of each book.

### Extract Metadata
We'll use a few regular expressions to read the "Title" and "Author" metadata that is specified at the top of the file.

### Strip Header and Footer
We'll also use regular expressions to find the `START` and `END` Project Guttenberg messages, in order to avoid indexing the metadata and license for each ebook.

### Clean Content and Split into Paragraphs
Finally, we'll split the book into an array of paragraphs, and we'll remove extra line-breaks and special characters.

### Map data in ES
### Index Datafile in ES

## Querying
### Simple Query Script - Term search

## Server
### Koajs server
### Link endpoint with queries
### Input validation

## WebApp
### Vuejs setup
### Search + Show results

## Page Previews
### Add serverside query
### Add UI functionality

## Conclusion