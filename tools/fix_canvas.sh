for f in $(find . -name "*.html" -o -name "*.js" -not -path "*/node_modules/*"); do
  sed -i 's/canvas.width = W; canvas.height = H;/const dpr = window.devicePixelRatio || 1; canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);/g' "$f"
done
