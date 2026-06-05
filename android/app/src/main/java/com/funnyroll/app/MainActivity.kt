package com.funnyroll.app

import android.annotation.SuppressLint
import android.app.UiModeManager
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * Native wrapper around the Funnyroll React SPA.
 *
 * - Loads the live site in a full-screen WebView.
 * - Supports HTML5 fullscreen video (onShowCustomView / onHideCustomView).
 * - Detects Android TV and exposes the platform to the web app via
 *   `window.__IS_ANDROID__` / `window.__IS_ANDROID_TV__` and a tagged User-Agent.
 * - Maps the remote/back button to the SPA's history (it uses pushState routing).
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var rootLayout: FrameLayout

    // HTML5 fullscreen-video state
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private var savedUiVisibility = 0

    private val startUrl = "https://funnyroll.com"

    private fun isTv(): Boolean {
        val ui = getSystemService(Context.UI_MODE_SERVICE) as UiModeManager
        return ui.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        rootLayout = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        setContentView(rootLayout)

        webView = WebView(this)
        webView.layoutParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        webView.setBackgroundColor(Color.BLACK)
        rootLayout.addView(webView)

        val tv = isTv()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false   // allow autoplay (muted hero trailer etc.)
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
            javaScriptCanOpenWindowsAutomatically = true
            allowFileAccess = false
            allowContentAccess = false
            // Tag the UA so the SPA can detect the wrapper synchronously at first render
            userAgentString = "$userAgentString FunnyrollApp/1.0 " + if (tv) "AndroidTV" else "Android"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                injectPlatformFlags(tv)
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectPlatformFlags(tv)
            }
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                val host = uri.host ?: return false
                // Keep our own domain in the WebView; send everything else to the system browser
                return if (host.contains("funnyroll.com")) {
                    false
                } else {
                    runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (customView != null) { onHideCustomView(); return }
                customView = view
                customViewCallback = callback
                savedUiVisibility = window.decorView.systemUiVisibility
                webView.visibility = View.GONE
                rootLayout.addView(
                    customView,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                )
                enterImmersive()
            }

            override fun onHideCustomView() {
                val view = customView ?: return
                rootLayout.removeView(view)
                webView.visibility = View.VISIBLE
                customView = null
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
                window.decorView.systemUiVisibility = savedUiVisibility
            }
        }

        // Optional explicit bridge — callable from JS as AndroidApp.isTV()
        webView.addJavascriptInterface(AndroidBridge(tv), "AndroidApp")

        // Back/remote button → SPA history first, then fullscreen-exit, then default
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    customView != null -> (webView.webChromeClient as? WebChromeClient)?.onHideCustomView()
                    webView.canGoBack() -> webView.goBack()
                    else -> { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
                }
            }
        })

        if (savedInstanceState != null) webView.restoreState(savedInstanceState)
        else webView.loadUrl(startUrl)
    }

    private fun injectPlatformFlags(tv: Boolean) {
        val js = """
            (function () {
              window.__IS_ANDROID__ = true;
              window.__IS_ANDROID_TV__ = $tv;
              window.dispatchEvent(new Event('funnyroll:platform'));
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    @Suppress("DEPRECATION")
    private fun enterImmersive() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() { super.onPause(); webView.onPause() }
    override fun onResume() { super.onResume(); webView.onResume() }
    override fun onDestroy() { webView.destroy(); super.onDestroy() }

    /** Minimal JS-callable bridge. */
    class AndroidBridge(private val tv: Boolean) {
        @JavascriptInterface fun isTV(): Boolean = tv
        @JavascriptInterface fun platform(): String = if (tv) "androidtv" else "android"
    }
}
