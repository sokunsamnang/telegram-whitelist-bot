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

    // Only monitor the configured group
    if (chatId !== config.GROUP_ID.toString()) {
        logger.info(`Ignoring join event from different chat: ${chatId}`);
        return;
    }

    logger.info(`New member event in monitored group: ${chatId}`);

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

            // Send welcome message (optional)
            if (config.SEND_WELCOME_MESSAGE) {
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
        } else {
            logger.warn(`⚠️ Non-whitelisted user joined: ${userInfo}`);

            if (config.AUTO_KICK_ENABLED) {
                let chatMember = null;

                try {
                    // Get bot info to get the bot's user ID
                    const botInfo = await bot.getMe();
                    logger.info(
                        `🤖 Bot info: ${botInfo.username} [ID: ${botInfo.id}]`
                    );
                    logger.info(`📍 Checking permissions in chat: ${chatId}`);

                    // First check if bot has proper permissions
                    const chatMember = await bot.getChatMember(
                        chatId,
                        botInfo.id
                    );

                    // Check if bot has permission to kick users
                    if (
                        !chatMember.can_restrict_members &&
                        chatMember.status !== "administrator"
                    ) {
                        logger.error(
                            "❌ Bot does not have admin permissions to kick members!"
                        );
                        await bot.sendMessage(
                            config.ADMIN_USER_ID,
                            `❌ CRITICAL: Bot lacks admin permissions in group ${chatId}!\nCannot kick user: ${userInfo}`
                        );
                        return;
                    }

                    // Kick the user immediately
                    await bot.banChatMember(chatId, userId);
                    logger.success(
                        `🚫 Kicked non-whitelisted user: ${userInfo}`
                    );

                    // Send notification to group about the kick
                    if (config.ANNOUNCE_KICKS) {
                        try {
                            await bot.sendMessage(
                                chatId,
                                `🚫 User ${newMember.first_name} was removed (not authorized)`
                            );
                        } catch (error) {
                            logger.warn("Could not send kick notification", {
                                error: error.message,
                            });
                        }
                    }

                    // Unban after a delay so they can try to join again if added to whitelist
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
                            `🚫 Automatically kicked user:\n${userInfo}\n\nReason: Not on whitelist\nGroup: ${
                                msg.chat.title || chatId
                            }`
                        );
                    } catch (error) {
                        logger.warn("Could not notify admin", {
                            error: error.message,
                        });
                    }
                } catch (error) {
                    // Handle both permission check errors and kick operation errors
                    if (error.message.includes("invalid user_id specified")) {
                        logger.error(
                            `❌ Error checking permissions: Invalid chat ID or bot not in chat: ${chatId}`,
                            {
                                error: error.message,
                            }
                        );
                    } else if (error.message.includes("getChatMember")) {
                        logger.error(`❌ Error checking permissions:`, {
                            error: error.message,
                        });
                    } else {
                        logger.error(`❌ Failed to kick user: ${userInfo}`, {
                            error: error.message,
                        });
                    }

                    // Critical error - notify admin immediately
                    try {
                        await bot.sendMessage(
                            config.ADMIN_USER_ID,
                            `❌ CRITICAL ERROR: Failed to kick user!\n${userInfo}\nError: ${error.message}\n\nPlease check bot permissions!`
                        );
                    } catch (notifyError) {
                        logger.error("Could not notify admin of kick failure", {
                            error: notifyError.message,
                        });
                    }
                }
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
                try {
                    await bot.banChatMember(chatId, userId);
                    logger.success(
                        `🚫 Kicked non-whitelisted user: ${userInfo}`
                    );

                    // Unban after delay
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
                            `🚫 Kicked user added by admin:\n${userInfo}\n\nReason: Not on whitelist\nGroup: ${
                                update.chat.title || chatId
                            }`
                        );
                    } catch (error) {
                        logger.warn("Could not notify admin", {
                            error: error.message,
                        });
                    }
                } catch (error) {
                    logger.error(`❌ Failed to kick user: ${userInfo}`, {
                        error: error.message,
                    });
                }
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
👥 Whitelist size: ${whitelist.getSize()} users
🏠 Monitoring group: ${config.GROUP_ID}
⏰ Bot uptime: ${process.uptime().toFixed(0)} seconds

💾 Data files:
• Whitelist: ${config.WHITELIST_FILE}
• Logs: ${config.LOG_FILE}
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
