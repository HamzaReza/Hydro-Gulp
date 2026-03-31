#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const readline = require("readline");

const appJsonPath = path.join(process.cwd(), "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf8"));

// Accept arguments in either order: <platform> <branch> or <branch> <platform>
const arg1 = process.argv[2];
const arg2 = process.argv[3] || "production";

// Determine which argument is platform and which is branch
let platform, branch;
if (["ios", "android"].includes(arg1)) {
  // Format: <platform> <branch>
  platform = arg1;
  branch = arg2 || "production";
} else if (["preview", "production"].includes(arg1)) {
  // Format: <branch> <platform>
  branch = arg1;
  platform = arg2;
} else {
  console.error(
    "Usage: node scripts/update.js <ios|android> [preview|production]"
  );
  console.error(
    "   or: node scripts/update.js [preview|production] <ios|android>"
  );
  process.exit(1);
}

if (!platform || !["ios", "android"].includes(platform)) {
  console.error("Error: Platform must be 'ios' or 'android'");
  process.exit(1);
}

if (!branch || !["preview", "production"].includes(branch)) {
  console.error("Error: Branch must be 'preview' or 'production'");
  process.exit(1);
}

const version = appJson.expo.version;

if (!version) {
  console.error(`Error: Could not find version for ${platform}`);
  process.exit(1);
}

// Get suggested message from git commit (if available)
let suggestedMessage = "";
try {
  const gitMessage = execSync("git log -1 --pretty=%B", {
    encoding: "utf-8",
  }).trim();
  if (gitMessage && gitMessage.length > 0) {
    suggestedMessage = gitMessage;
  }
} catch (_error) {
  // Ignore if git command fails
}

// If message is provided as 4th argument, use it directly without prompting
if (process.argv[4]) {
  const message = process.argv[4];
  const command = `eas update --branch ${branch} --platform ${platform} --message "${message}" --non-interactive`;

  console.log(`Running: ${command}`);
  console.log(
    `Runtime version will be auto-detected: ${version} (from app.json)`
  );
  execSync(command, { stdio: "inherit", shell: true });
} else {
  // Prompt for update message interactively
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askForMessage = () => {
    const prompt = suggestedMessage
      ? `Provide an update message (default: "${suggestedMessage}"): `
      : "Provide an update message: ";

    rl.question(prompt, (message) => {
      // Use suggested message if user just presses enter
      const finalMessage =
        message.trim() ||
        suggestedMessage ||
        `Update for ${platform} (runtime version: ${version})`;

      rl.close();

      // Build and run the EAS update command
      const command = `eas update --branch ${branch} --platform ${platform} --message "${finalMessage}" --non-interactive`;

      console.log(`Running: ${command}`);
      console.log(
        `Runtime version will be auto-detected: ${version} (from app.json)`
      );

      try {
        execSync(command, { stdio: "inherit", shell: true });
      } catch (_error) {
        process.exit(1);
      }
    });
  };

  askForMessage();
}

