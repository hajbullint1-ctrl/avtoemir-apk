package com.avtoemir.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CertificateWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // APK must always load the live site. A cached WebView kept old JS
        // and the phone never synced with admin.
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            getBridge().getWebView().clearCache(true);
        }
    }
}
