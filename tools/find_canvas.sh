for f in $(find . -name "*.html" -o -name "*.js" -not -path "*/node_modules/*"); do
  grep -H -E '\.width *=' "$f" | grep canvas
done
