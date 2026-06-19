package com.funnyroll.app;

import android.app.UiModeManager;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Capacitor host activity for Funnyroll.
 *
 * On Android TV / Fire TV we tag the WebView User-Agent with "AndroidTV" so the
 * web app (see src/utils/platform.js -> isAndroidTV) turns on D-pad spatial
 * navigation and the 10-foot UI. Capacitor already loaded the URL with the
 * default UA during super.onCreate(), so we reload once after re-tagging. The
 * reload is guarded (UA already contains "AndroidTV") to avoid any loop, and is
 * hidden behind the splash screen on launch.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        tagAndroidTvUserAgent();
    }

    private boolean isTelevision() {
        UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        return ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
    }

    private void tagAndroidTvUserAgent() {
        if (!isTelevision() || getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        if (ua != null && ua.contains("AndroidTV")) return;
        settings.setUserAgentString((ua == null ? "" : ua) + " AndroidTV");
        webView.reload();
    }
}
