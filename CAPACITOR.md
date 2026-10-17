# AvtoEmir — нативное приложение (Capacitor)

Приложение **не копирует данные**. Оно открывает тот же сайт:

`https://avtoemir-apk.vercel.app`

Все данные (студенты, пароли, админка, чат, теория, Supabase) — как на сайте.

## Что уже в репозитории

- `capacitor.config.ts` — `appId: com.avtoemir.app`
- папка `android/` — проект Android Studio
- плагины: App, StatusBar, SplashScreen, Keyboard

## Сборка APK / AAB (на вашем ПК)

### Требования

1. [Android Studio](https://developer.android.com/studio) (SDK 34+)
2. Node.js 20+
3. Клонировать репозиторий

### Команды

```bash
pnpm install
npx cap sync android
npx cap open android
```

В Android Studio:

1. Дождаться Gradle Sync
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)** — для установки на телефон  
   или **Generate Signed Bundle / APK → Android App Bundle** — для **Google Play**

### Google Play

1. Аккаунт [Google Play Console](https://play.google.com/console) ($25)
2. Создать приложение → загрузить **AAB**
3. Заполнить описание, скриншоты, политику конфиденциальности

### App Store (iOS)

```bash
pnpm add -D @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

Нужны: Mac, Xcode, Apple Developer ($99/год).

## Важно

- После изменений **только на сайте** (Vercel) — пересобирать APK **не нужно**: приложение подтянет новый фронт само.
- Пересборка APK нужна при смене `appId`, иконок, splash, нативных плагинов.
- Файл `public/.well-known/assetlinks.json` должен содержать fingerprint подписи релизного keystore (для TWA/ссылок).

## Админка

`/admin` — тот же пароль, те же данные в Supabase. Работает и в браузере, и внутри приложения.


## Виджет сертификата (Android)

Нативный виджет рабочего стола читает `SharedPreferences` (`avtoemir_widget`).
Веб-часть пишет туда ФИО, номер (`AE-……`), дату и статус при входе и при изменении профиля.

Виджет — часть Android-проекта, поэтому после `git pull` нужна пересборка APK:

```bash
pnpm install
npx cap sync android
npx cap open android
```

В Android Studio: **Build → Build APK(s)**, установить APK заново.
Затем на рабочем столе: долгое нажатие → **Виджеты** → **AvtoEmir** → **Сертификат**.
Откройте приложение и войдите — карточка обновится.
