const TelegramBot = require("node-telegram-bot-api");
const config = require("./config");
const WhitelistManager = require("./utils/whitelist");
const Logger = require("./utils/logger");

// Initialize utilities
const whitelist = new WhitelistManager(config.WHITELIST_FILE);
const logger = new Logger(config.LOG_FILE);

// Create bot instance
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Helper function to check if user is admin
function isAdmin(userId) {
    return userId.toString() === config.ADMIN_USER_ID.toString();
}

// Helper function to get user info
function getUserInfo(user) {
    return `${user.first_name || "Unknown"} (${
        user.username ? "@" + user.username : "no username"
    }) [ID: ${user.id}]`;
}

// Helper function to extract user ID from message
async function getUserIdFromMessage(msg, targetUser) {
    // If it's a reply to a message
    if (msg.reply_to_message && msg.reply_to_message.from) {
        return msg.reply_to_message.from.id;
    }

    // If username is provided (e.g., @username)
    if (targetUser && targetUser.startsWith("@")) {
        const username = targetUser.substring(1);
        try {
            // Try to get user info (this might not work for all users)
            const chat = await bot.getChat("@" + username);
            return chat.id;
        } catch (error) {
            logger.warn(`Could not find user with username: ${username}`);
            return null;
        }
    }

    // If user ID is provided directly
    if (targetUser && !isNaN(targetUser)) {
        return parseInt(targetUser);
    }

    return null;
}

// Helper function to perform user kick with comprehensive logging
async function kickUser(chatId, userId, userInfo, reason = "Not on whitelist") {
    try {
        logger.info(`🚫 Attempting to kick user: ${userInfo}`);
        logger.info(`   Chat ID: ${chatId}`);
        logger.info(`   User ID: ${userId}`);
        logger.info(`   Reason: ${reason}`);

        // Get bot info first
        const botInfo = await bot.getMe();
        logger.info(
            `🤖 Bot performing kick: ${botInfo.username} [ID: ${botInfo.id}]`
        );

        // Check bot permissions
        const botMember = await bot.getChatMember(chatId, botInfo.id);
        logger.info(`🔐 Bot permissions check:`);
        logger.info(`   Status: ${botMember.status}`);
        logger.info(
            `   Can restrict members: ${botMember.can_restrict_members}`
        );

        if (
            !botMember.can_restrict_members &&
            botMember.status !== "administrator"
        ) {
            throw new Error(
                `Bot lacks permission to kick members. Status: ${botMember.status}, Can restrict: ${botMember.can_restrict_members}`
            );
        }

        // Perform the kick
        await bot.banChatMember(chatId, userId);
        logger.success(`✅ Successfully kicked user: ${userInfo}`);

        // Only send kick notification to group if not in silent mode
        if (config.ANNOUNCE_KICKS && !config.SILENT_MODE) {
            try {
                await bot.sendMessage(
                    chatId,
                    `🚫 User was removed (${reason.toLowerCase()})`
                );
            } catch (error) {
                logger.warn("Could not send kick notification to group", {
                    error: error.message,
                });
            }
        }

        // Schedule unban
        setTimeout(async () => {
            try {
                await bot.unbanChatMember(chatId, userId);
                logger.info(`🔓 Unbanned user: ${userInfo}`);
            } catch (error) {
                logger.warn("Could not unban user", {
                    error: error.message,
                });
            }
        }, config.UNBAN_DELAY || 5000);

        // Notify admin
        try {
            await bot.sendMessage(
                config.ADMIN_USER_ID,
                `🚫 *User Kicked*\n\n**User:** ${userInfo}\n**Reason:** ${reason}\n**Chat:** ${chatId}\n**Time:** ${new Date().toISOString()}`,
                { parse_mode: "Markdown" }
            );
        } catch (error) {
            logger.warn("Could not notify admin", {
                error: error.message,
            });
        }

        return true;
    } catch (error) {
        logger.error(`❌ Failed to kick user: ${userInfo}`, {
            error: error.message,
            chatId,
            userId,
            reason,
        });

        // Notify admin of failure
        try {
            await bot.sendMessage(
                config.ADMIN_USER_ID,
                `❌ *KICK FAILED*\n\n**User:** ${userInfo}\n**Error:** ${
                    error.message
                }\n**Chat:** ${chatId}\n**Time:** ${new Date().toISOString()}\n\n*Please check bot permissions!*`,
                { parse_mode: "Markdown" }
            );
        } catch (notifyError) {
            logger.error("Could not notify admin of kick failure", {
                error: notifyError.message,
            });
        }

        return false;
    }
}

// Event: Bot started
bot.on("polling_start", async () => {
    logger.success("🤖 Telegram Whitelist Bot started successfully!");
    logger.info(`📊 Whitelist size: ${whitelist.getSize()} users`);
    logger.info(`⚙️ Auto-kick enabled: ${config.AUTO_KICK_ENABLED}`);

    // Check bot permissions on startup
    try {
        const botInfo = await bot.getMe();
        logger.info(
            `🤖 Bot info: ${botInfo.first_name} (@${botInfo.username})`
        );

        const botMember = await bot.getChatMember(config.GROUP_ID, botInfo.id);

        if (
            botMember.status === "administrator" &&
            botMember.can_restrict_members
        ) {
            logger.success(
                "✅ Bot has proper admin permissions in target group"
            );
        } else {
            logger.error("❌ CRITICAL: Bot lacks required permissions!");
            logger.error(`Bot status: ${botMember.status}`);
            logger.error(
                `Can restrict members: ${botMember.can_restrict_members}`
            );

            // Notify admin immediately
            try {
                await bot.sendMessage(
                    config.ADMIN_USER_ID,
                    `🚨 CRITICAL ERROR: Bot lacks admin permissions!\n\n**Status:** ${
                        botMember.status
                    }\n**Can kick members:** ${
                        botMember.can_restrict_members ? "Yes" : "No"
                    }\n\nPlease add the bot as administrator with "Restrict Members" permission in the target group.`
                );
            } catch (error) {
                logger.error("Could not notify admin of permission issue", {
                    error: error.message,
                });
            }
        }
    } catch (error) {
        logger.error("Error checking bot permissions on startup:", {
            error: error.message,
        });

        try {
            await bot.sendMessage(
                config.ADMIN_USER_ID,
                `❌ Could not verify bot permissions in group ${config.GROUP_ID}\n\nError: ${error.message}\n\nPlease ensure the bot is added to the group.`
            );
        } catch (notifyError) {
            logger.error("Could not notify admin of startup error", {
                error: notifyError.message,
            });
        }
    }
});

// Event: New chat members (someone joined)
bot.on("new_chat_members", async (msg) => {
    const chatId = msg.chat.id.toString();
    const configGroupId = config.GROUP_ID.toString();

    // Debug logging for chat ID comparison
    logger.info(`📍 Join event received:`);
    logger.info(`   Chat ID: ${chatId}`);
    logger.info(`   Config Group ID: ${configGroupId}`);
    logger.info(`   Match: ${chatId === configGroupId}`);

    // Only monitor the configured group
    if (chatId !== configGroupId) {
        logger.info(
            `Ignoring join event from different chat: ${chatId} (expected: ${configGroupId})`
        );
        return;
    }

    logger.success(`✅ Processing join event in monitored group: ${chatId}`);

    for (const newMember of msg.new_chat_members) {
        // Skip bots (except if specifically configured to allow them)
        if (newMember.is_bot && !config.ALLOW_BOTS) {
            logger.info(`Skipping bot: ${getUserInfo(newMember)}`);
            continue;
        }

        const userId = newMember.id;
        const userInfo = getUserInfo(newMember);

        logger.info(`👤 New member joined: ${userInfo}`);

        // Check if user is whitelisted
        if (whitelist.isWhitelisted(userId)) {
            logger.success(`✅ Whitelisted user joined: ${userInfo}`);

            // Send welcome message only if not in silent mode
            if (config.SEND_WELCOME_MESSAGE && !config.SILENT_MODE) {
                try {
                    await bot.sendMessage(
                        chatId,
                        `${config.MESSAGES.WELCOME}\nWelcome ${newMember.first_name}! 🎉`
                    );
                } catch (error) {
                    logger.warn("Could not send welcome message", {
                        error: error.message,
                    });
                }
            }

            // Notify admin about whitelisted user join (optional)
            if (config.NOTIFY_ADMIN_ONLY) {
                try {
                    await bot.sendMessage(
                        config.ADMIN_USER_ID,
                        `✅ *Whitelisted User Joined*\n\n**User:** ${userInfo}\n**Group:** ${
                            msg.chat.title || chatId
                        }\n**Time:** ${new Date().toISOString()}`,
                        { parse_mode: "Markdown" }
                    );
                } catch (error) {
                    logger.warn(
                        "Could not notify admin about whitelisted user",
                        {
                            error: error.message,
                        }
                    );
                }
            }
        } else {
            logger.warn(`⚠️ Non-whitelisted user joined: ${userInfo}`);

            if (config.AUTO_KICK_ENABLED) {
                // Use the new helper function for cleaner code
                await kickUser(chatId, userId, userInfo, "Not on whitelist");
            } else {
                // Just notify admin if auto-kick is disabled
                try {
                    await bot.sendMessage(
                        config.ADMIN_USER_ID,
                        `⚠️ Non-whitelisted user joined (auto-kick disabled):\n${userInfo}\nGroup: ${
                            msg.chat.title || chatId
                        }`
                    );
                } catch (error) {
                    logger.warn("Could not notify admin", {
                        error: error.message,
                    });
                }
            }
        }
    }
});

// Event: Monitor chat member updates (when users are added by admins or when their status changes)
bot.on("chat_member", async (update) => {
    const chatId = update.chat.id.toString();

    // Only monitor the configured group
    if (chatId !== config.GROUP_ID.toString()) {
        return;
    }

    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;

    // Check if someone became a member (was not a member before, now is a member)
    if (
        oldMember.status === "left" &&
        (newMember.status === "member" || newMember.status === "administrator")
    ) {
        const userId = newMember.user.id;
        const userInfo = getUserInfo(newMember.user);

        logger.info(
            `👤 User added to group: ${userInfo} (status: ${newMember.status})`
        );

        // Skip if it's an administrator (they can add themselves)
        if (newMember.status === "administrator") {
            logger.info(
                `👑 Administrator joined, skipping whitelist check: ${userInfo}`
            );
            return;
        }

        // Check whitelist
        if (!whitelist.isWhitelisted(userId)) {
            logger.warn(
                `⚠️ Non-whitelisted user was added to group: ${userInfo}`
            );

            if (config.AUTO_KICK_ENABLED) {
                // Use the helper function for consistency
                await kickUser(
                    chatId,
                    userId,
                    userInfo,
                    "Added by admin but not whitelisted"
                );
            }
        }
    }
});

// Command: /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    logger.info(`🏁 Start command from: ${getUserInfo(msg.from)}`);

    const welcomeMessage = `
🤖 *Telegram Whitelist Bot*

This bot manages access to the group by maintaining a whitelist of approved users.

${isAdmin(userId) ? "👑 *Admin Commands Available*" : ""}

${config.MESSAGES.HELP}
  `;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});

// Command: /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, config.MESSAGES.HELP, {
        parse_mode: "Markdown",
    });
});

// Command: /status (Admin only)
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const statusMessage = `
📊 *Bot Status*

🔘 Auto-kick: ${config.AUTO_KICK_ENABLED ? "✅ Enabled" : "❌ Disabled"}
🔇 Silent mode: ${config.SILENT_MODE ? "✅ Enabled" : "❌ Disabled"}
📢 Group messages: ${config.SILENT_MODE ? "❌ Disabled" : "✅ Enabled"}
👥 Whitelist size: ${whitelist.getSize()} users
🏠 Monitoring group: ${config.GROUP_ID}
⏰ Bot uptime: ${process.uptime().toFixed(0)} seconds

💾 Data files:
• Whitelist: ${config.WHITELIST_FILE}
• Logs: ${config.LOG_FILE}

${
    config.SILENT_MODE
        ? "🔇 Bot is running in silent mode - no group messages"
        : "📢 Bot may send messages to group"
}
  `;

    await bot.sendMessage(chatId, statusMessage, { parse_mode: "Markdown" });
});

// Command: /whitelist (Admin only)
bot.onText(/\/whitelist/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const whitelistUsers = whitelist.getWhitelist();

    if (whitelistUsers.length === 0) {
        await bot.sendMessage(chatId, "📝 Whitelist is empty");
        return;
    }

    const message =
        `📝 *Current Whitelist* (${whitelistUsers.length} users):\n\n` +
        whitelistUsers
            .map((userId, index) => `${index + 1}. \`${userId}\``)
            .join("\n");

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
});

// Command: /checkpermissions (Admin only)
bot.onText(/\/checkpermissions/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    try {
        // Check bot permissions in the target group
        const botMember = await bot.getChatMember(
            config.GROUP_ID,
            bot.options.polling ? "me" : (await bot.getMe()).id
        );

        const permissionsMessage = `
🔐 *Bot Permissions Check*

**Group:** \`${config.GROUP_ID}\`
**Bot Status:** ${botMember.status}

**Permissions:**
${botMember.can_restrict_members ? "✅" : "❌"} Can restrict members (kick/ban)
${botMember.can_delete_messages ? "✅" : "❌"} Can delete messages
${botMember.can_invite_users ? "✅" : "❌"} Can invite users
${botMember.can_promote_members ? "✅" : "❌"} Can promote members

**Status:** ${
            botMember.status === "administrator" &&
            botMember.can_restrict_members
                ? "✅ Ready to protect group"
                : "❌ Missing required permissions"
        }

${
    botMember.status !== "administrator"
        ? "⚠️ Bot must be added as administrator"
        : ""
}
${
    !botMember.can_restrict_members
        ? '⚠️ Bot needs "Restrict Members" permission'
        : ""
}
    `;

        await bot.sendMessage(chatId, permissionsMessage, {
            parse_mode: "Markdown",
        });
    } catch (error) {
        await bot.sendMessage(
            chatId,
            `❌ Error checking permissions: ${error.message}\n\nMake sure the bot is added to the group as an administrator.`
        );
        logger.error("Error checking permissions:", { error: error.message });
    }
});

// Command: /testmode (Admin only) - Enable/disable test mode for debugging
bot.onText(/\/testmode(?:\s+(on|off))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const mode = match[1];

    if (!mode) {
        await bot.sendMessage(
            chatId,
            `Test mode is currently: ${
                global.testMode ? "ON" : "OFF"
            }\n\nUsage: /testmode on|off`
        );
        return;
    }

    global.testMode = mode === "on";
    await bot.sendMessage(
        chatId,
        `🧪 Test mode ${global.testMode ? "ENABLED" : "DISABLED"}\n\n${
            global.testMode
                ? "Bot will send detailed logs for all events."
                : "Normal operation resumed."
        }`
    );
    logger.info(
        `Test mode ${global.testMode ? "enabled" : "disabled"} by admin`
    );
});

// Command: /add (Admin only)
bot.onText(/\/add(?:\s+(@?\w+|\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const targetUser = match[1];
    const targetUserId = await getUserIdFromMessage(msg, targetUser);

    if (!targetUserId) {
        await bot.sendMessage(
            chatId,
            "Usage: /add @username or /add user_id or reply to a message with /add"
        );
        return;
    }

    if (whitelist.addUser(targetUserId)) {
        await bot.sendMessage(
            chatId,
            `${config.MESSAGES.ADDED_TO_WHITELIST}\nUser ID: \`${targetUserId}\``,
            { parse_mode: "Markdown" }
        );
        logger.success(`➕ Added user to whitelist: ${targetUserId}`);
    } else {
        await bot.sendMessage(
            chatId,
            `User \`${targetUserId}\` is already on the whitelist`,
            { parse_mode: "Markdown" }
        );
    }
});

// Command: /remove (Admin only)
bot.onText(/\/remove(?:\s+(@?\w+|\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const targetUser = match[1];
    const targetUserId = await getUserIdFromMessage(msg, targetUser);

    if (!targetUserId) {
        await bot.sendMessage(
            chatId,
            "Usage: /remove @username or /remove user_id or reply to a message with /remove"
        );
        return;
    }

    if (whitelist.removeUser(targetUserId)) {
        await bot.sendMessage(
            chatId,
            `${config.MESSAGES.REMOVED_FROM_WHITELIST}\nUser ID: \`${targetUserId}\``,
            { parse_mode: "Markdown" }
        );
        logger.success(`➖ Removed user from whitelist: ${targetUserId}`);
    } else {
        await bot.sendMessage(
            chatId,
            `User \`${targetUserId}\` is not on the whitelist`,
            { parse_mode: "Markdown" }
        );
    }
});

// Command: /debug (Admin only) - Show debug information
bot.onText(/\/debug/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    try {
        const botInfo = await bot.getMe();
        const debugInfo = `
🔍 *Debug Information*

**Bot Configuration:**
• Bot Username: @${botInfo.username}
• Bot ID: ${botInfo.id}
• Configured Group ID: ${config.GROUP_ID}
• Auto-kick Enabled: ${config.AUTO_KICK_ENABLED ? "✅" : "❌"}
• Silent Mode: ${config.SILENT_MODE ? "✅" : "❌"}
• Send Welcome Messages: ${config.SEND_WELCOME_MESSAGE ? "✅" : "❌"}
• Announce Kicks: ${config.ANNOUNCE_KICKS ? "✅" : "❌"}
• Notify Admin Only: ${config.NOTIFY_ADMIN_ONLY ? "✅" : "❌"}
• Allow Bots: ${config.ALLOW_BOTS ? "✅" : "❌"}
• Test Mode: ${global.testMode ? "✅" : "❌"}

**Whitelist Status:**
• Total Whitelisted Users: ${whitelist.getSize()}
• Your ID: ${userId} ${whitelist.isWhitelisted(userId) ? "✅" : "❌"}

**Timing Settings:**
• Unban Delay: ${config.UNBAN_DELAY}ms
• Instant Kick: ${config.INSTANT_KICK ? "✅" : "❌"}

**Group Message Settings:**
${
    config.SILENT_MODE
        ? "🔇 Silent mode: Bot will NOT send messages to group"
        : "📢 Normal mode: Bot may send messages to group"
}

**Current Time:** ${new Date().toISOString()}
        `;

        await bot.sendMessage(chatId, debugInfo.trim(), {
            parse_mode: "Markdown",
        });
    } catch (error) {
        await bot.sendMessage(
            chatId,
            `❌ Error getting debug info: ${error.message}`
        );
        logger.error("Error in debug command:", { error: error.message });
    }
});

// Command: /silent (Admin only) - Toggle silent mode
bot.onText(/\/silent(?:\s+(on|off))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!isAdmin(userId)) {
        await bot.sendMessage(chatId, config.MESSAGES.NOT_ADMIN);
        return;
    }

    const mode = match[1];

    if (!mode) {
        await bot.sendMessage(
            chatId,
            `🔇 Silent mode is currently: ${
                config.SILENT_MODE ? "ON" : "OFF"
            }\n\n${
                config.SILENT_MODE
                    ? "Bot is NOT sending messages to the group."
                    : "Bot MAY send messages to the group."
            }\n\nUsage: /silent on|off`
        );
        return;
    }

    const newMode = mode === "on";

    // Update config (note: this only affects runtime, not the config file)
    config.SILENT_MODE = newMode;
    config.SEND_WELCOME_MESSAGE = !newMode; // Disable welcome messages in silent mode
    config.ANNOUNCE_KICKS = !newMode; // Disable kick announcements in silent mode

    await bot.sendMessage(
        chatId,
        `🔇 Silent mode ${newMode ? "ENABLED" : "DISABLED"}\n\n${
            newMode
                ? "✅ Bot will NOT send any messages to the group.\n📱 All notifications will be sent to admin only."
                : "⚠️ Bot MAY send messages to the group (welcome messages, kick notifications)."
        }`
    );

    logger.info(`Silent mode ${newMode ? "enabled" : "disabled"} by admin`);
});

// Error handling
bot.on("error", (error) => {
    logger.error("Bot error:", { error: error.message });
});

bot.on("polling_error", (error) => {
    logger.error("Polling error:", { error: error.message });
});

// Graceful shutdown
process.on("SIGINT", () => {
    logger.info("🛑 Bot shutting down...");
    bot.stopPolling();
    process.exit(0);
});

process.on("SIGTERM", () => {
    logger.info("🛑 Bot shutting down...");
    bot.stopPolling();
    process.exit(0);
});
