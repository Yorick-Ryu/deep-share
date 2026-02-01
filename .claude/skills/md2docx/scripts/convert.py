#!/usr/bin/env python3
"""
Simple md2docx conversion script.
Converts Markdown to DOCX via API.

Supports two modes:
- URL mode (--url): Returns download URL, for cloud/remote environments
- File mode (--file): Downloads file directly, for local environments
"""

import os
import sys
import argparse
import requests

# API Configuration
API_BASE = "https://api.deepshare.app"
API_URL_TO_URL = f"{API_BASE}/convert-text-to-url"  # Returns URL
API_URL_TO_FILE = f"{API_BASE}/convert-text"        # Returns file directly
TRIAL_KEY = "f4e8fe6f-e39e-486f-b7e7-e037d2ec216f"
PURCHASE_URL = "https://ds.rick216.cn/purchase"


def get_api_key(explicit_key=None, skill_api_key=None):
    """Get API key by priority: explicit > env > skill > trial."""
    if explicit_key:
        return explicit_key, False
    
    env_key = os.environ.get('DEEP_SHARE_API_KEY')
    if env_key:
        return env_key, False
    
    if skill_api_key:
        return skill_api_key, False
    
    return TRIAL_KEY, True


def handle_error_response(response):
    """Handle error responses from API."""
    if response.status_code == 403:
        print("\n✗ Conversion failed: Quota exceeded")
        print(f"\nYour account has run out of credits.")
        print(f"Purchase more at: {PURCHASE_URL}")
        sys.exit(1)
    elif response.status_code == 401:
        print("\n✗ Conversion failed: Invalid API key")
        print(f"\nGet a valid API key at: {PURCHASE_URL}")
        sys.exit(1)
    elif response.status_code == 413:
        print("\n✗ Conversion failed: Content too large")
        print("\nMaximum size is 10MB. Please reduce content size.")
        sys.exit(1)
    else:
        print(f"\n✗ Conversion failed: {response.status_code}")
        try:
            detail = response.json().get("detail", "Unknown error")
            print(f"Error: {detail}")
        except:
            print(f"Error: {response.text}")
        sys.exit(1)


def convert_to_url(content, filename="output", template="templates", language="zh", 
                   api_key=None, skill_api_key=None):
    """
    Convert Markdown to DOCX and return download URL.
    Use this when:
    - Skill runs in cloud environment
    - User needs to access file from a different machine
    """
    key, using_trial = get_api_key(api_key, skill_api_key)
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": key
    }
    
    payload = {
        "content": content,
        "filename": filename,
        "template_name": template,
        "language": language
    }
    
    try:
        print("Converting Markdown to DOCX (URL mode)...")
        response = requests.post(API_URL_TO_URL, json=payload, headers=headers, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            url = result.get("url")
            
            print("\n✓ Conversion successful!")
            print(f"\nDownload URL:\n{url}")
            
            if using_trial:
                print(f"\n⚠️  You're using trial mode (limited quota).")
                print(f"For stable production use, get your API key at: {PURCHASE_URL}")
            
            return {"mode": "url", "url": url, "using_trial": using_trial}
        else:
            handle_error_response(response)
            
    except requests.exceptions.Timeout:
        print("\n✗ Request timeout. Please try again.")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Network error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)


def convert_to_file(content, filename="output", template="templates", language="zh",
                    output_dir=None, api_key=None, skill_api_key=None):
    """
    Convert Markdown to DOCX and save file directly.
    Use this when:
    - Skill runs locally
    - User wants to save file in the current environment
    """
    key, using_trial = get_api_key(api_key, skill_api_key)
    
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": key
    }
    
    payload = {
        "content": content,
        "filename": filename,
        "template_name": template,
        "language": language
    }
    
    try:
        print("Converting Markdown to DOCX (file mode)...")
        response = requests.post(API_URL_TO_FILE, json=payload, headers=headers, timeout=60)
        
        if response.status_code == 200:
            # Determine output path
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                output_path = os.path.join(output_dir, f"{filename}.docx")
            else:
                output_path = f"{filename}.docx"
            
            # Save file
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            abs_path = os.path.abspath(output_path)
            print("\n✓ Conversion successful!")
            print(f"\nFile saved to:\n{abs_path}")
            
            if using_trial:
                print(f"\n⚠️  You're using trial mode (limited quota).")
                print(f"For stable production use, get your API key at: {PURCHASE_URL}")
            
            return {"mode": "file", "path": abs_path, "using_trial": using_trial}
        else:
            handle_error_response(response)
            
    except requests.exceptions.Timeout:
        print("\n✗ Request timeout. Please try again.")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Network error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Convert Markdown to Word (DOCX)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Return download URL (for cloud environments)
  python convert.py input.md --url
  
  # Save file directly (for local environments)  
  python convert.py input.md --file
  python convert.py input.md --file --output ./docs
  
  # With template and language
  python convert.py paper.md --file --template 论文 --language zh
  
  # With custom API key
  python convert.py doc.md --url --api-key your_key
"""
    )
    
    parser.add_argument("input", help="Input Markdown file")
    
    # Mode selection (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument("--url", action="store_true", 
                           help="Return download URL (for cloud/remote access)")
    mode_group.add_argument("--file", action="store_true",
                           help="Save file directly (for local use)")
    
    # Optional parameters
    parser.add_argument("--template", "-t", default="templates",
                       help="Template name (default: templates)")
    parser.add_argument("--language", "-l", default="zh",
                       help="Language: zh or en (default: zh)")
    parser.add_argument("--output", "-o", default=None,
                       help="Output directory for file mode")
    parser.add_argument("--api-key", "-k", default=None,
                       help="API key (optional, uses env/trial if not provided)")
    
    args = parser.parse_args()
    
    # Read input file
    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {args.input}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Get filename from input
    filename = os.path.splitext(os.path.basename(args.input))[0]
    
    # Get skill_api_key from environment (set by Skill when invoked)
    skill_api_key = os.environ.get('SKILL_API_KEY')
    
    # Determine mode (default to URL if not specified)
    if args.file:
        convert_to_file(
            content=content,
            filename=filename,
            template=args.template,
            language=args.language,
            output_dir=args.output,
            api_key=args.api_key,
            skill_api_key=skill_api_key
        )
    else:
        # Default to URL mode (--url or no flag)
        convert_to_url(
            content=content,
            filename=filename,
            template=args.template,
            language=args.language,
            api_key=args.api_key,
            skill_api_key=skill_api_key
        )


if __name__ == '__main__':
    main()
