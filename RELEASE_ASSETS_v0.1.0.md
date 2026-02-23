# Release Assets - v0.1.0

This file documents all assets included in the v0.1.0 release.

## Release Information

- **Version:** v0.1.0
- **Type:** MVP/Alpha - First Public Release
- **Date:** February 23, 2026
- **Git Tag:** `v0.1.0`
- **Commit:** 9c3e8fa45873e1314239841a33650ea26e09050e

## Build Artifacts

### Client Installers

1. **Windows MSI Installer (Recommended)**
   - Filename: `Nexum_0.1.0_x64_en-US.msi`
   - Size: 6.12 MB
   - SHA256: (Calculate before upload)
   - Path: `client/src-tauri/target/release/bundle/msi/`
   - Built: February 23, 2026 21:25:19

2. **Windows NSIS Installer**
   - Filename: `Nexum_0.1.0_x64-setup.exe`
   - Size: 4.05 MB
   - SHA256: (Calculate before upload)
   - Path: `client/src-tauri/target/release/bundle/nsis/`
   - Built: February 23, 2026 21:25:28

### Executables

3. **Server Executable**
   - Filename: `voice-server.exe`
   - Size: 7.2 MB
   - SHA256: (Calculate before upload)
   - Path: `server/target/release/`
   - Built: February 23, 2026 21:34:06
   - Platform: Windows x64
   - Standalone: Yes (no dependencies beyond Windows runtime)

4. **Client Executable (Portable)**
   - Filename: `voice-client.exe`
   - Size: 10.68 MB
   - SHA256: (Calculate before upload)
   - Path: `client/src-tauri/target/release/`
   - Built: February 23, 2026 21:25:28
   - Platform: Windows x64
   - Standalone: No (requires WebView2 runtime)

## Documentation

5. **Release Notes**
   - Filename: `RELEASE_NOTES_v0.1.0.md`
   - Included in repository
   - Full feature list and known limitations

6. **Changelog**
   - Filename: `docs/changelog.md`
   - Updated with v0.1.0 entry
   - Complete change history

## Installation Methods

### Method 1: MSI Installer (Recommended)
- Double-click `Nexum_0.1.0_x64_en-US.msi`
- Follow installation wizard
- Server binary included automatically
- Desktop shortcut created
- Start menu entry created

### Method 2: NSIS Installer
- Run `Nexum_0.1.0_x64-setup.exe`
- Follow installation wizard
- Server binary included automatically
- Desktop shortcut created
- Start menu entry created

### Method 3: Portable Client
- Download `voice-client.exe`
- Requires WebView2 runtime
- No installation needed
- Server not included (download separately)

### Method 4: Server Only
- Download `voice-server.exe`
- Place in desired directory
- Run from command line or create shortcut
- Configure via `server.toml`

## Technical Details

### Client Build Configuration
- Framework: Tauri 2.0
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS
- Bundle ID: com.nexum.app
- Target: Windows x64
- Compression: LZMA (MSI), ZLIB (NSIS)

### Server Build Configuration
- Language: Rust
- Profile: Release (optimized)
- Target: x86_64-pc-windows-msvc
- Optimization: Level 3
- LTO: Fat
- Codegen units: 1

### Dependencies

**Client (Runtime):**
- WebView2 (Edge Chromium engine)
- Windows 10/11 (64-bit)

**Server (Runtime):**
- No external dependencies
- SQLite embedded
- Windows 10/11 or Linux via Wine

## Checksums

To verify file integrity, calculate SHA256 checksums:

```powershell
# Windows PowerShell
Get-FileHash -Algorithm SHA256 "Nexum_0.1.0_x64_en-US.msi"
Get-FileHash -Algorithm SHA256 "Nexum_0.1.0_x64-setup.exe"
Get-FileHash -Algorithm SHA256 "voice-server.exe"
Get-FileHash -Algorithm SHA256 "voice-client.exe"
```

### Expected Checksums

```
Nexum_0.1.0_x64_en-US.msi:      961E7E2BE11EB2C68ADA1CAD219E938FCED974C96F62E19A13477B274D8D81D7
Nexum_0.1.0_x64-setup.exe:      6FF515E8741CBB422CC9D25EFBC1955979BD1BC0C512B73F070FA1DD0613D17B
voice-server.exe:               130722661DF33D594F6554D3DC7368E87968DDC5702D4DA54B30A81FD28C8DE0
voice-client.exe:               62CCE4930638922FC512136840C57CA018A9F97BC1AB18D845719BBCC9CFE5BE
```

## Download Statistics

Will be tracked on GitHub Releases page:
- https://github.com/hectoresen/nexum_mvp/releases/tag/v0.1.0

## Support

For issues with this release:
- GitHub Issues: https://github.com/hectoresen/nexum_mvp/issues
- Documentation: `/docs` folder in repository
- Release Notes: `RELEASE_NOTES_v0.1.0.md`

## Next Release

**Version 0.2.0** planned features:
- Voice audio implementation (UDP streaming)
- WebSocket encryption (WSS)
- Cross-platform builds (macOS, Linux)
- Web client support

---

**Last Updated:** February 23, 2026  
**Maintained By:** Nexum Team
