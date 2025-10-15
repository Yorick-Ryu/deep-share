#!/bin/bash

# Read extension name and version from manifest.json
name=$(grep '"name"' manifest.json | head -n 1 | cut -d '"' -f 4 | sed 's/__MSG_extensionName__//g')
name="DeepShare-Firefox"
version=$(grep '"version"' manifest.json | head -n 1 | cut -d '"' -f 4)
zip_file="${name}-${version}.zip"
build_dir="build"

# Files and directories to be included in the package
include_files=(
    "_locales"
    "background.js"
    "icons"
    "lib"
    "manifest.json"
    "popup"
    "scripts"
)

# Clean up previous build
rm -rf "$build_dir"
rm -f "$zip_file"

# Create build directory
mkdir -p "$build_dir"

# Copy files to build directory
for item in "${include_files[@]}"; do
    cp -r "$item" "$build_dir/"
done

# Create zip file
(cd "$build_dir" && zip -r "../$zip_file" .)

# Clean up build directory
rm -rf "$build_dir"

echo "Package created: $zip_file"
