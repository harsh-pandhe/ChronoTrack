; Custom NSIS hooks for the ChronoTrack agent installer (electron-builder).
;
; Why this exists: the telemetry daemon and its autostart registration
; (HKCU...Run\ChronoTrackDaemon) are created at RUNTIME by main.cjs when the
; app first launches -- not by the installer -- so the stock uninstaller has
; no idea either exists. Without this hook, "Uninstall" only removes the
; Electron GUI shell: the daemon keeps running in the background and keeps
; respawning on every future login, forever, with no way for the user to stop
; it short of manually editing the registry / killing a process by hand. For
; a product whose entire pitch is transparent, consent-based monitoring, an
; uninstall that doesn't actually stop monitoring is a real trust problem.
;
; Also cleans up the pre-rebrand "CivilMantraDaemon" identifiers so upgrading
; an old install and later uninstalling doesn't leave orphaned entries under
; the old name either.

!macro customUnInstall
  ; Stop the daemon if it's currently running (both current and legacy name --
  ; harmless no-op if either isn't running; /F needed since it may be a
  ; --noconsole windowed process with no console to Ctrl+C).
  ExecWait 'taskkill /IM ChronoTrackDaemon.exe /F'
  ExecWait 'taskkill /IM CivilMantraDaemon.exe /F'

  ; Remove the Run-key autostart entries so nothing respawns it on next login.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ChronoTrackDaemon"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CivilMantraDaemon"

  ; Deliberately NOT deleting %APPDATA%\chronotrack (telemetry.db, config,
  ; logs) here -- uninstalling the app isn't the same thing as withdrawing
  ; consent or wanting local history erased, and the employee-facing
  ; "Withdraw Consent" flow already exists in-app for that. Stopping the
  ; running process and its autostart is the part uninstall must guarantee.
!macroend
