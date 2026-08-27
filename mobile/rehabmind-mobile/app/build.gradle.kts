import java.net.URI

plugins {
    id("com.android.application")
}

fun configuredWebUrl(propertyName: String, defaultValue: String, requireHttps: Boolean): String {
    val value = providers.gradleProperty(propertyName).orElse(defaultValue).get().trim()
    val uri = runCatching { URI(value) }.getOrElse {
        error("$propertyName must be a valid absolute HTTP(S) URL")
    }
    require(uri.host != null && uri.userInfo == null && uri.fragment == null) {
        "$propertyName must contain a host and no user info or fragment"
    }
    val scheme = uri.scheme ?: error("$propertyName must use http or https")
    require(scheme.equals("http", ignoreCase = true) || scheme.equals("https", ignoreCase = true)) {
        "$propertyName must use http or https"
    }
    if (requireHttps) {
        require(scheme.equals("https", ignoreCase = true)) {
            "$propertyName must use https for a release build"
        }
    }
    return value
}

fun buildConfigString(value: String): String =
    "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

val debugUrl = configuredWebUrl("rehabmindDebugUrl", "http://10.0.2.2:3000/", requireHttps = false)
val releaseUrl = configuredWebUrl("rehabmindReleaseUrl", "https://66.154.101.204/RehabMind/", requireHttps = true)

android {
    namespace = "com.yueshu.rehabmind"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.yueshu.rehabmind"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "REHABMIND_DEBUG_URL", buildConfigString(debugUrl))
        buildConfigField("String", "REHABMIND_RELEASE_URL", buildConfigString(releaseUrl))
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        getByName("debug") {
            System.getenv("DEBUG_KEYSTORE_FILE")?.let { keystorePath ->
                storeFile = file(keystorePath)
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = false
        }
    }
}
