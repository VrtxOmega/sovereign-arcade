for f in $(find . -name "index.html" -not -path "*/node_modules/*"); do
  if ! grep -q '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' "$f"; then
    echo "Missing correct viewport in: $f"
  fi
done
