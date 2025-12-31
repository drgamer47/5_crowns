# Git Commands for Pushing to GitHub

## Initial Setup (One-time)

If you haven't set your git identity yet, run these commands:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Daily Workflow - Pushing Changes

### 1. Check what files have changed:
```powershell
cd "D:\Projects\5 Crowns"
git status
```

### 2. Stage all changes:
```powershell
git add .
```

Or stage specific files:
```powershell
git add src/components/Scoresheet.tsx
```

### 3. Commit your changes:
```powershell
git commit -m "Description of your changes"
```

Examples:
```powershell
git commit -m "Fix mobile viewport scrolling issue"
git commit -m "Add 7 player limit to scoresheet"
git commit -m "Update meld finder algorithm"
```

### 4. Push to GitHub:
```powershell
git push origin main
```

If it's your first push and the remote has existing commits:
```powershell
git pull origin main --allow-unrelated-histories
git push origin main
```

## Complete Workflow Example

```powershell
# Navigate to project
cd "D:\Projects\5 Crowns"

# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Your commit message here"

# Push to GitHub
git push origin main
```

## Troubleshooting

### If push is rejected (remote has changes you don't have):
```powershell
git pull origin main
# Resolve any conflicts if needed
git push origin main
```

### If you need to force push (use with caution):
```powershell
git push origin main --force
```

### Check remote repository:
```powershell
git remote -v
```

Should show:
```
origin  https://github.com/drgamer47/5_crowns.git (fetch)
origin  https://github.com/drgamer47/5_crowns.git (push)
```

## Authentication

If you're asked for credentials when pushing:
- **Username**: Your GitHub username (drgamer47)
- **Password**: Use a Personal Access Token (not your GitHub password)
  - Create one at: https://github.com/settings/tokens
  - Select "repo" scope for full repository access

