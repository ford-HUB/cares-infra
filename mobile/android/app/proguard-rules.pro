# google_mlkit_text_recognition references every script's recognizer options, but
# only Latin is bundled (id_image_pre_validator.dart uses TextRecognitionScript.latin).
# Without these, R8 fails the release build on the missing classes.
-dontwarn com.google.mlkit.vision.text.chinese.**
-dontwarn com.google.mlkit.vision.text.devanagari.**
-dontwarn com.google.mlkit.vision.text.japanese.**
-dontwarn com.google.mlkit.vision.text.korean.**
