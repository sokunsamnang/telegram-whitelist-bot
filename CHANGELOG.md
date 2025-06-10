# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

-   Removed sensitive configuration data from repository
-   Added comprehensive .gitignore for security
-   Improved configuration template system

### Documentation

-   Complete rewrite of README.md with comprehensive documentation
-   New detailed SETUP_GUIDE.md with step-by-step instructions
-   Added CONTRIBUTING.md for development guidelines
-   Added proper LICENSE file

### Changed

-   Replaced hardcoded sensitive values with placeholders in config.js
-   Enhanced project structure documentation
-   Improved error handling documentation

## [1.0.0] - 2025-06-10

### Added

-   Initial release of Telegram Whitelist Bot
-   Automatic user kick functionality for non-whitelisted members
-   Admin command system for whitelist management
-   Real-time group monitoring
-   Comprehensive logging system
-   Welcome message functionality
-   Status monitoring and reporting
-   Permission verification system

### Features

-   `/add` command to add users to whitelist
-   `/remove` command to remove users from whitelist
-   `/whitelist` command to view current whitelist
-   `/status` command for bot statistics
-   `/help` command for user assistance
-   Automatic kick with configurable delays
-   JSON-based whitelist storage
-   File-based logging system

### Security

-   Admin-only command restrictions
-   Private chat command enforcement
-   Input validation and sanitization
-   Rate limiting considerations

### Documentation

-   Basic README with installation instructions
-   Configuration examples
-   Command reference guide
-   Troubleshooting section
