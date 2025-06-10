// Configuration template for Telegram Whitelist Bot
// Copy this file to config.js and fill in your actual values
// NEVER commit config.js to version control!

module.exports = {
    // Telegram Bot Token (get from @BotFather)
    // Example: "1234567890:ABCdefGHijklMNOpqrstUVwxyz"
    BOT_TOKEN: "YOUR_BOT_TOKEN_HERE",

    // Admin User ID (your Telegram user ID)
    // Get from @userinfobot - Example: "123456789"
    ADMIN_USER_ID: "YOUR_ADMIN_USER_ID_HERE",

    // Group/Channel ID where the bot will monitor
    // Get from @getmyid_bot - Example: "-1001234567890"
    GROUP_ID: "YOUR_GROUP_ID_HERE",

    // Bot Settings
    AUTO_KICK_ENABLED: true,
    ALLOW_BOTS: false, // Set to true if you want to allow bots to join
    SEND_WELCOME_MESSAGE: true, // Send welcome message to whitelisted users
    ANNOUNCE_KICKS: true, // Announce kicks in the group (shows restriction is active)
    INSTANT_KICK: true, // Kick immediately without delay (faster protection)
    UNBAN_DELAY: 1000, // Very short delay before unbanning (1 second)
    WHITELIST_FILE: "./data/whitelist.json",
    LOG_FILE: "./data/bot.log",

    // Messages - Customize these as needed
    MESSAGES: {
        WELCOME: "👋 Welcome! You are approved to join this group.",
        KICKED: "🚫 Access denied - group restricted to approved members only",
        RESTRICTION_NOTICE:
            "🔒 This group is restricted. Only approved members can join.",
        ADDED_TO_WHITELIST: "✅ User added to whitelist",
        REMOVED_FROM_WHITELIST: "❌ User removed from whitelist",
        NOT_ADMIN: "⚠️ Only admins can use this command",
        USER_NOT_FOUND: "❌ User not found",
        HELP: `
🤖 *Whitelist Bot Commands:*

**Basic Commands:**
/start - Start the bot
/help - Show this help message

**Admin Commands (private chat only):**
/whitelist - Show current whitelist
/add @username - Add user to whitelist
/remove @username - Remove user from whitelist
/status - Show bot status
/checkpermissions - Check bot permissions
/testmode on|off - Enable/disable debug mode

*Admin commands work in private chat with bot*
        `,
    },
}; 