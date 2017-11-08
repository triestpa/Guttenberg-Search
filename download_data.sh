mkdir books
wget -i download_links.txt -P books/

# Normalize extensions
for f in ./books/*.txt.utf-8; do
mv -- "$f" "${f%.txt.utf-8}.txt"
done