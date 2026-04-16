# Check all JS and HTML files for touch/pointer events vs mousedown
for f in $(find . -name "*.html" -o -name "*.js" -not -path "*/node_modules/*"); do
  grep -H -E 'mousedown|touchstart|pointerdown' "$f"
done
