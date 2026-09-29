import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:mobile/core/config/social_auth_config.dart';
import 'package:mobile/features/auth/presentation/widgets/social_auth_buttons.dart';

/// Raised when a provider sign-in cannot proceed. [cancelled] separates "the user backed
/// out", which the UI should pass over in silence, from a real failure worth surfacing.
class SocialAuthException implements Exception {
  const SocialAuthException(this.message, {this.cancelled = false});

  const SocialAuthException.cancelled()
    : message = 'Sign-in cancelled',
      cancelled = true;

  final String message;
  final bool cancelled;

  @override
  String toString() => message;
}

/// A provider token, ready to post to `POST /v1/auth/donor/oauth`.
class SocialAuthToken {
  const SocialAuthToken({required this.provider, required this.token});

  final SocialAuthProvider provider;

  /// Google hands back an ID token, Facebook an access token. The server tells them
  /// apart by [provider] and verifies each with its own provider.
  final String token;

  /// The `AuthProvider` enum name the API expects.
  String get apiProvider => switch (provider) {
    SocialAuthProvider.google => 'GOOGLE',
    SocialAuthProvider.facebook => 'FACEBOOK',
  };
}

/// Runs the native Google / Facebook consent flow.
///
/// Deliberately stops at the token: nothing here inspects the profile, because a profile
/// read on the device proves nothing. The server re-verifies the token with the provider
/// and derives the identity itself.
class SocialAuthClient {
  SocialAuthClient({GoogleSignIn? googleSignIn, FacebookAuth? facebookAuth})
    : _googleSignIn =
          googleSignIn ??
          GoogleSignIn(
            scopes: const ['email', 'profile'],
            // Without this Android returns no ID token at all — only an access token
            // the server has no way to verify.
            serverClientId: SocialAuthConfig.googleServerClientId.isEmpty
                ? null
                : SocialAuthConfig.googleServerClientId,
          ),
      _facebookAuth = facebookAuth ?? FacebookAuth.instance;

  final GoogleSignIn _googleSignIn;
  final FacebookAuth _facebookAuth;

  Future<SocialAuthToken> signIn(SocialAuthProvider provider) {
    return switch (provider) {
      SocialAuthProvider.google => _signInWithGoogle(),
      SocialAuthProvider.facebook => _signInWithFacebook(),
    };
  }

  /// Clears the cached provider session so the next tap shows the account chooser
  /// again. Failures are ignored: this is cleanup, never the point of the operation.
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {
      // Nothing to disconnect.
    }
    try {
      await _facebookAuth.logOut();
    } catch (_) {
      // Nothing to disconnect.
    }
  }

  Future<SocialAuthToken> _signInWithGoogle() async {
    if (!SocialAuthConfig.isGoogleConfigured) {
      throw const SocialAuthException(
        'Google sign-in is not set up yet. Add GOOGLE_SERVER_CLIENT_ID to mobile/.env.',
      );
    }

    GoogleSignInAccount? account;
    try {
      // A stale cached session can hand back a token this build cannot use, so the
      // chooser is always shown.
      await _googleSignIn.signOut();
      account = await _googleSignIn.signIn();
    } catch (error) {
      throw SocialAuthException('Google sign-in failed. $error');
    }

    if (account == null) {
      throw const SocialAuthException.cancelled();
    }

    final authentication = await account.authentication;
    final idToken = authentication.idToken;

    if (idToken == null || idToken.isEmpty) {
      throw const SocialAuthException(
        'Google did not return an ID token. Check that GOOGLE_SERVER_CLIENT_ID is the '
        'web client id from the same project as this app\'s Android client.',
      );
    }

    return SocialAuthToken(provider: SocialAuthProvider.google, token: idToken);
  }

  Future<SocialAuthToken> _signInWithFacebook() async {
    if (!SocialAuthConfig.isFacebookConfigured) {
      throw const SocialAuthException(
        'Facebook sign-in is not set up yet. Add FACEBOOK_APP_ID to mobile/.env and the '
        'matching ids to android/app/src/main/res/values/strings.xml.',
      );
    }

    LoginResult result;
    try {
      result = await _facebookAuth.login(
        permissions: const ['email', 'public_profile'],
      );
    } catch (error) {
      throw SocialAuthException('Facebook sign-in failed. $error');
    }

    switch (result.status) {
      case LoginStatus.success:
        final token = result.accessToken?.tokenString;
        if (token == null || token.isEmpty) {
          throw const SocialAuthException(
            'Facebook did not return an access token',
          );
        }
        return SocialAuthToken(
          provider: SocialAuthProvider.facebook,
          token: token,
        );
      case LoginStatus.cancelled:
        throw const SocialAuthException.cancelled();
      case LoginStatus.failed:
      case LoginStatus.operationInProgress:
        throw SocialAuthException(
          result.message ?? 'Facebook sign-in did not complete',
        );
    }
  }
}
