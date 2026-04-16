for f in $(find . -name "*.html" -o -name "*.js" -not -path "*/node_modules/*"); do
  sed -i 's/100vh/100dvh/g' "$f"
done
