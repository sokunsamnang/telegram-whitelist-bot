# 🔒 GitHub Setup Guide

This guide helps you safely prepare your Telegram Whitelist Bot repository for GitHub while protecting sensitive information.

## 🚨 CRITICAL: Before Pushing to GitHub

**NEVER commit real credentials to GitHub!** Follow these steps exactly:

### 1. Clean Your Repository

```bash
# Remove config.js if it contains real credentials
rm config.js

# Ensure .gitignore is protecting sensitive files
cat .gitignore | grep -E "(config.js|\.env|data/)"
```

### 2. Run Security Check

```bash
# This will verify your repo is safe to push
npm run security-check
```

### 3. Verify Protected Files

These files should NEVER be committed:

-   ❌ `config.js` (contains real tokens)
-   ❌ `.env` (contains real environment variables)
-   ❌ `data/` directory (contains logs and whitelist)
-   ❌ `*.log` files

These files are SAFE to commit:

-   ✅ `config.example.js` (template with placeholders)
-   ✅ `.env.example` (template with placeholders)
-   ✅ `.gitignore` (protects sensitive files)
-   ✅ All other project files

### 4. Update Repository URLs

Before publishing, update these placeholder URLs with your actual GitHub username:

1. **README.md badges**: Replace `sokunsamnang` with your GitHub username
2. **package.json**: Update repository URLs
3. **Clone commands**: Update throughout documentation

## 🔄 Safe Workflow

### For Contributors

1. **Clone the repository**

    ```bash
    git clone https://github.com/sokunsamnang/telegram-whitelist-bot.git
    cd telegram-whitelist-bot
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Run setup wizard**

    ```bash
    npm run setup
    # Follow prompts to configure bot and auto-create data files
    ```

4. **Verify security before committing**
    ```bash
    npm run security-check
    ```

### For Repository Owner

1. **Before each push**

    ```bash
    # Always run security check
    npm run security-check

    # Verify no sensitive files are staged
    git status
    git diff --cached
    ```

2. **Safe to commit**
    ```bash
    git add .
    git commit -m "Your commit message"
    git push origin main
    ```

## 🛡️ Security Features

### Automatic Protection

-   **.gitignore**: Prevents accidental commits of sensitive files
-   **security-check.js**: Validates repository safety before push
-   **Example files**: Provide safe templates for configuration

### Manual Verification

```bash
# Check what files will be committed
git status

# Check if any sensitive data is staged
git diff --cached

# Verify .gitignore is working
git check-ignore config.js .env data/
# Should output the file paths (meaning they're ignored)
```

## 🚨 Emergency: If You Accidentally Commit Secrets

If you accidentally commit sensitive data:

1. **Stop immediately** - Don't push if not yet pushed
2. **Remove from git history**:

    ```bash
    # Remove file from last commit
    git reset HEAD~1 -- config.js
    git commit --amend

    # For pushed commits, you may need to rewrite history
    # WARNING: This can break things for collaborators
    git filter-branch --force --index-filter \
      'git rm --cached --ignore-unmatch config.js' \
      --prune-empty --tag-name-filter cat -- --all
    ```

3. **Regenerate all tokens** - Assume compromised
4. **Force push** (if already pushed):
    ```bash
    git push --force-with-lease origin main
    ```

## ✅ Quick Checklist

Before pushing to GitHub:

-   [ ] `npm run security-check` passes
-   [ ] No real tokens in any committed files
-   [ ] `config.js` and `.env` are in .gitignore
-   [ ] Only example files with placeholders are committed
-   [ ] Repository URLs updated with your username
-   [ ] All sensitive data is in ignored files

---

**Remember**: When in doubt, run `npm run security-check` - it's designed to catch common security issues before they become problems!
