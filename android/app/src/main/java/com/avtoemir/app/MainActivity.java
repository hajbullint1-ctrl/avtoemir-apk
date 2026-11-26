package com.avtoemir.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String LIVE = "https://avtoemir-apk.vercel.app/?apk=12";
    private boolean opened;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CertificateWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (opened || getBridge() == null || getBridge().getWebView() == null) return;
        opened = true;
        WebView wv = getBridge().getWebView();
        WebSettings settings = wv.getSettings();
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptEnabled(true);
        wv.clearCache(true);
        wv.clearHistory();
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(wv, true);
        // Always open the live site. Capacitor otherwise keeps a cached or local shell
        // and the phone never syncs with the admin on Vercel.
        wv.post(() -> wv.loadUrl(LIVE));
    }
}
