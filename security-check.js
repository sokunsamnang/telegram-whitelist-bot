#!/usr/bin/env node

/**
 * Security Check Script for Telegram Whitelist Bot
 * Prevents accidental commits of sensitive configuration data
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Running security check...\n');

const checks = [
    {
        name: 'Config file protection',
        check: () => {
            // Check if config.js exists and is properly protected
            if (fs.existsSync('config.js')) {
                console.log('⚠️  config.js exists - ensure it\'s in .gitignore');
                
                // Check if it contains placeholder values
                const configContent = fs.readFileSync('config.js', 'utf8');
                if (configContent.includes('your_bot_token_here') || 
                    configContent.includes('YOUR_BOT_TOKEN_HERE')) {
                    console.log('✅ Config contains placeholder values');
                    return true;
                } else {
                    console.log('❌ Config may contain real tokens!');
                    return false;
                }
            } else {
                console.log('✅ config.js not found (good - use config.example.js)');
                return true;
            }
        }
    },
    {
        name: 'GitIgnore verification',
        check: () => {
            if (!fs.existsSync('.gitignore')) {
                console.log('❌ .gitignore not found!');
                return false;
            }
            
            const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
            const requiredEntries = ['config.js', '.env', 'data/', '*.log'];
            
            let allFound = true;
            requiredEntries.forEach(entry => {
                if (!gitignoreContent.includes(entry)) {
                    console.log(`❌ Missing in .gitignore: ${entry}`);
                    allFound = false;
                } else {
                    console.log(`✅ Protected: ${entry}`);
                }
            });
            
            return allFound;
        }
    },
    {
        name: 'Example config verification',
        check: () => {
            if (!fs.existsSync('config.example.js')) {
                console.log('❌ config.example.js not found!');
                return false;
            }
            
            const exampleContent = fs.readFileSync('config.example.js', 'utf8');
            if (exampleContent.includes('YOUR_BOT_TOKEN_HERE') || 
                exampleContent.includes('YOUR_ADMIN_USER_ID_HERE')) {
                console.log('✅ config.example.js contains safe placeholders');
                return true;
            } else {
                console.log('❌ config.example.js may contain real values!');
                return false;
            }
        }
    },
    {
        name: 'Data directory protection',
        check: () => {
            if (fs.existsSync('data/')) {
                console.log('⚠️  data/ directory exists - ensure it\'s in .gitignore');
            } else {
                console.log('✅ data/ directory not found (will be created at runtime)');
            }
            return true;
        }
    },
    {
        name: 'Environment variables check',
        check: () => {
            const envVars = ['BOT_TOKEN', 'ADMIN_USER_ID', 'GROUP_ID'];
            let hasEnvVars = false;
            
            envVars.forEach(varName => {
                if (process.env[varName]) {
                    console.log(`✅ Environment variable ${varName} is set`);
                    hasEnvVars = true;
                }
            });
            
            if (!hasEnvVars) {
                console.log('ℹ️  No environment variables set (will use config.js)');
            }
            
            return true;
        }
    }
];

let allPassed = true;

checks.forEach((check, index) => {
    console.log(`\n${index + 1}. ${check.name}:`);
    const passed = check.check();
    if (!passed) {
        allPassed = false;
    }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
    console.log('🎉 All security checks passed!');
    console.log('✅ Your repository is safe to push to GitHub');
    process.exit(0);
} else {
    console.log('⚠️  Some security checks failed!');
    console.log('❌ Please fix the issues before pushing to GitHub');
    console.log('\n💡 Quick fixes:');
    console.log('   - Ensure config.js is in .gitignore');
    console.log('   - Use config.example.js with placeholder values');
    console.log('   - Never commit real tokens or IDs');
    process.exit(1);
} 