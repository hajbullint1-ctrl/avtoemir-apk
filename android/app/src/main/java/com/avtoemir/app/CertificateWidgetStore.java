package com.avtoemir.app;

import android.content.Context;
import android.content.SharedPreferences;

/** Certificate fields shared between the Capacitor web layer and the home-screen widget. */
public final class CertificateWidgetStore {
    public static final String PREFS = "avtoemir_widget";
    public static final String KEY_LOGGED_IN = "logged_in";
    public static final String KEY_NAME = "full_name";
    public static final String KEY_SCHOOL = "school_name";
    public static final String KEY_NUMBER = "certificate_number";
    public static final String KEY_DATE = "certificate_date";
    public static final String KEY_STATUS = "status";

    private CertificateWidgetStore() {}

    public static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
