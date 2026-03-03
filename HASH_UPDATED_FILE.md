
## Create Hash file

### Macos
```bash
find smooflow.app -type f | sort | while read file; do
  rel="${file#smooflow.app/}"
  size=$(stat -f%z "$file")
  hash=$(shasum -a 256 "$file" | awk '{print $1}' | xxd -r -p | base64)
  printf '{"path":"%s","calculatedHash":"%s","length":%s},\n' "$rel" "$hash" "$size"
done | sed '$ s/,$//' | awk 'BEGIN{print "["} {print} END{print "]"}' > hashes.json
```