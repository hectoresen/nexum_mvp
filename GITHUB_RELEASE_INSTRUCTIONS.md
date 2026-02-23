# 🚀 GitHub Release Instructions for v0.1.0

## Status: ✅ Tag Created and Pushed

The git tag `v0.1.0` has been created and pushed to the repository.

**Next Step:** Create a public GitHub Release from this tag.

---

## 📋 Step-by-Step Instructions

### 1. Navigate to GitHub Releases

Go to: https://github.com/hectoresen/nexum_mvp/releases

Or click on "Releases" in the right sidebar of the repository.

### 2. Create New Release

Click **"Draft a new release"** button.

### 3. Configure Release

Fill in the following details:

**Tag version:**
```
v0.1.0
```
(Select from existing tags)

**Release title:**
```
Nexum v0.1.0 - MVP/Alpha Release
```

**Description:**
Copy the content from `RELEASE_NOTES_v0.1.0.md` or use this summary:

```markdown
## 🎉 First Public Release

Welcome to Nexum v0.1.0, the first public release of our self-hosted voice and chat communication platform.

### ✨ Features
- Self-hosted voice and text communication server
- Desktop client with modern UI
- User authentication and sessions
- Channel management (text & voice)
- Avatar system
- Server administration panel
- Local server management

### 📦 What's Included
- Windows MSI Installer (6.12 MB)
- Windows NSIS Installer (4.05 MB)
- Server executable (7.2 MB)
- Client executable (10.68 MB)

### ⚠️ Known Limitations
- Voice audio streaming not yet implemented
- Windows-only installers
- No WebSocket encryption (WSS)

### 📖 Documentation
Complete documentation available in the repository `/docs` folder.

**Full release notes:** [RELEASE_NOTES_v0.1.0.md](./RELEASE_NOTES_v0.1.0.md)
```

### 4. Upload Release Assets

Drag and drop the following files as release assets:

#### Required Files:

1. **Nexum_0.1.0_x64_en-US.msi** (6.12 MB)
   - Location: `client/src-tauri/target/release/bundle/msi/`
   - Description: "Windows MSI Installer (Recommended)"

2. **Nexum_0.1.0_x64-setup.exe** (4.05 MB)
   - Location: `client/src-tauri/target/release/bundle/nsis/`
   - Description: "Windows NSIS Installer"

3. **voice-server.exe** (7.2 MB)
   - Location: `server/target/release/`
   - Description: "Server Executable (Standalone)"

#### Optional Files:

4. **voice-client.exe** (10.68 MB)
   - Location: `client/src-tauri/target/release/`
   - Description: "Client Executable (Portable, no installer)"

### 5. Set Release Options

- ✅ **Check** "Set as the latest release"
- ✅ **Check** "Create a discussion for this release" (optional)
- ⚠️ **Check** "This is a pre-release" (Since it's MVP/Alpha)

### 6. Publish

Click **"Publish release"** button.

---

## 📍 File Locations Summary

```
Installers:
├── MSI:  client/src-tauri/target/release/bundle/msi/Nexum_0.1.0_x64_en-US.msi
└── NSIS: client/src-tauri/target/release/bundle/nsis/Nexum_0.1.0_x64-setup.exe

Executables:
├── Server: server/target/release/voice-server.exe
└── Client: client/src-tauri/target/release/voice-client.exe
```

---

## 🔗 After Publishing

Once the release is published, it will be available at:

**Release URL:**
```
https://github.com/hectoresen/nexum_mvp/releases/tag/v0.1.0
```

**Direct Download Links:**
```
https://github.com/hectoresen/nexum_mvp/releases/download/v0.1.0/Nexum_0.1.0_x64_en-US.msi
https://github.com/hectoresen/nexum_mvp/releases/download/v0.1.0/Nexum_0.1.0_x64-setup.exe
https://github.com/hectoresen/nexum_mvp/releases/download/v0.1.0/voice-server.exe
```

---

## 📝 Release Checklist

- [x] Build server executable
- [x] Build client executable and installers
- [x] Create git tag v0.1.0
- [x] Push tag to remote
- [x] Create release notes documentation
- [x] Update changelog
- [x] Commit and push documentation
- [ ] **Create GitHub Release (Manual step)**
- [ ] **Upload release assets (Manual step)**
- [ ] Test download links
- [ ] Announce release

---

## 💡 Tips

### For Release Description

You can enhance the release description with:
- Screenshots of the application
- GIFs demonstrating features
- Installation instructions
- Troubleshooting section

### For Future Releases

Consider using GitHub Actions to automate:
- Building binaries on push to tag
- Creating releases automatically
- Uploading assets
- Generating changelogs

---

**Created:** February 23, 2026  
**Last Updated:** February 23, 2026
