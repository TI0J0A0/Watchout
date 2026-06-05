# Keep the JavaScript bridge methods reachable from WebView.
-keepclassmembers class com.funnyroll.app.MainActivity$AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
