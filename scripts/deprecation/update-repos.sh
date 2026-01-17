#!/bin/bash

# =============================================================================
# Deprecation Script for Old Repositories
# =============================================================================
# This script helps you update multiple old repos with deprecation notices
# and optionally archive them on GitHub.
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Git configured with your credentials
#
# Usage:
#   ./update-repos.sh
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Your GitHub username
GITHUB_ORG="ishanjalan"

# The monorepo URL
MONOREPO_URL="https://github.com/${GITHUB_ORG}/Neutron"

# Map of old repo names to their app folder names in the monorepo
# Format: ["RepoName"]="app-folder-name"
declare -A REPOS=(
    ["Smash"]="smash"
    ["Squash"]="squash"
    ["ImageOptimser"]="squish"
    ["Swirl"]="swirl"
)

# Directory where we'll clone repos temporarily
WORK_DIR="/tmp/deprecation-updates"

# -----------------------------------------------------------------------------
# Colors for output
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# -----------------------------------------------------------------------------
# Check Prerequisites
# -----------------------------------------------------------------------------

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed."
        echo "  Install it with: brew install gh"
        echo "  Then authenticate: gh auth login"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated."
        echo "  Run: gh auth login"
        exit 1
    fi
    
    log_success "Prerequisites OK"
}

# -----------------------------------------------------------------------------
# Generate README for a specific repo
# -----------------------------------------------------------------------------

generate_readme() {
    local app_name=$1
    local template_path="$(dirname "$0")/README-TEMPLATE.md"
    
    if [[ ! -f "$template_path" ]]; then
        log_error "Template not found at $template_path"
        exit 1
    fi
    
    # Replace placeholders
    sed "s/{{APP_NAME}}/${app_name}/g" "$template_path"
}

# -----------------------------------------------------------------------------
# Update a single repository
# -----------------------------------------------------------------------------

update_repo() {
    local repo_name=$1
    local app_name=$2
    local repo_url="https://github.com/${GITHUB_ORG}/${repo_name}.git"
    local repo_dir="${WORK_DIR}/${repo_name}"
    
    echo ""
    log_info "Processing ${repo_name}..."
    
    # Clone the repo
    if [[ -d "$repo_dir" ]]; then
        rm -rf "$repo_dir"
    fi
    
    if ! git clone "$repo_url" "$repo_dir" 2>/dev/null; then
        log_warning "Could not clone ${repo_name} - skipping"
        return
    fi
    
    cd "$repo_dir"
    
    # Generate and write the new README
    generate_readme "$app_name" > README.md
    
    # Commit and push
    git add README.md
    
    if git diff --cached --quiet; then
        log_warning "No changes needed for ${repo_name}"
    else
        git commit -m "docs: add deprecation notice

This repository has been deprecated in favor of the Neutron monorepo.
See: ${MONOREPO_URL}"
        
        echo ""
        read -p "  Push changes to ${repo_name}? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push origin main 2>/dev/null || git push origin master 2>/dev/null
            log_success "Pushed deprecation notice to ${repo_name}"
        else
            log_warning "Skipped pushing to ${repo_name}"
        fi
    fi
    
    cd - > /dev/null
}

# -----------------------------------------------------------------------------
# Archive a repository on GitHub
# -----------------------------------------------------------------------------

archive_repo() {
    local repo_name=$1
    local full_repo="${GITHUB_ORG}/${repo_name}"
    
    echo ""
    read -p "Archive ${full_repo} on GitHub? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if gh repo archive "$full_repo" --yes 2>/dev/null; then
            log_success "Archived ${full_repo}"
        else
            log_warning "Could not archive ${full_repo} (may already be archived or not exist)"
        fi
    else
        log_warning "Skipped archiving ${full_repo}"
    fi
}

# -----------------------------------------------------------------------------
# Close open issues with a notice
# -----------------------------------------------------------------------------

close_issues() {
    local repo_name=$1
    local full_repo="${GITHUB_ORG}/${repo_name}"
    
    log_info "Checking for open issues in ${full_repo}..."
    
    local issues=$(gh issue list --repo "$full_repo" --state open --json number --jq '.[].number' 2>/dev/null)
    
    if [[ -z "$issues" ]]; then
        log_info "No open issues found"
        return
    fi
    
    local issue_count=$(echo "$issues" | wc -l | tr -d ' ')
    
    echo ""
    read -p "Close ${issue_count} open issue(s) with deprecation notice? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for issue_num in $issues; do
            gh issue close "$issue_num" \
                --repo "$full_repo" \
                --comment "This repository has been deprecated. Please re-open this issue in the [Neutron monorepo](${MONOREPO_URL}/issues) if it's still relevant. Thank you!" \
                2>/dev/null
            log_success "Closed issue #${issue_num}"
        done
    fi
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

main() {
    echo ""
    echo "=============================================="
    echo "  Repository Deprecation Script"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    
    # Create work directory
    mkdir -p "$WORK_DIR"
    
    echo ""
    echo "This script will:"
    echo "  1. Update README.md with a deprecation notice"
    echo "  2. Optionally close open issues"
    echo "  3. Optionally archive the repository"
    echo ""
    echo "Repositories to process:"
    for repo in "${!REPOS[@]}"; do
        echo "  - ${GITHUB_ORG}/${repo}"
    done
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Process each repository
    for repo_name in "${!REPOS[@]}"; do
        app_name="${REPOS[$repo_name]}"
        
        update_repo "$repo_name" "$app_name"
        close_issues "$repo_name"
        archive_repo "$repo_name"
    done
    
    # Cleanup
    rm -rf "$WORK_DIR"
    
    echo ""
    log_success "Done! All repositories processed."
    echo ""
}

main "$@"
