for f in $(find . -name "*.html" -not -path "*/node_modules/*"); do
  sed -i 's/<script>/<script defer>/g' "$f"
done
