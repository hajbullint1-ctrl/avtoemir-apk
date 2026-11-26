package com.avtoemir.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String LIVE = "https://avtoemir-apk.vercel.app/?apk=13";
    private boolean opened;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CertificateWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        openLive(0);
    }

    private void openLive(int attempt) {
        if (opened) return;
        if (getBridge() == null || getBridge().getWebView() == null) {
            if (attempt < 30) handler.postDelayed(() -> openLive(attempt + 1), 200);
            return;
        }
        opened = true;
        WebView wv = getBridge().getWebView();
        WebSettings settings = wv.getSettings();
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptEnabled(true);
        wv.clearCache(true);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(wv, true);
        wv.loadUrl(LIVE);
    }
}
