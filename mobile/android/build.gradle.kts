allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Some plugins from pub (geolocator_android, permission_handler_android) still declare
// Java 8, which javac warns about as obsolete on every build. Force every Android library
// subproject to compile at 17 like :app does.
//
// This has to go through the `android` extension rather than `tasks.withType<JavaCompile>`:
// a task-level override registered here runs before the subproject applies AGP, and AGP
// then resets source/target from its own `compileOptions`. Setting the extension is what
// AGP reads when it creates the compile task, so it wins regardless of evaluation order.
subprojects {
    plugins.withId("com.android.library") {
        extensions.configure<com.android.build.gradle.LibraryExtension> {
            compileOptions {
                sourceCompatibility = JavaVersion.VERSION_17
                targetCompatibility = JavaVersion.VERSION_17
            }
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
