#!/usr/bin/env python3
"""
Simple md2docx conversion script.
Converts Markdown to DOCX via API.
"""

import os
import sys
import json
import requests

# API Configuration
API_URL = "https://api.deepshare.app/convert-text-to-url"
TRIAL_KEY = "f4e8fe6f-e39e-486f-b7e7-e037d2ec216f"
PURCHASE_URL = "https://ds.rick216.cn/purchase"


def convert_to_docx(content, filename="output", template="templates", language="zh", api_key=None, skill_api_key=None):
    """Convert Markdown to DOCX."""
    
    # Priority 1: Explicit api_key parameter
    # Priority 2: Environment variable
    # Priority 3: Skill variable
    # Priority 4: Trial key
    if not api_key:
        api_key = os.environ.get('DEEP_SHARE_API_KEY')
        if not api_key and skill_api_key:
            api_key = skill_api_key
        if not api_key:
            api_key = TRIAL_KEY
    
    # Check if using trial key
    using_trial = (api_key == TRIAL_KEY)
    
    # Prepare request
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": api_key
    }
    
    payload = {
        "content": content,
        "filename": filename,
        "template_name": template,
        "language": language
    }
    
    # Call API
    try:
        print("Converting Markdown to DOCX...")
        response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        
        # Handle response
        if response.status_code == 200:
            result = response.json()
            url = result.get("url")
            
            print("\n✓ Conversion successful!")
            print(f"\nDownload URL:\n{url}")
            
            if using_trial:
                print(f"\n⚠️  You're using trial mode (limited quota).")
                print(f"For stable production use, get your API key at: {PURCHASE_URL}")
            
            return url
            
        elif response.status_code == 403:
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
            
    except requests.exceptions.Timeout:
        print("\n✗ Request timeout. Please try again.")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"\n✗ Network error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    # Simple command line interface
    if len(sys.argv) < 2:
        print("Usage: python convert.py <markdown_file> [template] [language] [api_key]")
        print("\nExample:")
        print("  python convert.py document.md")
        print("  python convert.py paper.md 论文 zh")
        print("  python convert.py doc.md templates en your_api_key")
        sys.exit(1)
    
    # Read Markdown file
    input_file = sys.argv[1]
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    # Get filename from input
    filename = os.path.splitext(os.path.basename(input_file))[0]
    
    # Get optional parameters
    template = sys.argv[2] if len(sys.argv) > 2 else "templates"
    language = sys.argv[3] if len(sys.argv) > 3 else "zh"
    api_key = sys.argv[4] if len(sys.argv) > 4 else None
    
    # Get skill_api_key from environment (set by Skill when invoked from Claude)
    skill_api_key = os.environ.get('SKILL_API_KEY')
    
    # Convert
    convert_to_docx(content, filename, template, language, api_key, skill_api_key)
