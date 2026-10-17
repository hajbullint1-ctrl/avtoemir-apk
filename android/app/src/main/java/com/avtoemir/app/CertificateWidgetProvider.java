package com.avtoemir.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class CertificateWidgetProvider extends AppWidgetProvider {
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, CertificateWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = CertificateWidgetStore.prefs(context);
        boolean loggedIn = prefs.getBoolean(CertificateWidgetStore.KEY_LOGGED_IN, false);
        String name = prefs.getString(CertificateWidgetStore.KEY_NAME, "");
        String school = prefs.getString(CertificateWidgetStore.KEY_SCHOOL, "AvtoEmir");
        String number = prefs.getString(CertificateWidgetStore.KEY_NUMBER, "");
        String date = prefs.getString(CertificateWidgetStore.KEY_DATE, "");
        String status = prefs.getString(CertificateWidgetStore.KEY_STATUS, "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_certificate);
        if (!loggedIn || name == null || name.trim().isEmpty()) {
            views.setTextViewText(R.id.widget_school, "AvtoEmir");
            views.setTextViewText(R.id.widget_name, "Войдите в приложение");
            views.setTextViewText(R.id.widget_status, "Сертификат появится после входа");
            views.setTextColor(R.id.widget_status, 0xFF64748B);
            views.setTextViewText(R.id.widget_number, "№ —");
            views.setTextViewText(R.id.widget_date, "—");
        } else {
            views.setTextViewText(R.id.widget_school, school == null || school.isEmpty() ? "AvtoEmir" : school);
            views.setTextViewText(R.id.widget_name, name);
            views.setTextViewText(R.id.widget_status, status == null || status.isEmpty() ? "—" : status);
            views.setTextColor(R.id.widget_status, statusColor(status));
            views.setTextViewText(R.id.widget_number, number == null || number.isEmpty() ? "№ —" : "№ " + number);
            views.setTextViewText(R.id.widget_date, date == null || date.isEmpty() ? "—" : date);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            context,
            widgetId,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);
        manager.updateAppWidget(widgetId, views);
    }

    private static int statusColor(String status) {
        if (status == null) return 0xFF1D4FD8;
        String s = status.toLowerCase();
        if (s.contains("подтвер") || s.contains("готов") || s.contains("approved")) return 0xFF0F9F6E;
        if (s.contains("провер") || s.contains("pending")) return 0xFFB45309;
        if (s.contains("отклон") || s.contains("rejected")) return 0xFFDC2626;
        return 0xFF1D4FD8;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            updateWidget(context, manager, id);
        }
    }
}
