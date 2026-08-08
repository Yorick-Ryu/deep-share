#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

command -v jq >/dev/null 2>&1 || {
    echo "Error: jq is required to read manifest.json" >&2
    exit 1
}

command -v zip >/dev/null 2>&1 || {
    echo "Error: zip is required to create the package" >&2
    exit 1
}

command -v unzip >/dev/null 2>&1 || {
    echo "Error: unzip is required to validate the package" >&2
    exit 1
}

name="DeepShare"
version="$(jq -er '.version' manifest.json)"
zip_file="${name}-${version}.zip"
build_dir="build"

cleanup() {
    rm -rf "$build_dir"
}
trap cleanup EXIT

# Files and directories to be included in the package
include_files=(
    "_locales"
    "background.js"
    "icons"
    "lib"
    "onboarding"
    "manifest.json"
    "popup"
    "scripts"
    "styles"
)

# Clean up previous build
cleanup
rm -f "$zip_file"

# Create build directory
mkdir -p "$build_dir"

# Copy files to build directory
for item in "${include_files[@]}"; do
    if [[ ! -e "$item" ]]; then
        echo "Error: required package item is missing: $item" >&2
        exit 1
    fi

    cp -r "$item" "$build_dir/"
done

# Create zip file
(cd "$build_dir" && zip -r "../$zip_file" .)

# Validate that every local file referenced by the manifest exists in the
# archive with exactly the same casing. This matters on case-insensitive macOS
# filesystems because extension stores validate archive paths case-sensitively.
while IFS= read -r manifest_reference; do
    reference_found=false

    while IFS= read -r archive_entry; do
        if [[ "$archive_entry" == "$manifest_reference" ]]; then
            reference_found=true
            break
        fi
    done < <(unzip -Z1 "$zip_file")

    if [[ "$reference_found" != true ]]; then
        echo "Error: manifest reference is missing or has different casing: $manifest_reference" >&2
        exit 1
    fi
done < <(
    jq -r '
        .background.service_worker?,
        .action.default_popup?,
        .side_panel.default_path?,
        (.icons[]?),
        (.action.default_icon[]?),
        (.content_scripts[]? | .js[]?, .css[]?),
        (.web_accessible_resources[]?.resources[]?)
        | select(type == "string")
    ' manifest.json
)

echo "Package created: $zip_file"
