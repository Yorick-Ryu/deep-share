---
name: md2docx
description: Convert Markdown to Word (DOCX) documents. Use when user wants to export, convert, or create Word documents from Markdown content.
api_key: ""
---

# md2docx - Markdown to Word Converter

Convert Markdown text to professionally formatted Word (DOCX) documents.

## Quick Start

**To convert Markdown to Word, use the conversion script**:

```bash
python scripts/convert.py input.md
```

The script handles API authentication, calls the conversion service, and returns a download URL.

## How It Works

1. **Prepare Markdown**: Ensure content is in standard Markdown format
2. **Run Script**: Execute `scripts/convert.py` to call the conversion API
3. **Get Result**: Receive download URL or error message

## API Details

**Endpoint**: `https://api.deepshare.app/convert-text-to-url`

**Authentication**: Include header `X-API-Key: {api_key}`

### API Key Configuration

You can configure the API key in three ways:

1. **Environment Variable** (Highest Priority)
   ```bash
   export DEEP_SHARE_API_KEY="your_api_key_here"
   ```

2. **Skill Variable** (Medium Priority)
   Edit the `api_key` field in the YAML frontmatter of this Skill file:
   ```yaml
   ---
   name: md2docx
   api_key: "your_api_key_here"
   ---
   ```

3. **Trial Key** (Fallback): `f4e8fe6f-e39e-486f-b7e7-e037d2ec216f`

**Priority Order**:
1. Environment variable `DEEP_SHARE_API_KEY` (if set)
2. Skill's `api_key` variable (if not empty)
3. Trial key (limited quota)

⚠️ **Trial Mode**: Limited quota. For stable production use, purchase at: https://ds.rick216.cn/purchase

## Request Format

```json
{
  "content": "markdown text here",
  "filename": "output",
  "template_name": "templates",
  "language": "zh",
  "hard_line_breaks": false,
  "remove_hr": false
}
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `content` | required | Markdown text to convert |
| `filename` | `"output"` | Output filename (without .docx) |
| `template_name` | `"templates"` | Template: `templates`, `论文`, `article`, `thesis`, etc. |
| `language` | `"zh"` | Template language: `zh` or `en` |
| `hard_line_breaks` | `false` | Preserve single line breaks |
| `remove_hr` | `false` | Remove horizontal rules |

## Common Templates

**Chinese** (`language: "zh"`):
- `templates` - General purpose
- `论文` - Academic paper
- `论文-首行不缩进` - Paper without indent
- `论文-标题加粗` - Paper with bold headings

**English** (`language: "en"`):
- `templates` - General purpose
- `article` - Article/report style
- `thesis` - Academic thesis

## Conversion Steps

### 1. Validate Markdown Format

Before conversion, ensure:
- Headers use `#` syntax
- Lists use `-` or `1.` syntax
- Code blocks use triple backticks
- Math formulas use `$...$` (inline) or `$$...$$` (block)
- Images use publicly accessible URLs

### 2. Use Conversion Script

**Run the conversion script** to handle API calls automatically:

```bash
python scripts/convert.py input.md [template] [language]
```

The script will:
- Automatically select API key by priority (env → skill → trial)
- Read and validate the Markdown file
- Call the conversion API
- Return the download URL or error message

**Example usage**:
```bash
# Basic conversion
python scripts/convert.py document.md

# With specific template
python scripts/convert.py paper.md 论文 zh

# With custom API key
python scripts/convert.py doc.md templates zh your_api_key
```

### 3. Handle Response

**Success** (200 OK):
```json
{
  "url": "https://flies.deepshare.app/mcp/hash/document_xxx.docx"
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid API key
- `403 Forbidden` - Quota exceeded → Purchase at https://ds.rick216.cn/purchase
- `413 Payload Too Large` - Content exceeds 10MB
- `500 Internal Server Error` - Service unavailable, retry

## User Communication

### On Success

Tell user:
1. Conversion completed successfully
2. Provide the download URL
3. Check which API key was used:
   - **If using environment variable or Skill variable**: No reminder needed
   - **If using trial key**: Remind: "⚠️ You're using trial mode (limited quota). For stable production use, get your API key at: https://ds.rick216.cn/purchase"

### On Quota Exceeded

Tell user:
1. Conversion failed: quota exceeded
2. Purchase more credits at: https://ds.rick216.cn/purchase
3. Or use another API key

### On Other Errors

Tell user:
1. What went wrong (based on error message)
2. How to fix it
3. Offer to retry

## Tips

- **API Key Configuration**:
  - **Option 1 (Recommended)**: Set environment variable `DEEP_SHARE_API_KEY`
    ```bash
    export DEEP_SHARE_API_KEY="your_api_key_here"
    ```
  - **Option 2**: Edit `api_key` in this Skill's YAML frontmatter
  - **Option 3**: Use trial key (limited quota)
- **File Size**: Keep Markdown under 10MB
- **Images**: Use `https://` URLs, not local paths
- **Math**: Use LaTeX syntax: `$E=mc^2$` or `$$\int_0^\infty$$`
- **Line Breaks**: Use `hard_line_breaks: true` for addresses, poetry
- **Templates**: Choose based on document type (paper, article, etc.)

## Example Workflow

**User asks**: "Convert this to Word"

1. Save the Markdown content to a temporary file (e.g., `temp.md`)

2. Run the conversion script:
   ```bash
   python scripts/convert.py temp.md
   ```

3. The script will automatically:
   - Select API key by priority (env → skill → trial)
   - Validate the Markdown content
   - Call the conversion API
   - Return results

4. Parse the script output:
   - On success: Extract and provide the download URL
   - Check if trial key was used → show purchase reminder if needed
   - On failure: Extract error message and explain to user

5. Clean up temporary file
