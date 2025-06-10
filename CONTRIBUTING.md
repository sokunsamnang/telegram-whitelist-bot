# Contributing to Telegram Whitelist Bot

Thank you for considering contributing to this project! This document provides guidelines for contributing.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v14 or higher)
-   npm or yarn
-   Git
-   A Telegram account for testing

### Setting Up Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork**:
    ```bash
    git clone https://github.com/your-username/telegram-whitelist-bot.git
    cd telegram-whitelist-bot
    ```
3. **Install dependencies**:
    ```bash
    npm install
    ```
4. **Set up configuration**:
    ```bash
    cp config.example.js config.js
    # Edit config.js with your test bot credentials
    ```

## 📋 Development Guidelines

### Code Style

-   Use **ES6+** features where appropriate
-   Follow **camelCase** naming convention
-   Add **JSDoc comments** for functions
-   Keep functions **small and focused**
-   Use **async/await** over promises

### Example Code Style

```javascript
/**
 * Adds a user to the whitelist
 * @param {number} userId - Telegram user ID
 * @param {string} username - Username (optional)
 * @returns {Promise<boolean>} Success status
 */
async function addToWhitelist(userId, username = null) {
    try {
        const whitelist = await loadWhitelist();
        // Implementation here
        return true;
    } catch (error) {
        logger.error("Failed to add user to whitelist:", error);
        return false;
    }
}
```

### File Structure

```
telegram-whitelist-bot/
├── bot.js                 # Main bot logic
├── config.example.js      # Configuration template
├── package.json          # Dependencies
├── utils/
│   ├── whitelist.js      # Whitelist management
│   ├── logger.js         # Logging utilities
│   └── permissions.js    # Permission checking
├── tests/                # Test files
├── docs/                 # Documentation
└── examples/             # Usage examples
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "whitelist"

# Run tests with coverage
npm run test:coverage
```

### Test Structure

-   Place tests in `tests/` directory
-   Name test files with `.test.js` suffix
-   Use descriptive test names
-   Mock external dependencies (Telegram API)

### Example Test

```javascript
const { expect } = require("chai");
const { addToWhitelist } = require("../utils/whitelist");

describe("Whitelist Management", () => {
    it("should add user to whitelist successfully", async () => {
        const result = await addToWhitelist(123456789, "testuser");
        expect(result).to.be.true;
    });
});
```

## 🐛 Bug Reports

### Before Reporting

1. **Check existing issues** to avoid duplicates
2. **Update to latest version** and test again
3. **Check logs** for detailed error messages
4. **Test with minimal configuration**

### Bug Report Template

````markdown
**Bug Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Configure bot with...
2. Run command...
3. See error...

**Expected Behavior**
What you expected to happen.

**Environment**

-   OS: [e.g., macOS, Ubuntu]
-   Node.js version: [e.g., v16.14.0]
-   Bot version: [e.g., v1.0.0]

**Logs**

```bash
# Paste relevant log entries here
```
````

**Configuration**

```javascript
// Paste config (remove sensitive data)
```

````

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Explain why this feature would be useful.

**Proposed Implementation**
If you have ideas about how to implement this feature.

**Alternatives Considered**
Other solutions you've considered.
````

## 🔧 Pull Requests

### Before Submitting

1. **Create an issue** to discuss the change
2. **Test your changes** thoroughly
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Follow code style** guidelines

### PR Template

```markdown
**Description**
Brief description of changes made.

**Related Issue**
Fixes #[issue number]

**Changes Made**

-   [ ] Added feature X
-   [ ] Fixed bug Y
-   [ ] Updated documentation

**Testing**

-   [ ] Tests pass locally
-   [ ] Tested with real Telegram bot
-   [ ] Added new tests if applicable

**Checklist**

-   [ ] Code follows project style
-   [ ] Self-review completed
-   [ ] Documentation updated
-   [ ] No sensitive data exposed
```

### Commit Messages

Use conventional commit format:

```
type(scope): description

feat(whitelist): add bulk import functionality
fix(bot): handle rate limiting properly
docs(readme): update installation instructions
test(utils): add whitelist validation tests
```

## 🔐 Security Considerations

### Sensitive Data

-   **Never commit** real bot tokens or IDs
-   **Use config.example.js** for examples
-   **Test with dummy data** when possible
-   **Review PRs** for sensitive information

### Security Best Practices

-   Validate all user input
-   Use rate limiting for commands
-   Implement proper error handling
-   Log security events
-   Keep dependencies updated

## 📚 Documentation

### What to Document

-   **New features** - usage and examples
-   **API changes** - breaking changes
-   **Configuration** - new options
-   **Setup instructions** - step-by-step guides

### Documentation Style

-   Use **clear, simple language**
-   Include **code examples**
-   Add **screenshots** where helpful
-   Keep **up to date** with code changes

## 🎯 Priority Areas

We're especially looking for contributions in:

1. **Testing** - Unit and integration tests
2. **Documentation** - User guides and API docs
3. **Error Handling** - Better error messages and recovery
4. **Performance** - Optimization and monitoring
5. **Features** - New whitelist management features

## 📞 Getting Help

If you need help:

1. **Check documentation** first
2. **Search existing issues**
3. **Ask in discussions** tab
4. **Create a new issue** with details

## 📜 Code of Conduct

### Our Standards

-   **Be respectful** and inclusive
-   **Be constructive** in feedback
-   **Focus on the code**, not the person
-   **Help others learn** and improve

### Enforcement

Violations may result in:

-   Warning
-   Temporary ban
-   Permanent ban

Report issues to project maintainers.

## 🏆 Recognition

Contributors will be:

-   **Listed in README.md**
-   **Mentioned in release notes**
-   **Invited to be maintainers** (for significant contributions)

Thank you for helping make this project better! 🙏
