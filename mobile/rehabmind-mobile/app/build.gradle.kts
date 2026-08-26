plugins {
    id("com.android.application")
}

val debugUrl = providers.gradleProperty("rehabmindDebugUrl")
    .orElse("http://10.0.2.2:3000/")
    .get()
val releaseUrl = providers.gradleProperty("rehabmindReleaseUrl")
    .orElse("https://66.154.101.204/RehabMind/")
    .get()

android {
    namespace = "com.yueshu.rehabmind"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.yueshu.rehabmind"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "REHABMIND_DEBUG_URL", "\"$debugUrl\"")
        buildConfigField("String", "REHABMIND_RELEASE_URL", "\"$releaseUrl\"")
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
