mkdir books
wget -i download_links.txt -P books/

# Normalize extensions (strip .utf-8 suffix)
for f in ./books/*.txt.utf-8;
do
  mv -- "$f" "${f%.txt.utf-8}.txt"
done