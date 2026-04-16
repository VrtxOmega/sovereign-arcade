for f in $(find . -name "index.html" -not -path "*/node_modules/*"); do
  sed -i 's/<meta name="viewport".*>/<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/' "$f"
  if ! grep -q '<meta name="viewport"' "$f"; then
    sed -i 's/<head>/<head>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/' "$f"
  fi
done
