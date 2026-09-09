plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

/**
 * Reads mobile/.env at configure time.
 *
 * The Facebook SDK takes its app id from Android string resources, but the Dart side
 * reads mobile/.env — so the two used to be separate copies of one value, and a build
 * where they disagreed failed at the Facebook consent screen with "Invalid app ID"
 * rather than anywhere near the mismatch. Generating the resources from .env below makes
 * that divergence impossible.
 */
fun loadDotEnv(): Map<String, String> {
    val envFile = rootProject.projectDir.parentFile.resolve(".env")
    if (!envFile.exists()) return emptyMap()

    return envFile.readLines()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !it.startsWith("#") && it.contains("=") }
        .associate { line ->
            val separator = line.indexOf('=')
            line.substring(0, separator).trim() to line.substring(separator + 1).trim()
        }
}

/** Non-empty so an unconfigured build still assembles; the SDK only rejects it at login. */
val FACEBOOK_APP_ID_PLACEHOLDER = "000000000000000"

android {
    namespace = "com.caresinfra.mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.caresinfra.mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Facebook Login config, generated from mobile/.env — do not add these three to
        // res/values/strings.xml as well, a duplicate resource name fails the build.
        val dotEnv = loadDotEnv()
        val facebookAppId = dotEnv["FACEBOOK_APP_ID"]
            ?.takeIf { it.isNotBlank() }
            ?: FACEBOOK_APP_ID_PLACEHOLDER

        resValue("string", "facebook_app_id", facebookAppId)
        resValue(
            "string",
            "facebook_client_token",
            dotEnv["FACEBOOK_CLIENT_TOKEN"]?.takeIf { it.isNotBlank() } ?: "",
        )
        // Facebook's Custom Tab returns to this scheme — literally "fb" + the app id.
        resValue("string", "fb_login_protocol_scheme", "fb$facebookAppId")
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}
