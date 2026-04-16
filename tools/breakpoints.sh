# Check all CSS files for breakpoints
for f in $(find . -name "*.html" -o -name "*.css" -not -path "*/node_modules/*"); do
  grep -H -E '@media.*\(' "$f"
done
