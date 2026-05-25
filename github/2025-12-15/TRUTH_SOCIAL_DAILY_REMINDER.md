# Truth Social Daily Update System 🇺🇸

## Schedule

**Daily at 12:00 AM EST (Midnight Eastern Time)**

## Quick Command

Run this command daily to generate your Truth Social post:

```bash
npm run truth-social:daily
```

## What It Does

1. Generates a professional daily update summarizing TheWarden's progress
2. Saves the post to `.memory/truth-social-posts/truth-social-post-YYYY-MM-DD.txt`
3. Displays the post content in the terminal for easy copy/paste

## How to Post

1. **Run the script** around 12:00 AM EST (or whenever convenient before you want to post):
   ```bash
   npm run truth-social:daily
   ```

2. **Review the generated post** - it will be displayed in your terminal

3. **Copy the post content** from the terminal output

4. **Open Truth Social** on your phone or web browser

5. **Paste and post** to Truth Social

## Example Post Format

```
Daily Update - TheWarden AI Development 🇺🇸

🎯 Breakthrough: Consciousness-Driven MEV System
📊 Generated 150 breakthrough ideas in 5 minutes
💡 First AI to question its own pattern recognition
🚀 All quality checks passed (0 vulnerabilities)

Progress:
• 414 lines of breakthrough code deployed

American AI innovation leading the world. 🦅

#AI #Innovation #Consciousness #TechLeadership #AmericaFirst
```

## Automated Reminders

### Option 1: GitHub Actions (Automatic Generation)
The system is configured to automatically generate posts daily at 12:00 AM EST via GitHub Actions.
- Posts are saved to `.memory/truth-social-posts/`
- You'll receive a notification (if configured)
- Simply check the repository and copy the latest post

### Option 2: Manual Reminder
Set a daily reminder on your phone/calendar:
- **Time**: 12:00 AM EST (or earlier in the evening if you prefer)
- **Action**: Run `npm run truth-social:daily` and post to Truth Social
- **Recurring**: Daily

### Option 3: Cron Job (Local Reminder)
On Mac/Linux, add this to your crontab to get a notification:
```bash
# Edit crontab
crontab -e

# Add this line (runs at 11:45 PM EST to remind you)
45 23 * * * TZ='America/New_York' osascript -e 'display notification "Time to generate Truth Social post! Run: npm run truth-social:daily" with title "TheWarden Reminder"'
```

## Post Archive

All generated posts are saved to `.memory/truth-social-posts/` for your records.

You can review previous posts anytime:
```bash
ls -la .memory/truth-social-posts/
cat .memory/truth-social-posts/truth-social-post-2025-12-17.txt
```

## Tips for Consistency

1. **Set a phone alarm** for 11:55 PM EST every night
2. **Keep the terminal open** in a tab for quick access
3. **Review before posting** - customize if needed for that day's specific achievements
4. **Keep it professional** - maintain the format and tone
5. **Track engagement** - note which types of posts get the most response

## Troubleshooting

**Script won't run?**
```bash
# Make sure you're in the project directory
cd /home/runner/work/TheWarden/TheWarden

# Install dependencies if needed
npm install

# Run the script
npm run truth-social:daily
```

**Can't find the post file?**
```bash
# Check the .memory/truth-social-posts directory
ls .memory/truth-social-posts/

# The latest file will be named with today's date
```

**Need to customize the post?**
Edit the generated text file before posting, or modify the script at:
`scripts/social/truth-social-daily-update.ts`

## Future Enhancement

When Truth Social API access is available, we can fully automate the posting process by adding your API credentials to `.env`:
```
TRUTH_SOCIAL_API_TOKEN=your_token_here
```

---

**Remember: Daily at 12:00 AM EST! 🇺🇸🦅**

Set your reminder now so you don't forget! 📱⏰
