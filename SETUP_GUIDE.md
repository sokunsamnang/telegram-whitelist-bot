# 📋 Complete Setup Guide: Telegram Whitelist Bot

This guide will walk you through setting up your Telegram Whitelist Bot from start to finish.

## 🚀 Prerequisites

Before starting, make sure you have:

-   Node.js (v14 or higher) installed
-   A Telegram account
-   Admin access to the group you want to protect
-   10-15 minutes to complete setup

## 📝 Step 1: Initial Configuration

### 1.1 Get Your Bot Token

1. **Message [@BotFather](https://t.me/BotFather)** on Telegram
2. **Send** `/newbot`
3. **Choose a name** for your bot (e.g., "My Group Guard Bot")
4. **Choose a username** ending in "bot" (e.g., "mygroup_guard_bot")
5. **Copy the token** that BotFather gives you (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 1.2 Get Your User ID

1. **Message [@userinfobot](https://t.me/userinfobot)** on Telegram
2. **Copy your user ID** from the response (a number like `123456789`)

### 1.3 Get Your Group ID

1. **Add [@getmyid_bot](https://t.me/getmyid_bot)** to your group temporarily
2. **Copy the group ID** from the bot's message (looks like `-1001234567890`)
3. **Remove @getmyid_bot** from your group

### 1.4 Configure the Bot

1. **Copy the example config**:

    ```bash
    cp config.example.js config.js
    ```

2. **Edit `config.js`** with your values:
    ```javascript
    module.exports = {
        BOT_TOKEN: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz", // Your bot token
        ADMIN_USER_ID: "123456789", // Your user ID
        GROUP_ID: "-1001234567890", // Your group ID
        // ... keep other settings as they are
    };
    ```

## 🤖 Step 2: Add Bot to Your Group

### 2.1 Add the Bot

1. **Open Telegram** and go to your private group
2. **Tap the group name** at the top to open group info
3. **Tap "Add Member"** or "Subscribers"
4. **Search for your bot**: `@YourBotUsername` (replace with your actual bot username)
5. **Add the bot** to the group

### 2.2 Make Bot Administrator

1. **Go to group settings** (tap group name → ⚙️ Settings)
2. **Tap "Administrators"**
3. **Find your bot** in the list: `@YourBotUsername`
4. **Tap the bot** to edit permissions
5. **Enable these permissions**:
    - ✅ **Delete Messages**
    - ✅ **Ban Users** (or "Restrict Members")
    - ✅ **Add New Admins** (optional)
6. **Save the changes**

## 🔍 Step 3: Verify Setup

### 3.1 Install Dependencies

```bash
npm install
```

### 3.2 Test Bot Connection

```bash
npm start
```

You should see:

-   ✅ Bot connected successfully
-   ✅ Monitoring group: [Your Group Name]
-   ✅ Admin: [Your Username]

## 🛡️ Step 4: Start Protection

### 4.1 Add Yourself to Whitelist

1. **Message your bot privately** (not in the group)
2. **Send**: `/add your_user_id_here` (replace with your actual user ID)
3. **You should get**: ✅ User added to whitelist

### 4.2 Test the Protection

1. **Create a test account** or ask a friend to help
2. **Try joining your group** with the non-whitelisted account
3. **The bot should**:
    - Kick the user immediately
    - Send a notification to you
    - Log the action

## 📊 Step 5: Managing Your Whitelist

### Common Commands (Private chat with bot only):

```bash
# View current whitelist
/whitelist

# Add user by username
/add @username

# Add user by ID
/add 123456789

# Remove user
/remove @username
/remove 123456789

# Check bot status
/status

# Get help
/help
```

### Adding Users in Bulk

If you have existing group members to whitelist:

1. **Get their user IDs** using [@userinfobot](https://t.me/userinfobot)
2. **Add each one**:
    ```
    /add 111111111
    /add 222222222
    /add 333333333
    ```

## 🔧 Advanced Configuration

### Customizing Messages

Edit `config.js` to customize bot messages:

```javascript
MESSAGES: {
    WELCOME: "🎉 Welcome to our exclusive group!",
    KICKED: "⚠️ Access denied - group restricted to approved members",
    RESTRICTION_NOTICE: "🔒 This group is restricted to approved members only.",
    // ... other messages
}
```

### Bot Settings

Adjust behavior in `config.js`:

```javascript
// Bot Settings
AUTO_KICK_ENABLED: true,           // Enable/disable auto-kick
ALLOW_BOTS: false,                 // Allow other bots to join
SEND_WELCOME_MESSAGE: true,        // Welcome whitelisted users
ANNOUNCE_KICKS: true,              // Announce kicks in group
INSTANT_KICK: true,                // Kick immediately vs delay
UNBAN_DELAY: 1000,                // Delay before unbanning (ms)
```

## 🚨 Troubleshooting

### Bot Not Kicking Users

**Check:**

-   ✅ Bot is administrator in the group
-   ✅ Bot has "Ban Users" or "Restrict Members" permission
-   ✅ `AUTO_KICK_ENABLED` is `true` in config
-   ✅ Group ID is correct in config

**Solution:**

```bash
# Check bot permissions
/checkpermissions
```

### Commands Not Working

**Check:**

-   ✅ Using commands in **private chat** with bot (not in group)
-   ✅ Your user ID matches `ADMIN_USER_ID` in config
-   ✅ Bot is running (`npm start`)

### Bot Not Responding

**Check:**

-   ✅ Bot token is correct
-   ✅ No error messages in terminal
-   ✅ Internet connection stable

**Restart bot:**

```bash
# Stop with Ctrl+C, then restart
npm start
```

### Group ID Issues

**Get correct group ID:**

1. Add [@getmyid_bot](https://t.me/getmyid_bot) to group
2. Copy the group ID (starts with `-100`)
3. Remove @getmyid_bot from group
4. Update `GROUP_ID` in config.js

## 📋 Maintenance

### Regular Tasks

1. **Monitor logs**:

    ```bash
    tail -f ./data/bot.log
    ```

2. **Check whitelist size**:

    ```
    /status
    ```

3. **Review kicked users**:
    - Check logs for patterns
    - Add legitimate users to whitelist

### Backup Your Data

```bash
# Backup whitelist
cp ./data/whitelist.json ./backup-whitelist.json

# Backup logs
cp ./data/bot.log ./backup-bot.log
```

## 🔐 Security Best Practices

1. **Keep config.js private** - never commit to git
2. **Regular whitelist reviews** - remove inactive users
3. **Monitor logs** - watch for suspicious activity
4. **Backup data** - save whitelist regularly
5. **Update dependencies** - keep packages current

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**: `tail -f ./data/bot.log`
2. **Verify config**: Double-check all IDs and tokens
3. **Test permissions**: Use `/checkpermissions` command
4. **Restart bot**: Stop with Ctrl+C and restart with `npm start`

### Common Error Messages

**"Chat not found"** → Wrong group ID
**"Unauthorized"** → Wrong bot token  
**"Insufficient rights"** → Bot needs admin permissions
**"User not found"** → Wrong admin user ID

---

## ✅ Quick Checklist

Before going live, ensure:

-   [ ] Bot token configured
-   [ ] Admin user ID configured
-   [ ] Group ID configured
-   [ ] Bot added to group
-   [ ] Bot is administrator
-   [ ] Bot has ban/restrict permissions
-   [ ] Dependencies installed (`npm install`)
-   [ ] Bot starts without errors (`npm start`)
-   [ ] Admin commands work in private chat
-   [ ] Test user gets kicked when not whitelisted
-   [ ] Whitelist commands work (`/add`, `/remove`)

🎉 **Your group is now protected!** The bot will automatically kick non-whitelisted users.

---

_Need more help? Check the main README.md or create an issue on GitHub._
