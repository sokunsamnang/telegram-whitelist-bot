const fs = require("fs");
const path = require("path");

class WhitelistManager {
    constructor(filePath = "./data/whitelist.json") {
        this.filePath = filePath;
        this.whitelist = new Set();
        this.ensureDataDirectory();
        this.loadWhitelist();
    }

    ensureDataDirectory() {
        const dataDir = path.dirname(this.filePath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    loadWhitelist() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, "utf8");
                const parsed = JSON.parse(data);

                // Handle both old format (array) and new format (object with metadata)
                if (Array.isArray(parsed)) {
                    // Old format - just an array of user IDs
                    this.whitelist = new Set(parsed);
                } else if (parsed && Array.isArray(parsed.users)) {
                    // New format - object with users array and metadata
                    this.whitelist = new Set(parsed.users);
                } else {
                    throw new Error("Invalid whitelist format");
                }

                console.log(
                    `✅ Loaded ${this.whitelist.size} users from whitelist`
                );
            } else {
                // Create empty whitelist file with new format
                this.saveWhitelist();
                console.log("📝 Created new whitelist file");
            }
        } catch (error) {
            console.error("❌ Error loading whitelist:", error);
            this.whitelist = new Set();
            // Try to create a new file
            this.saveWhitelist();
        }
    }

    saveWhitelist() {
        try {
            // Check if file exists and try to preserve metadata
            let metadata = {
                version: "1.0",
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
            };

            if (fs.existsSync(this.filePath)) {
                try {
                    const existing = JSON.parse(
                        fs.readFileSync(this.filePath, "utf8")
                    );
                    if (existing && !Array.isArray(existing)) {
                        // Preserve existing metadata
                        metadata.version = existing.version || "1.0";
                        metadata.created =
                            existing.created || new Date().toISOString();
                        metadata.lastModified = new Date().toISOString();
                    }
                } catch (error) {
                    // If we can't read existing metadata, use defaults
                }
            }

            const whitelistData = {
                ...metadata,
                users: [...this.whitelist],
            };

            const data = JSON.stringify(whitelistData, null, 2);
            fs.writeFileSync(this.filePath, data, "utf8");
            console.log("💾 Whitelist saved successfully");
        } catch (error) {
            console.error("❌ Error saving whitelist:", error);
        }
    }

    addUser(userId) {
        const userIdStr = userId.toString();
        if (!this.whitelist.has(userIdStr)) {
            this.whitelist.add(userIdStr);
            this.saveWhitelist();
            return true;
        }
        return false;
    }

    removeUser(userId) {
        const userIdStr = userId.toString();
        if (this.whitelist.has(userIdStr)) {
            this.whitelist.delete(userIdStr);
            this.saveWhitelist();
            return true;
        }
        return false;
    }

    isWhitelisted(userId) {
        const userIdStr = userId.toString();
        const isWhitelisted = this.whitelist.has(userIdStr);

        // Add debug logging if test mode is enabled
        if (global.testMode) {
            console.log(
                `🔍 Whitelist check: User ${userIdStr} - ${
                    isWhitelisted ? "ALLOWED" : "DENIED"
                }`
            );
            console.log(`🔍 Current whitelist:`, [...this.whitelist]);
        }

        return isWhitelisted;
    }

    getWhitelist() {
        return [...this.whitelist];
    }

    getSize() {
        return this.whitelist.size;
    }

    clear() {
        this.whitelist.clear();
        this.saveWhitelist();
    }
}

module.exports = WhitelistManager;
