package com.avtoemir.app;

import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CertificateWidget")
public class CertificateWidgetPlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        boolean loggedIn = Boolean.TRUE.equals(call.getBoolean("loggedIn", false));
        SharedPreferences.Editor editor = CertificateWidgetStore.prefs(getContext()).edit();
        editor.putBoolean(CertificateWidgetStore.KEY_LOGGED_IN, loggedIn);
        editor.putString(CertificateWidgetStore.KEY_NAME, call.getString("fullName", ""));
        editor.putString(CertificateWidgetStore.KEY_SCHOOL, call.getString("schoolName", "AvtoEmir"));
        editor.putString(CertificateWidgetStore.KEY_NUMBER, call.getString("certificateNumber", ""));
        editor.putString(CertificateWidgetStore.KEY_DATE, call.getString("date", ""));
        editor.putString(CertificateWidgetStore.KEY_STATUS, call.getString("status", ""));
        editor.apply();
        CertificateWidgetProvider.refresh(getContext());
        call.resolve();
    }
}
