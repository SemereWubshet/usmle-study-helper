import sys
import shutil
import subprocess

def send_desktop_notification(title: str, message: str) -> bool:
    """
    Delivers a native, non-intrusive desktop notification on Windows and Linux (Ubuntu)
    without requiring third-party libraries or external dependencies.
    Fails safely and silently if notifications are disabled or unsupported.
    """
    try:
        if sys.platform == "win32":
            clean_title = title.replace("'", "''").replace('"', '`"')
            clean_msg = message.replace("'", "''").replace('"', '`"')

            # Multi-tier Windows notification:
            # 1. Native Windows 10/11 Action Center Toast (WinRT)
            # 2. Fallback to System.Windows.Forms NotifyIcon BalloonTip
            ps_script = f"""
            try {{
                $xml = @"
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>{clean_title}</text>
            <text>{clean_msg}</text>
        </binding>
    </visual>
</toast>
"@
                $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
                $doc.LoadXml($xml)
                $toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
                [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('USMLE Study Helper').Show($toast)
            }} catch {{
                try {{
                    [void] [System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms')
                    $icon = New-Object System.Windows.Forms.NotifyIcon
                    $icon.Icon = [System.Drawing.SystemIcons]::Information
                    $icon.BalloonTipTitle = '{clean_title}'
                    $icon.BalloonTipText = '{clean_msg}'
                    $icon.Visible = $True
                    $icon.ShowBalloonTip(10000)
                    Start-Sleep -Seconds 2
                    $icon.Dispose()
                }} catch {{}}
            }}
            """.strip()

            subprocess.Popen(
                ["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            return True

        elif sys.platform.startswith("linux"):
            if shutil.which("notify-send"):
                subprocess.Popen(
                    ["notify-send", "--app-name=USMLE Study Helper", title, message],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                return True

    except Exception:
        # Failsafe: never crash or hang the engine if notification fails
        pass

    return False

